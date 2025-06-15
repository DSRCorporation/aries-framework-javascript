import { Sha256, TypedArrayEncoder } from '@credo-ts/core'
import { type Client, type PrivateKey, Status, TopicMessageSubmitTransaction } from '@hashgraph/sdk'

export interface HcsDidLogEntryChunkMessage {
  o: number
  c: string
  h: string
}

const HEDERA_NETWORKS = ['mainnet', 'testnet', 'previewnet', 'solo'] as const
export type HederaNetwork = (typeof HEDERA_NETWORKS)[number]

const NETWORK = `(${Object.values(HEDERA_NETWORKS).join('|')})`
const TOPIC_ID = '([0-9]{1,}\\.[0-9]{1,}\\.[0-9]{1,})'

const hederaDidHostRegex = new RegExp(`^hedera:${NETWORK}:${TOPIC_ID}$`)

export function isValidHederaHost(host: string): boolean {
  return hederaDidHostRegex.test(host)
}

export interface ParsedHederaHost {
  network: HederaNetwork
  topicId: string
}

export function parseHederaHostIdentifier(host: string): ParsedHederaHost {
  const sections = host.match(hederaDidHostRegex)

  if (!sections) {
    throw new Error('Hedera host string does not match the regex')
  }

  return {
    network: sections[1] as HederaNetwork,
    topicId: sections[2],
  }
}

export function buildHederaHostIdentifier(network: HederaNetwork, topicId: string): string {
  return `hedera:${network}:${topicId}`
}

export async function submitHcsMessage(
  topicId: string,
  message: string,
  signingKey: PrivateKey,
  client: Client
): Promise<void> {
  const submitTransaction = new TopicMessageSubmitTransaction({ topicId, message: JSON.stringify(message) }).freezeWith(
    client
  )
  await submitTransaction.sign(signingKey)

  const receipt = await submitTransaction.execute(client).then((response) => response.getReceipt(client))

  if (receipt.status !== Status.Success) {
    throw new Error(`Failed to submit HCS Topic Message for DID Log Entry: ${receipt.status}`)
  }
}

export function getSHA256(data: Uint8Array | string): string {
  return TypedArrayEncoder.toHex(new Sha256().hash(data))
}
