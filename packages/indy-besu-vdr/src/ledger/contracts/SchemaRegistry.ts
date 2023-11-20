import { BigNumberish } from 'ethers'
import { BaseContract } from './BaseContract'

export type Schema = {
  id: string
  issuerId: string
  name: string
  version: string
  attrNames: string[]
}

export type SchemaMetadata = { created: BigNumberish }

export type SchemaWithMetadataStruct = {
  schema: Schema
  metadata: SchemaMetadata
}

export class SchemaRegistry extends BaseContract {
  public static readonly address = '0x0000000000000000000000000000000000005555'
  public static readonly specPath = './artifacts/SchemaRegistryInterface.json'

  constructor(ethersContract: any) {
    super(ethersContract)
  }

  public async createSchema(data: Schema) {
    const tx = await this.ethersContract.createSchema(data)
    return tx.wait()
  }

  public async resolveSchema(id: string): Promise<SchemaWithMetadataStruct> {
    const result = await this.ethersContract.resolveSchema(id)
    return {
      schema: {
        id: result.schema.id,
        issuerId: result.schema.issuerId,
        name: result.schema.name,
        version: result.schema.version,
        attrNames: result.schema.attrNames,
      },
      metadata: {
        created: result.metadata.created,
      },
    }
  }
}
