import { BaseContract } from './BaseContract'
import fs from 'fs'
import path from 'path'
import { SchemaRegistry as IndySchemaRegistry, LedgerClient } from 'indy2-vdr'
import { injectable } from '@aries-framework/core'
import { IndyBesuSigner } from '../IndyBesuSigner'

@injectable()
export class SchemaRegistry extends BaseContract {
  public static readonly config = {
    address: '0x0000000000000000000000000000000000005555',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/SchemaRegistry.json'), 'utf8')),
  }

  constructor(client: LedgerClient) {
    super(client)
  }

  public async createSchema(id: string, schema: string, signer: IndyBesuSigner) {
    const transaction = await IndySchemaRegistry.buildCreateSchemaTransaction(this.client, signer.address, id, schema)
    return this.signAndSubmit(transaction, signer)
  }

  public async resolveSchema(id: string): Promise<string> {
    return IndySchemaRegistry.resolveSchema(this.client, id)
  }
}
