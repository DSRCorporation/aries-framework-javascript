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
import { buildDid, failedResult, getEcdsaSecp256k1RecoveryMethod2020, validateSpecCompliantPayload } from './DidUtils'

export class IndyBesuDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['ethr']

  public async create(agentContext: AgentContext, options: IndyBesuDidCreateOptions): Promise<DidCreateResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    let didDocument: DidDocument

    if (options.didDocument) {
      const error = validateSpecCompliantPayload(options.didDocument)
      if (error) return failedResult(error)

      didDocument = options.didDocument
    } else {
      const didKey = await agentContext.wallet.createKey({
        keyType: KeyType.K256,
        privateKey: options.secret.didPrivateKey,
      })
      const did = buildDid(options.method, options.options.accountKey.publicKey)

      const verificationMethod = getEcdsaSecp256k1RecoveryMethod2020({
        key: options.options.accountKey,
        id: `${did}#controller`,
        controller: did,
      })

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

    const signer = new IndyBesuSigner(options.options.accountKey, agentContext.wallet)

    try {
      

      didDocument.service?.forEach((service) => {
        const serviceAttribute = {
          "serviceEndpoint": service.serviceEndpoint,
          "type": service.type
        }
        didRegistry.setAttribute(didDocument.id, serviceAttribute, BigInt(100000), signer)
      })

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didDocument.id,
          didDocument: didDocument,
          secret: options.secret,
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
    accountKey: Key
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
