import { AgentContext, DidDocument, DidDocumentService, DidResolutionResult, DidResolver, VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018, VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020, VERIFICATION_METHOD_TYPE_X25519_KEY_AGREEMENT_KEY_2019, VerificationMethod } from '@aries-framework/core'
import { DidRegistry } from '../ledger'
import { CONTEXT_SECURITY_SUITES_ED25519_2018_V1, VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_RECOVERY_2020, VerificationKeyType, getKeyContext } from './DidUtils'

export class IndyBesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['ethr']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const result = await didRegistry.resolveDid(did)

      agentContext.config.logger.trace(`Resolved DID: ${JSON.stringify(result)}`)

      console.log(JSON.stringify(result))

      const didDocument = new DidDocument(result.didDocument)
      didDocument.context = result.didDocument['@context']

      didDocument.verificationMethod = didDocument.verificationMethod?.map((method: any) => {
        return new VerificationMethod(method)
      })

      didDocument.verificationMethod?.forEach((method: any) => {
        this.updateContext(didDocument, method)
      }) 

      didDocument.service = didDocument.service?.map((service: any) => {
        return new DidDocumentService(service)
      })

      return {
        didDocument: didDocument,
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

  private updateContext(didDocument: DidDocument, method: VerificationMethod) {
    const keyContext = getKeyContext(VerificationKeyType[method.type as keyof typeof VerificationKeyType])

    if (!didDocument.context.includes(keyContext)) {
      if (Array.isArray(didDocument.context)) {
        console.log("Push called")
        didDocument.context.push(CONTEXT_SECURITY_SUITES_ED25519_2018_V1)
      } else {
        didDocument.context = [didDocument.context, CONTEXT_SECURITY_SUITES_ED25519_2018_V1]
      }
    }
  } 
}
