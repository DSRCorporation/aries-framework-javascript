import fs from 'fs'
import { CredentialDefinitionRegistry as IndyBesuCredentialDefinitionRegistry, LedgerClient } from 'indy2-vdr'
import path from 'path'
import { BaseContract } from './BaseContract'
import { IndyBesuSigner } from '../IndyBesuSigner'
import { JsonTransformer, injectable } from '@aries-framework/core'
import { AnonCredsCredentialDefinition } from '@aries-framework/anoncreds'
import { CredentialDefinition } from '../../types'

@injectable()
export class CredentialDefinitionRegistry extends BaseContract {
  public static readonly config = {
    address: '0x0000000000000000000000000000000000004444',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/CredentialDefinitionRegistry.json'), 'utf8')),
  }

  constructor(client: LedgerClient) {
    super(client)
  }

  public async createCredentialDefinition(id: string, credDef: string, signer: IndyBesuSigner) {
    const transaction = await IndyBesuCredentialDefinitionRegistry.buildCreateCredentialDefinitionTransaction(
      this.client,
      signer.address,
      id,
      credDef,
    )
    return this.signAndSubmit(transaction, signer)
  }

  public async resolveCredentialDefinition(id: string): Promise<string> {
    return IndyBesuCredentialDefinitionRegistry.resolveCredentialDefinition(
      this.client,
      id
    )
  }
}
