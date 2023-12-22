import { BaseContract } from './BaseContract'
import fs from 'fs'
import path from 'path'
import { SchemaRegistry as IndySchemaRegistry, LedgerClient } from 'indy2-vdr'
import { injectable } from '@aries-framework/core'
import { IndyBesuSigner } from '../IndyBesuSigner'
import { Schema } from '../types/Schema'

@injectable()
export class SchemaRegistry extends BaseContract {
  public static readonly config = {
    address: '0x0000000000000000000000000000000000005555',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/SchemaRegistry.json'), 'utf8')),
  }

  constructor(client: LedgerClient) {
    super(client)
  }

  public async createSchema(schema: Schema, signer: IndyBesuSigner) {
    const transaction = await IndySchemaRegistry.buildCreateSchemaTransaction(this.client, signer.address, schema)
    return await this.signAndSubmit(transaction, signer)
  }

  public async resolveSchema(id: string): Promise<Schema> {
    const transaction = await IndySchemaRegistry.buildResolveSchemaTransaction(this.client, id)
    const response = await this.client.submitTransaction(transaction)
    return IndySchemaRegistry.parseResolveSchemaResult(this.client, response)
  }
}
