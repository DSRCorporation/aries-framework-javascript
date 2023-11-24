import { AskarWallet } from '@aries-framework/askar'
import { AriesFrameworkError, Key, KeyType, TypedArrayEncoder, Wallet, WalletError } from '@aries-framework/core'
import {
  AbstractSigner,
  assert,
  assertArgument,
  computeAddress,
  getAddress,
  hashMessage,
  Provider,
  resolveAddress,
  resolveProperties,
  Transaction,
  TransactionLike,
  TransactionRequest,
  TypedDataEncoder,
  TypedDataField,
  TypedDataDomain,
  Signature,
  SigningKey,
} from 'ethers'

export class IndyBesuSigner extends AbstractSigner {
  private readonly key!: Key
  private readonly address!: string
  private readonly wallet!: Wallet

  constructor(key: Key, wallet: Wallet, provider: null | Provider) {
    super(provider)
    this.key = key
    this.address = computeAddress(`0x${TypedArrayEncoder.toHex(key.publicKey)}`)
    this.wallet = wallet
  }

  public async getAddress(): Promise<string> {
    return this.address
  }

  public connect(provider: null | Provider): IndyBesuSigner {
    return new IndyBesuSigner(this.key, this.wallet, provider)
  }

  public async signTransaction(tx: TransactionRequest): Promise<string> {
    // Replace any Addressable or ENS name with an address
    const { to, from } = await resolveProperties({
      to: tx.to ? resolveAddress(tx.to, this.provider) : undefined,
      from: tx.from ? resolveAddress(tx.from, this.provider) : undefined,
    })

    if (to != null) {
      tx.to = to
    }
    if (from != null) {
      tx.from = from
    }

    if (tx.from != null) {
      assertArgument(
        getAddress(<string>tx.from) === this.address,
        'transaction from address mismatch',
        'tx.from',
        tx.from
      )
      delete tx.from
    }

    // Build the transaction
    const btx = Transaction.from(<TransactionLike<string>>tx)

    const signature = await this.sign(btx.unsignedHash)
    btx.signature = signature

    return btx.serialized
  }

  public async signMessage(message: string | Uint8Array): Promise<string> {
    const hash = hashMessage(message)
    const signature = await this.sign(hash)

    return signature.compactSerialized
  }

  public async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    // Populate any ENS names
    const populated = await TypedDataEncoder.resolveNames(domain, types, value, async (name: string) => {
      // @TODO: this should use resolveName; addresses don't
      //        need a provider

      assert(this.provider != null, 'cannot resolve ENS names without a provider', 'UNSUPPORTED_OPERATION', {
        operation: 'resolveName',
        info: { name },
      })

      const address = await this.provider?.resolveName(name)
      assert(address != null, 'unconfigured ENS name', 'UNCONFIGURED_NAME', {
        value: name,
      })

      return address
    })

    const hash = TypedDataEncoder.hash(populated.domain, types, populated.value)
    const signature = await this.sign(hash)

    return signature.compactSerialized
  }

  private async sign(data: string): Promise<Signature> {
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
