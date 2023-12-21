import { BigNumberish } from 'ethers'
import fs from 'fs'
import { CredentialDefinitionRegistry as IndyCredentialDefinitionRegistry, LedgerClient } from 'indy2-vdr'
import path from 'path'
import { BaseContract } from './BaseContract'
import { IndyBesuSigner } from '../IndyBesuSigner'
import { injectable } from '@aries-framework/core'

export type CredentialDefinition = {
  id: string
  issuerId: string
  schemaId: string
  credDefType: string
  tag: string
  value: string
}

export type CredentialDefinitionMetadata = { created: BigNumberish }

export type CredentialDefinitionWithMetadata = {
  credDef: CredentialDefinition
  metadata: CredentialDefinitionMetadata
}
@injectable()
export class CredentialDefinitionRegistry extends BaseContract {
  public static readonly config = {
    address: '0x0000000000000000000000000000000000004444',
    spec: JSON.parse(
      fs.readFileSync(path.resolve(__dirname, './abi/CredentialDefinitionRegistryInterface.json'), 'utf8')
    ),
  }

  constructor(client: LedgerClient) {
    super(client)
  }

  public async createCredentialDefinition(credDef: CredentialDefinition, signer: IndyBesuSigner) {
    const transaction = await IndyCredentialDefinitionRegistry.buildCreateCredentialDefinitionTransaction(
      this.client,
      signer.address,
      credDef
    )
    return await this.signAndSubmit(transaction, signer)
  }

  public async resolveCredentialDefinition(id: string): Promise<CredentialDefinitionWithMetadata> {
    const transaction = await IndyCredentialDefinitionRegistry.buildResolveCredentialDefinitionTransaction(
      this.client,
      id
    )
    const response = await this.client.submitTransaction(transaction)
    return IndyCredentialDefinitionRegistry.parseResolveCredentialDefinitionResult(this.client, response)
  }
}
