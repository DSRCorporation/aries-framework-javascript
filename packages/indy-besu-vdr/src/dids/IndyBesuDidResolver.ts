import { AgentContext, DidDocument, DidDocumentService, DidResolutionResult, DidResolver, VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018, VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020, VERIFICATION_METHOD_TYPE_X25519_KEY_AGREEMENT_KEY_2019, VerificationMethod } from '@aries-framework/core'
import { DidRegistry } from '../ledger'
import { CONTEXT_SECURITY_SUITES_ED25519_2018_V1, VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_RECOVERY_2020 } from './DidUtils'

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
        switch (method.type) {
          case 'EcdsaSecp256k1VerificationKey2020':
            method.type = VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_RECOVERY_2020
            break
          case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018:
            if (didDocument.context.includes(CONTEXT_SECURITY_SUITES_ED25519_2018_V1)) break

            if (Array.isArray(didDocument.context)) {
              didDocument.context.push(CONTEXT_SECURITY_SUITES_ED25519_2018_V1)
            } else {
              didDocument.context = [didDocument.context, CONTEXT_SECURITY_SUITES_ED25519_2018_V1]
            }
        }

        return new VerificationMethod(method)
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
}
