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
  Key,
} from '@aries-framework/core'
import { KeyType } from '@aries-framework/core'
import { DidRegistry, IndyBesuSigner } from '../ledger'
import { buildDid, failedResult, getVerificationMaterial, getVerificationPurpose, IndyBesuEndpoint, VerificationKey, getVerificationMaterialPropertyName, buildDidDocument, VerificationKeyType } from './DidUtils'

export class IndyBesuDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['ethr']

  public async create(agentContext: AgentContext, options: IndyBesuDidCreateOptions): Promise<DidCreateResult> {
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    const didKey = await agentContext.wallet.createKey({
      keyType: KeyType.K256,
      privateKey: options.secret?.didPrivateKey,
    })

    const did = buildDid(options.method, didKey.publicKey)

    const signer = new IndyBesuSigner(didKey, agentContext.wallet)

    try {
      if (options?.options?.verificationKeys) {
        for (const verificationKey of options.options.verificationKeys) {
          const materialPropertyName = getVerificationMaterialPropertyName(verificationKey.type)
          const material = getVerificationMaterial(verificationKey.type, verificationKey.key)
          const purpose = getVerificationPurpose(verificationKey.purpose)

          const keyAttribute = {
            [`${materialPropertyName}`]: material,
            purpose,
            type: VerificationKeyType[verificationKey.type]
          }

          await didRegistry.setAttribute(did, keyAttribute, BigInt(100000), signer)
        }
      }

      if (options?.options?.endpoints) {
        for (const endpoint of options.options.endpoints) {
          const serviceAttribute = {
            serviceEndpoint: endpoint.endpoint,
            type: endpoint.type
          }
          await didRegistry.setAttribute(did, serviceAttribute, BigInt(100000), signer)
        }
      }

      const didDocument = buildDidDocument(did, didKey, options?.options?.endpoints, options?.options?.verificationKeys)

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

export interface IndyBesuDidCreateOptions extends DidCreateOptions {
  method: 'ethr'
  did?: never
  didDocument?: never
  options?: {
    endpoints?: IndyBesuEndpoint[]
    verificationKeys?: VerificationKey[]
  }
  secret?: {
    didPrivateKey: Buffer
  }
}

export interface IndyBesuDidUpdateOptions extends DidUpdateOptions {
  options: {
    accountKey: Key
  }
}

export interface IndyBesuDidDeactivateOptions extends DidDeactivateOptions {
  options: {
    accountKey: Key
  }
}