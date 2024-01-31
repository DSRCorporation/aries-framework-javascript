import { AgentContext, DidDocument, DidDocumentService, DidResolutionResult, DidResolver, VerificationMethod } from '@aries-framework/core'
import { DidRegistry } from '../ledger'

export class IndyBesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['ethr']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const result = await didRegistry.resolveDid(did)

      agentContext.config.logger.trace(`Resolved DID: ${JSON.stringify(result)}`)

      console.log(JSON.stringify(result))

      const didDocument = result.didDocument

      didDocument.context = ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/secp256k1recovery-2020/v2']
      didDocument.verificationMethod = didDocument.verificationMethod?.map((method: any) => {
        if (method.type == 'EcdsaSecp256k1VerificationKey2020') {
          method.type = 'EcdsaSecp256k1RecoveryMethod2020'
        }
        return new VerificationMethod(method)
      })

      didDocument.service = didDocument.service?.map((service: any) => {
        return new DidDocumentService(service)
      })

      return {
        didDocument: new DidDocument(didDocument),
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
