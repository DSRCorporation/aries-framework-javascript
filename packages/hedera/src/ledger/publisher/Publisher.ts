import { Client, PublicKey } from '@hashgraph/sdk'
import { Publisher as ClientPublisher } from '@hiero-did-sdk/publisher-internal'

export class Publisher extends ClientPublisher {
  constructor(
    client: Client,
    private readonly submitKey?: PublicKey
  ) {
    super(client)
  }

  publicKey(): PublicKey {
    return this.submitKey ?? this.client.operatorPublicKey!
  }
}
