import { Signer } from 'ethers'
import { IndyBesuSigner } from '../IndyBesuSigner'
import { LedgerClient, Transaction } from 'indy2-vdr'

export class BaseContract {
  protected client: LedgerClient

  constructor(client: LedgerClient) {
    this.client = client
  }

  public async signAndSubmit(transaction: Transaction, signer: IndyBesuSigner) {
    await signer.signTransaction(transaction)
    const transactionHash = await this.client.submitTransaction(transaction)
    return this.client.getReceipt(transactionHash)
  }
}
