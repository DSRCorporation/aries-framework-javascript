import { AgentContext, DidResolutionResult, DidResolver } from '@aries-framework/core'
import { DidRegistry } from '../ledger'
import { fromIndyBesuDidDocument } from './DidTypesMapping'

export class IndyBesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['indy', 'sov', 'indy2']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const didDicument = await didRegistry.resolveDid(did)

      agentContext.config.logger.trace(`Resolved DID: ${JSON.stringify(fromIndyBesuDidDocument(didDicument))}`)

      return {
        didDocument: fromIndyBesuDidDocument(didDicument),
        didDocumentMetadata: {},
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
