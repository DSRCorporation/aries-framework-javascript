import { DidDocument, injectable } from '@aries-framework/core'
import { BaseContract } from './BaseContract'
import fs from 'fs'
import path from 'path'
import { EthrDidRegistry, LedgerClient } from 'indy2-vdr'
import { IndyBesuSigner } from '../IndyBesuSigner'

@injectable()
export class DidRegistry extends BaseContract {
  public static readonly config = {
    address: '0x0000000000000000000000000000000000018888',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/EthereumExtDidRegistry.json'), 'utf8')),
  }

  constructor(client: LedgerClient) {
    super(client)
  }

  public async addDelegate(id: string, delegateType: string, delegate: string, validity: bigint, signer: IndyBesuSigner) {
    const transaction = await EthrDidRegistry.buildDidAddDelegateTransaction(this.client, signer.address, id, delegateType, delegate, validity)
    return this.signAndSubmit(transaction, signer)
  }

  public async setAttribute(id: string, attribute: any, validity: bigint, signer: IndyBesuSigner) {
    const transaction = await EthrDidRegistry.buildDidSetAttributeTransaction(this.client, signer.address, id, attribute, validity)
    return this.signAndSubmit(transaction, signer)
  }

  public async resolveDid(id: string): Promise<any> {
    return EthrDidRegistry.resolveDid(this.client, id, null)
  }
}
