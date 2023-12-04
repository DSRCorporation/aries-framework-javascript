import { AgentContext, DidResolutionResult, DidResolver } from '@aries-framework/core'
import { IndyBesuLedgerService } from '../ledger'
import { fromIndyBesuDidDocument } from './DidTypesMapping'

export class IndyBesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['indy', 'sov', 'indy2']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

    try {
      const { document, metadata } = await ledgerService.didRegistry.resolveDid(did)

      return {
        didDocument: fromIndyBesuDidDocument(document),
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
          error: 'unknownError',
          message: `resolver_error: Unable to resolve did '${did}': ${error}`,
        },
      }
    }
  }
}
