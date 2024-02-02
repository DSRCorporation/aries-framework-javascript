import {
  AgentContext,
  DidDocument,
  DidDocumentService,
  DidResolutionResult,
  DidResolver,
  VerificationMethod,
} from '@aries-framework/core'
import { DidRegistry } from '../ledger'
import { VerificationKeyType, getKeyContext } from './DidUtils'

export class IndyBesuDidResolver implements DidResolver {
  public readonly supportedMethods = ['ethr']

  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const result = await didRegistry.resolveDid(did)

      agentContext.config.logger.trace(`Resolved DID: ${JSON.stringify(result)}`)

      const didDocument = new DidDocument(result.didDocument)

      // JSON-LD credential issuance won't work if 'https://w3id.org/security/v3-unstable' context is added
      const context = result.didDocument['@context'].filter(
        (value: any) => value !== 'https://w3id.org/security/v3-unstable'
      )

      didDocument.context = context

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
        didDocument.context.push(keyContext)
      } else {
        didDocument.context = [didDocument.context, keyContext]
      }
    }
  }
}
