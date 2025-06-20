import {
  type AgentContext,
  DidDocument,
  type DidResolutionOptions,
  type DidResolutionResult,
  type DidResolver,
  JsonTransformer,
  type ParsedDid,
} from '@credo-ts/core'
import { HederaLedgerService } from '../ledger/HederaLedgerService'

export class HederaDidResolver implements DidResolver {
  public readonly supportedMethods = ['hedera']
  public readonly allowsCaching: boolean = true
  public readonly allowsLocalDidRecord?: boolean | undefined = true

  async resolve(
    agentContext: AgentContext,
    did: string,
    _parsed: ParsedDid,
    _didResolutionOptions: DidResolutionOptions
  ): Promise<DidResolutionResult> {

    try {
      agentContext.config.logger.trace('Try to resolve a did document from ledger')
      const ledgerService = agentContext.dependencyManager.resolve(HederaLedgerService)
      const resolveDidResult = await ledgerService.resolveDid(agentContext, did)
      // const updatedContextDidJson = {
      //   ...resolveDidResult.didDocument,
      //   '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/ed25519-2018/v1'],
      // }
      const didDocument = JsonTransformer.fromJSON(resolveDidResult.didDocument, DidDocument)
      return {
        didDocument,
        didDocumentMetadata: resolveDidResult.didDocumentMetadata,
        didResolutionMetadata: resolveDidResult.didResolutionMetadata,
        //     {
        //   contentType: 'application/did+json',
        // },
      }
    } catch (error) {
      agentContext.config.logger.debug('Error resolving the did', {
        error,
        did,
      })
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: `Unable to resolve did '${did}': ${error}`,
        },
      }
    }
  }
}
