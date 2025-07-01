import {Client, PublicKey, Transaction, TransactionReceipt} from '@hashgraph/sdk'
import { Publisher as ClientPublisher } from '@hiero-did-sdk/publisher-internal'
import {AgentContext, Kms, TypedArrayEncoder} from "@credo-ts/core";
import {KeyManagementApi} from "@credo-ts/core/src/modules/kms";
import {KeysUtility} from "@hiero-did-sdk/core";

export class KmsPublisher extends ClientPublisher {
  private readonly kms: KeyManagementApi

  private keyId!: string
  private submitPublicKey!: PublicKey

  constructor(
      agentContext: AgentContext,
      client: Client
  ) {
    super(client)
    this.kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)
  }

  async setKeyId(keyId: string) {
    this.keyId = keyId

    const publicJwk = await this.kms.getPublicKey({ keyId })

    if (!publicJwk) {
      throw new Error(`Key with key id '${keyId}' not found`)
    }
    if (!publicJwk) {
      throw new Error(`Key with key id '${keyId}' not found`)
    }
    if (publicJwk.kty !== 'OKP' || publicJwk.crv !== 'Ed25519') {
      throw new Error(
          `Key with key id '${keyId}' uses unsupported ${Kms.getJwkHumanDescription(publicJwk)} for did:hedera`
      )
    }
    this.submitPublicKey = KeysUtility.fromBytes(Uint8Array.from(TypedArrayEncoder.fromBase64(publicJwk.x))).toPublicKey()
  }

  publicKey(): PublicKey {
    return this.submitPublicKey
  }

  async publish(transaction: Transaction): Promise<TransactionReceipt> {
    if (!this.submitPublicKey) {
      throw new Error(`Need to setup the KeyId`)
    }

    const frozenTransaction = transaction.freezeWith(this.client)

    await frozenTransaction.signWith(this.submitPublicKey, async (message) => {
      const signatureResult = await this.kms.sign({keyId: this.keyId, data: message, algorithm: "EdDSA"})
      return signatureResult.signature
    })

    const response = await transaction.execute(this.client);

    const receipt = await response.getReceipt(this.client);
    return receipt;
  }
}
