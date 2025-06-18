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
      const hederaLedgerService = agentContext.dependencyManager.resolve(HederaLedgerService)
      const sdk = hederaLedgerService.getHederaDidSdk(agentContext)

      const resolveDidResult = await sdk.resolveDid(did)

      const updatedContextDidJson = {
        ...resolveDidResult,
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/ed25519-2018/v1'],
      }

      const didDocument = JsonTransformer.fromJSON(updatedContextDidJson, DidDocument)

      return {
        didDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
      }
    } catch (error) {
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
