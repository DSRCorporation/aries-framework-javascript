import { AgentContext, AriesFrameworkError, DidResolutionOptions, DidResolutionResult, DidResolver, Key, KeyType, ParsedDid } from '@aries-framework/core'
import { IndyBesuLedgerService } from '../ledger'
import { fromIndyBesuDidDocument } from './DidTypesMapping'
import { throws } from 'assert'

export class IndyBesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['indy', 'sov', 'indy2']

  public async resolve(agentContext: AgentContext, did: string, _: ParsedDid, didResolutionOptions: IndyBesuDidResolutionOptions): Promise<DidResolutionResult> {
    if (!didResolutionOptions.publicKey) throw new AriesFrameworkError('IndyBesuDidResolutionOptions.publicKey is required for resolving DID')

    const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)
    
    const key = Key.fromPublicKey(didResolutionOptions.publicKey, KeyType.K256)
    const signer = ledgerService.createSigner(key, agentContext.wallet)
    const didRegistry = ledgerService.didRegistry.connect(signer)

    try {
      const { document, metadata } = await didRegistry.resolveDid(did)

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

export interface IndyBesuDidResolutionOptions extends DidResolutionOptions {
  publicKey: Buffer
}
