import { AgentContext, Kms, TypedArrayEncoder } from '@credo-ts/core'
import {KeyManagementApi, KmsJwkPublicOkp} from '@credo-ts/core/src/modules/kms'
import { Client, PublicKey, Transaction, TransactionReceipt } from '@hashgraph/sdk'
import { KeysUtility } from '@hiero-did-sdk/core'
import { Publisher as ClientPublisher } from '@hiero-did-sdk/publisher-internal'
import { createOrGetKey } from '../utils'

export class KmsPublisher extends ClientPublisher {
  private readonly kms: KeyManagementApi

  private keyId!: string
  private submitPublicKey!: PublicKey

  constructor(agentContext: AgentContext, client: Client, key: { keyId: string; publicJwk: KmsJwkPublicOkp & { crv: 'Ed25519' } }) {
    super(client)

    this.kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    this.keyId = key.keyId
    this.submitPublicKey = KeysUtility.fromBytes(
        Uint8Array.from(TypedArrayEncoder.fromBase64(key.publicJwk.x))
    ).toPublicKey()
  }

  async setKeyId(keyId: string) {
    this.keyId = keyId
    const { publicJwk } = await createOrGetKey(this.kms, keyId)
    this.submitPublicKey = KeysUtility.fromBytes(
      Uint8Array.from(TypedArrayEncoder.fromBase64(publicJwk.x))
    ).toPublicKey()
  }

  publicKey(): PublicKey {
    return this.submitPublicKey
  }

  async publish(transaction: Transaction): Promise<TransactionReceipt> {
    if (!this.submitPublicKey) {
      throw new Error('Need to setup the KeyId')
    }

    const frozenTransaction = transaction.freezeWith(this.client)

    await frozenTransaction.signWith(this.submitPublicKey, async (message) => {
      const signatureResult = await this.kms.sign({ keyId: this.keyId, data: message, algorithm: 'EdDSA' })
      return signatureResult.signature
    })

    const response = await transaction.execute(this.client)

    const receipt: TransactionReceipt = await response.getReceipt(this.client)
    return receipt
  }
}
