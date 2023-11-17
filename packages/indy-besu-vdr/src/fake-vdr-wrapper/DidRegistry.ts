// Indy-Besu VDR DidRegistry

import { DidDocument, DidDocumentWithMetadata } from './DidDoc'
import { LedgerClient } from './LedgerClient'

export class DidRegistry {
  public buildCreateDidTransaction(client: LedgerClient, address: string, didDoc: DidDocument): Transaction {
    throw new Error('Method not implemented.')
  }

  public buildUpdateDidTransaction(client: LedgerClient, address: string, didDoc: DidDocument): Transaction {
    throw new Error('Method not implemented.')
  }

  public buildDeactivateDidTransaction(client: LedgerClient, from: string, did: string): Transaction {
    throw new Error('Method not implemented.')
  }

  public async createDid(client: LedgerClient, from: string, didDoc: DidDocument): Promise<string> {
    throw new Error('Method not implemented.')
  }

  public async updateDid(client: LedgerClient, from: string, didDoc: DidDocument): Promise<string> {
    throw new Error('Method not implemented.')
  }

  public async deactivateDid(client: LedgerClient, from: string, did: string): Promise<string> {
    throw new Error('Method not implemented.')
  }

  public async resolveDid(client: LedgerClient, did: string): Promise<DidDocumentWithMetadata> {
    throw new Error('Method not implemented.')
  }
}
