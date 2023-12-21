import { AskarWallet } from '@aries-framework/askar'
import { AriesFrameworkError, Key, TypedArrayEncoder, Wallet, WalletError } from '@aries-framework/core'
import { BytesLike, computeAddress, concat, getBytes, Signature, SigningKey } from 'ethers'
import { Transaction } from 'indy2-vdr'

export class IndyBesuSigner {
  public readonly key!: Key
  public readonly address!: string
  private readonly wallet!: Wallet

  constructor(key: Key, wallet: Wallet) {
    this.key = key
    this.address = computeAddress(`0x${TypedArrayEncoder.toHex(key.publicKey)}`)
    this.wallet = wallet
  }

  public async signTransaction(transaction: Transaction) {
    const bytesToSign = transaction.getSigningBytes()

    const signature = await this.sign(bytesToSign)

    transaction.setSignature({
      recovery_id: signature.yParity,
      signature: getBytes(concat([signature.r, signature.s])),
    })
  }

  private async sign(data: BytesLike): Promise<Signature> {
    if (!(this.wallet instanceof AskarWallet)) {
      throw new AriesFrameworkError('Incorrect wallete type: Indy-Besu VDR currently only support the Askar wallet')
    }

    const keyEntry = await this.wallet.session.fetchKey({ name: this.key.publicKeyBase58 })

    if (!keyEntry) {
      throw new WalletError('Key entry not found')
    }

    /**
     * For unforeseen reasons, we are unable to recovery the key from signatures that Askar makes. These are required for Ethereum transactions.
     * Because if this, for our demo, we have decided to sign with k256 using the ethers library.
     */
    const key = new SigningKey(keyEntry.key.secretBytes)
    const signature = key.sign(data)

    keyEntry.key.handle.free()

    return signature
  }
}
