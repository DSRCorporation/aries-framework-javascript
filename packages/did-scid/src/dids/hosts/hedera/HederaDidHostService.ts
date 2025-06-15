import { Buffer, TypedArrayEncoder } from '@credo-ts/core'
import { Client, PrivateKey, Status, TopicCreateTransaction, TopicInfoQuery } from '@hashgraph/sdk'
import { zstdCompress, zstdDecompress } from '../../../utils/zstd'
import type { DidHostService } from '../../types'
import { HcsMessageResolver } from './HcsMessageResolver'
import {
  type HcsDidLogEntryChunkMessage,
  type HederaNetwork,
  buildHederaHostIdentifier,
  getSHA256,
  parseHederaHostIdentifier,
  submitHcsMessage,
} from './utils'

// 1024 bytes is a max size for HCS transaction (non-chunked) + we're reserving some space for JSON structural characters - 64 bytes
const MAX_CHUNK_CONTENT_SIZE_IN_BYTES = 960

export interface NetworkConfig {
  network: HederaNetwork
  operatorId: string
  operatorKey: string
}

export type HederaDidHostConfig = {
  networks: NetworkConfig[]
}

export class HederaDidHostService implements DidHostService {
  private readonly _config: HederaDidHostConfig

  public constructor(config: HederaDidHostConfig) {
    this._config = config
  }

  public isHostSupported(host: string): boolean {
    return host.startsWith('hedera')
  }

  public async resolveVerificationMetadata(scid: string, host: string): Promise<unknown[]> {
    const { network, topicId } = parseHederaHostIdentifier(host)

    const networkConfig = this.getNetworkConfig(network)

    return this.withClient(networkConfig, async (client) => {
      const { topicMemo } = await new TopicInfoQuery({ topicId }).execute(client)

      if (topicMemo !== scid) {
        throw new Error(`DID SCID Topic ${topicId} is invalid - memo must be equal to SCID value`)
      }

      const chunkMessages = await this.resolveHcsTopicMessages(topicId, client)

      return buildEntriesFromChunks(chunkMessages)
    })
  }

  public async registerVerificationMetadata(
    scid: string,
    location: HederaNetwork,
    updateKeyBytes: Uint8Array,
    entries: any[]
  ): Promise<string> {
    const networkConfig = this.getNetworkConfig(location)

    return this.withClient(networkConfig, async (client) => {
      const updateKey = PrivateKey.fromBytesED25519(updateKeyBytes)

      const createTopicTransaction = new TopicCreateTransaction({ submitKey: updateKey, topicMemo: scid }).freezeWith(
        client
      )
      const createTopicReceipt = await createTopicTransaction
        .execute(client)
        .then((response) => response.getReceipt(client))

      const topicId = createTopicReceipt.topicId?.toString()

      if (createTopicReceipt.status !== Status.Success || !topicId) {
        throw new Error(`Failed to create HCS Topic for DID SCID: ${createTopicReceipt.status}`)
      }

      const chunkMessages = entries.flatMap((entry) => getChunksForEntry(entry))

      for (const message of chunkMessages) {
        await submitHcsMessage(topicId, JSON.stringify(message), updateKey, client)
      }

      return buildHederaHostIdentifier(location, topicId)
    })
  }

  public async addVerificationMetadataEntry(
    scid: string,
    host: string,
    updateKeyBytes: Uint8Array,
    entry: any
  ): Promise<void> {
    const { network, topicId } = parseHederaHostIdentifier(host)

    const networkConfig = this.getNetworkConfig(network)

    return this.withClient(networkConfig, async (client) => {
      const { topicMemo } = await new TopicInfoQuery({ topicId }).execute(client)

      if (topicMemo !== scid) {
        throw new Error(`DID SCID Topic ${topicId} is invalid - memo must be equal to SCID value`)
      }

      const chunkMessages = getChunksForEntry(entry)
      const updateKey = PrivateKey.fromBytesED25519(updateKeyBytes)

      for (const message of chunkMessages) {
        await submitHcsMessage(topicId, JSON.stringify(message), updateKey, client)
      }
    })
  }

  private resolveHcsTopicMessages(topicId: string, client: Client): Promise<any[]> {
    return new HcsMessageResolver(client).resolveMessages(topicId)
  }

  private async withClient<T>(networkConfig: NetworkConfig, operation: (client: Client) => Promise<T>): Promise<T> {
    const client = Client.forName(networkConfig.network, { scheduleNetworkUpdate: false })
    client.setOperator(networkConfig.operatorId, networkConfig.operatorKey)
    return operation(client).finally(() => client.close())
  }

  private getNetworkConfig(network: HederaNetwork): NetworkConfig {
    const networkConfig = this._config.networks.find((config) => config.network === network)

    if (!networkConfig) {
      throw new Error(`Cannot find Hedera network config: ${network}`)
    }

    return networkConfig
  }
}

function buildEntriesFromChunks(chunkMessages: HcsDidLogEntryChunkMessage[]): any[] {
  const groupedChunks = chunkMessages.reduce<Record<string, any[]>>((result, message) => {
    const { h: entryHash, ...chunkContent } = message
    if (!result[entryHash]) {
      result[entryHash] = [chunkContent]
    } else {
      result[entryHash].push(chunkContent)
    }

    return result
  }, {})

  const entries: any[] = []

  for (const [entryHash, chunks] of Object.entries(groupedChunks)) {
    let entryContent = ''

    for (const chunk of chunks.sort((a, b) => a.o - b.o)) {
      entryContent += chunk.c
    }

    const compressedPayload = Buffer.from(entryContent, 'base64')
    const entryPayload = Buffer.from(zstdDecompress(compressedPayload))

    const payloadHash = getSHA256(entryPayload)
    if (payloadHash !== entryHash) {
      console.error(`Got invalid hash for DID Log entry: ${payloadHash} != ${entryHash}, skipping...`)
    }

    entries.push(JSON.parse(entryPayload.toString()))
  }

  return entries
}

function getChunksForEntry(entry: any): HcsDidLogEntryChunkMessage[] {
  const entryPayload = Buffer.from(JSON.stringify(entry))
  const entryHash = getSHA256(entryPayload)

  const compressedPayload = zstdCompress(entryPayload)
  const messagePayload = new TextEncoder().encode(TypedArrayEncoder.toBase64(compressedPayload))

  const result: HcsDidLogEntryChunkMessage[] = []

  for (let rangeIndex = 0; rangeIndex <= compressedPayload.length; rangeIndex += MAX_CHUNK_CONTENT_SIZE_IN_BYTES) {
    const chunkContent = messagePayload.slice(rangeIndex, rangeIndex + MAX_CHUNK_CONTENT_SIZE_IN_BYTES)
    result.push({ o: rangeIndex++, c: new TextDecoder().decode(chunkContent), h: entryHash })
  }

  return result
}
