import {
  AgentContext,
  Buffer,
  DidCreateOptions,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidDocument,
  DidRegistrar,
  DidUpdateOptions,
  DidUpdateResult,
  DidDocumentService,
  Key,
} from '@aries-framework/core'
import { DidDocumentBuilder, KeyType } from '@aries-framework/core'
import { DidRegistry, IndyBesuSigner } from '../ledger'
import { buildDid, failedResult, getEcdsaSecp256k1RecoveryMethod2020, getVerificationMaterialProperty, getVerificationMethodPurpose, validateSpecCompliantPayload } from './DidUtils'

export class IndyBesuDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['ethr']

  public async create(agentContext: AgentContext, options: IndyBesuDidCreateOptions): Promise<DidCreateResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    let didDocument: DidDocument

    const didKey = await agentContext.wallet.createKey({
      keyType: KeyType.K256,
      privateKey: options.secret.didPrivateKey,
    })

    const did = buildDid(options.method, didKey.publicKey)

    const verificationMethod = getEcdsaSecp256k1RecoveryMethod2020({
      key: didKey,
      id: `${did}#controller`,
      controller: did,
    })

    if (options.didDocument) {
      const error = validateSpecCompliantPayload(options.didDocument)
      if (error) return failedResult(error)

      didDocument = options.didDocument

      if (!didDocument.verificationMethod) {
        didDocument.verificationMethod = []
      }

      if (!didDocument.authentication) {
        didDocument.authentication = []
      }

      if (!didDocument.assertionMethod) {
        didDocument.assertionMethod = []
      }

      didDocument.verificationMethod.push(verificationMethod)
      didDocument.authentication.push(verificationMethod.id)
      didDocument.assertionMethod.push(verificationMethod.id)
    } else {
      const didDocumentBuilder = new DidDocumentBuilder(did)
        .addVerificationMethod(verificationMethod)
        .addAuthentication(verificationMethod.id)
        .addAssertionMethod(verificationMethod.id)

      options.options.endpoints?.forEach((endpoint) => {
        const service = new DidDocumentService({
          id: `${did}#service-1`,
          serviceEndpoint: endpoint.endpoint,
          type: endpoint.type,
        })

        didDocumentBuilder.addService(service)
      })

      didDocument = didDocumentBuilder.build()
      didDocument.context = [
        'https://www.w3.org/ns/did/v1', 
        'https://w3id.org/security/suites/secp256k1recovery-2020/v2'
      ]
    }

    const signer = new IndyBesuSigner(didKey, agentContext.wallet)

    try {
      if (didDocument.verificationMethod) {
        for (const method of didDocument.verificationMethod) {
          if (method === verificationMethod) continue

          const verificationMaterialProperty = getVerificationMaterialProperty(method.type)
          const verificationPurpose= getVerificationMethodPurpose(didDocument, method.id)
          const keyAttribute = {
            [`${verificationMaterialProperty}`]: method[verificationMaterialProperty],
            purpose: verificationPurpose,
            type: method.type
          }

          await didRegistry.setAttribute(didDocument.id, keyAttribute, BigInt(100000), signer)
        }
      }

      if (didDocument.service) {
        for (const service of didDocument.service) {
          const serviceAttribute = {
            serviceEndpoint: service.serviceEndpoint,
            type: service.type
          }
          await didRegistry.setAttribute(didDocument.id, serviceAttribute, BigInt(100000), signer)
        }
      }

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didDocument.id,
          didDocument: didDocument,
          secret: { didKey }
        },
      }
    } catch (error) {
      console.log(error)

      return failedResult(`unknownError: ${error.message}`)
    }
  }

  public async update(agentContext: AgentContext, options: IndyBesuDidUpdateOptions): Promise<DidUpdateResult> {
    return {
      didDocumentMetadata: {},
      didRegistrationMetadata: {},
      didState: {
        state: 'failed',
        reason: `notImplemented: updating did:indy not implemented yet`,
      },
    }

    // const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    // const signer = new IndyBesuSigner(options.options.accountKey, agentContext.wallet)

    // try {
    //   const resolvedDocument = await didRegistry.resolveDid(options.did)

    //   if (!resolvedDocument) return failedResult('DID not found')

    //   let didDocument: DidDocument

    //   switch (options.didDocumentOperation) {
    //     case 'addToDidDocument':
    //       didDocument = this.addToDidDocument(resolvedDocument, options.didDocument)
    //       break
    //     case 'removeFromDidDocument':
    //       didDocument = this.removeFromDidDocument(resolvedDocument, options.didDocument)
    //     default:
    //       const providedDocument = options.didDocument as DidDocument

    //       if (providedDocument) {
    //         didDocument = providedDocument
    //       } else {
    //         return failedResult('Provide a valid didDocument')
    //       }
    //   }

    //   const error = validateSpecCompliantPayload(didDocument)
    //   if (error) return failedResult(error)

    //   await didRegistry.updateDid(toIndyBesuDidDocument(didDocument), signer)

    //   return {
    //     didDocumentMetadata: {},
    //     didRegistrationMetadata: {},
    //     didState: {
    //       state: 'finished',
    //       did: didDocument.id,
    //       didDocument: didDocument,
    //       secret: options.secret,
    //     },
    //   }
    // } catch (error) {
    //   return failedResult(`unknownError: ${error.message}`)
    // }
  }

  public async deactivate(
    agentContext: AgentContext,
    options: IndyBesuDidDeactivateOptions
  ): Promise<DidDeactivateResult> {

    return {
      didDocumentMetadata: {},
      didRegistrationMetadata: {},
      didState: {
        state: 'failed',
        reason: `notImplemented: updating did:indy not implemented yet`,
      },
    }

    // const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    // const signer = new IndyBesuSigner(options.options.accountKey, agentContext.wallet)

    // try {
    //   const resolvedDocument = await didRegistry.resolveDid(options.did)

    //   if (!resolvedDocument) return failedResult('DID not found')

    //   await didRegistry.deactivateDid(options.did, signer)

    //   return {
    //     didDocumentMetadata: {},
    //     didRegistrationMetadata: {},
    //     didState: {
    //       state: 'finished',
    //       did: options.did,
    //       didDocument: fromIndyBesuDidDocument(resolvedDocument),
    //       secret: options.secret,
    //     },
    //   }
    // } catch (error) {
    //   return failedResult(`unknownError: ${error.message}`)
    // }
  }
}

export interface IndyBesuEndpoint {
  type: string
  endpoint: string
}

export interface IndyBesuDidCreateOptions extends DidCreateOptions {
  method: 'ethr'
  did?: never
  options: {
    network: string
    endpoints?: IndyBesuEndpoint[]
  }
  secret: {
    didPrivateKey?: Buffer
  }
}

export interface IndyBesuDidUpdateOptions extends DidUpdateOptions {
  options: {
    network: string
    accountKey: Key
  }
}

export interface IndyBesuDidDeactivateOptions extends DidDeactivateOptions {
  options: {
    network: string
    accountKey: Key
  }
}
