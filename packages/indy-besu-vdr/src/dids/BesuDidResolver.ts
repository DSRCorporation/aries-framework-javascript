import { AgentContext, DidResolutionResult, DidResolver } from '@aries-framework/core'
import { ParsedDID, DIDResolutionOptions } from 'did-resolver'
import { DidRegistry } from '../fake-vdr-wrapper/DidRegistry'
import { LedgerClient } from '../fake-vdr-wrapper/LedgerClient'
import { fromBesuDidDocument } from './BesuDidUtils'

export class BesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['indy', 'sov', 'indy2']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const client = agentContext.dependencyManager.resolve(LedgerClient)
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const { document, metadata } = await didRegistry.resolveDid(client, did)

      return {
        didDocument: fromBesuDidDocument(document),
        didDocumentMetadata: {
          created: metadata.created.toString(),
          updated: metadata.updated.toString(),
          deactivated: metadata.deactivated,
        },
        didResolutionMetadata: {},
      }
    } catch (error) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: `resolver_error: Unable to resolve did '${did}': ${error}`,
        },
      }
    }
  }
}
