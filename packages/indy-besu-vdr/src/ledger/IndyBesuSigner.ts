import { Key, TypedArrayEncoder, Wallet } from '@aries-framework/core'
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

    return await this.sign(hash)
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

    return await this.sign(hash)
  }

  private async sign(data: string): Promise<string> {
    const dataBuffer = TypedArrayEncoder.fromHex(data.substring(2))

    const signature = await this.wallet.sign({ data: dataBuffer, key: this.key })

    return `0x${TypedArrayEncoder.toHex(signature)}`
  }
}
