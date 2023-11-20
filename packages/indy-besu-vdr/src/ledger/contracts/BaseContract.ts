import { Signer } from 'ethers'

export class BaseContract {
  protected ethersContract: any

  constructor(etherContract: any) {
    this.ethersContract = etherContract
  }

  public connect(signer: Signer): this {
    const instance = this.ethersContract.connect(signer)
    return this.constructor(instance)
  }
}
