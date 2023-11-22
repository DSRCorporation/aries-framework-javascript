import { Signer } from 'ethers'

export class BaseContract {
  protected ethersContract: any

  constructor(etherContract: any) {
    this.ethersContract = etherContract
  }

  public connect(signer: Signer): this {
    const instance = this.ethersContract.connect(signer)
    const { constructor } = Object.getPrototypeOf(this)
    return new constructor(instance)
  }

  public decodeError(error: any) {
    if (error.data) {
      const decodedError = this.ethersContract.interface.parseError(error.data)

      if (decodedError) {
        return Error(`Transaction failed: ${decodedError?.name}(${decodedError?.args})`)
      }
    }

    return error
  }
}
