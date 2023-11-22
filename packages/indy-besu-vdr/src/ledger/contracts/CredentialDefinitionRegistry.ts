import { BigNumberish } from 'ethers'
import { BaseContract } from './BaseContract'
import path from 'path'

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

export class CredentialDefinitionRegistry extends BaseContract {
  public static readonly address = '0x0000000000000000000000000000000000004444'
  public static readonly specPath = path.resolve(__dirname, './abi/CredentialDefinitionRegistryInterface.json')

  constructor(instance: any) {
    super(instance)
  }

  public async createCredentialDefinition(credDef: CredentialDefinition) {
    try {
      const tx = await this.ethersContract.createCredentialDefinition(credDef)
      return tx.wait()
    } catch (error) {
      throw this.decodeError(error)
    }
  }

  public async resolveCredentialDefinition(id: string): Promise<CredentialDefinitionWithMetadata> {
    try {
      const result = await this.ethersContract.resolveCredentialDefinition(id)
      return {
        credDef: {
          id: result.credDef.id,
          issuerId: result.credDef.issuerId,
          schemaId: result.credDef.schemaId,
          credDefType: result.credDef.credDefType,
          tag: result.credDef.tag,
          value: result.credDef.value,
        },
        metadata: {
          created: result.metadata.created,
        },
      }
    } catch (error) {
      throw this.decodeError(error)
    }
  }
}
