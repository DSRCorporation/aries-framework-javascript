import { Buffer } from '@credo-ts/core'
import { HcsDidEventMessageResolver, type MessageEnvelope } from '@hashgraph/did-sdk-js'
import { type Client, Timestamp, TopicId } from '@hashgraph/sdk'
import fetch from 'cross-fetch'
import type { HederaNetwork } from './utils'

const REST_API_NETWORK_MAP: Record<HederaNetwork, string> = {
  mainnet: 'https://mainnet.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
  solo: 'http://localhost:5600',
}

export class HcsMessageResolver {
  constructor(private readonly _client: Client) {}

  public resolveMessages(topicId: string): Promise<any> {
    const isMirrorQuerySupported = !!this._client._mirrorNetwork.getNextMirrorNode()
    return isMirrorQuerySupported ? this.resolveMessagesWithClient(topicId) : this.resolveMessagesWithRestApi(topicId)
  }

  private resolveMessagesWithClient(topicId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const onComplete = (envelopes: MessageEnvelope<any>[]) => resolve(envelopes.map((it) => JSON.parse(it.open())))
      const messageResolver = new HcsDidEventMessageResolver(TopicId.fromString(topicId)).whenFinished((result) =>
        onComplete(result)
      )
      messageResolver.execute(this._client)
    })
  }

  private async resolveMessagesWithRestApi(topicId: string): Promise<any[]> {
    let messages: any[] = []

    const fromTimestamp = Timestamp.fromDate(new Date(0))
    const toTimestamp = Timestamp.fromDate(new Date())

    let nextPath = `/api/v1/topics/${topicId}/messages?timestamp=gte:${fromTimestamp.toString()}&timestamp=lte:${toTimestamp.toString()}`

    while (nextPath) {
      const url = this.getNextUrl(this._client.ledgerId?.toString() as unknown as HederaNetwork, nextPath)
      const result = await this.fetchMessages(url)

      messages = messages.concat(result.messages.map((message: any) => JSON.parse(message)))
      nextPath = result.nextPath!
    }

    return messages
  }

  private async fetchMessages(url: string): Promise<any> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch topic messages: ${response.statusText}`)
    }

    const data = await response.json()
    const messages = data.messages
    const links = data.links

    const parsedMessages = messages.map(({ message }: { message: any }) => {
      return Buffer.from(message, 'base64').toString()
    })

    return {
      messages: parsedMessages,
      nextPath: links.next,
    }
  }

  private getNextUrl(network: HederaNetwork, nextPath: string, limit = 25, encoding = 'base64') {
    let apiUrl = REST_API_NETWORK_MAP[network]

    if (!apiUrl) {
      throw new Error(`Trying to fetch messages from unsupported network: ${network}.`)
    }

    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }

    return `${apiUrl}${nextPath}&limit=${limit.toString()}&encoding=${encoding}`
  }
}
