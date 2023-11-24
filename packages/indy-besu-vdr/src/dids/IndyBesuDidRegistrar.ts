import {
  AgentContext,
  DidCreateOptions,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidDocument,
  DidRegistrar,
  DidUpdateOptions,
  DidUpdateResult,
  Buffer,
  DidDocumentService,
  Key,
  getEcdsaSecp256k1VerificationKey2019,
} from '@aries-framework/core'
import { DidDocumentBuilder, KeyType } from '@aries-framework/core'
import { DidDocument as IndyBesuDidDocument, IndyBesuLedgerService } from '../ledger'
import { buildDid, failedResult, validateSpecCompliantPayload } from './DidUtils'
import { fromIndyBesuDidDocument, toIndyBesuDidDocument } from './DidTypesMapping'

export class IndyBesuDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['indy', 'sov', 'indy2']

  public async create(agentContext: AgentContext, options: IndyBesuDidCreateOptions): Promise<DidCreateResult> {
    const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

    const key = await agentContext.wallet.createKey({ keyType: KeyType.K256, privateKey: options.secret?.privateKey })
    const did = buildDid(options.method, options.options.network, key.publicKey)

    let didDocument: DidDocument

    if (options.didDocument) {
      const error = validateSpecCompliantPayload(options.didDocument)
      if (error) return failedResult(error)

      didDocument = options.didDocument
    } else {
      const verificationMethod = getEcdsaSecp256k1VerificationKey2019({ key: key, id: `${did}#KEY-1`, controller: did })

      const didDocumentBuilder = new DidDocumentBuilder(did)
        .addContext('https://www.w3.org/ns/did/v1')
        .addVerificationMethod(verificationMethod)
        .addAuthentication(verificationMethod.id)

      options.options.endpoints?.forEach(endpoint => {
        const service = new DidDocumentService({
          id: `${did}#${endpoint.type}`,
          serviceEndpoint: endpoint.endpoint,
          type: endpoint.type
        })

        didDocumentBuilder.addService(service)
      })

      didDocument = didDocumentBuilder.build()
    }

    const signer = ledgerService.createSigner(key, agentContext.wallet)
    const didRegistry = ledgerService.didRegistry.connect(signer)

    try {
      await didRegistry.createDid(toIndyBesuDidDocument(didDocument))

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
    const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

    const key = Key.fromPublicKey(options.secret.publicKey, KeyType.K256)
    const signer = ledgerService.createSigner(key, agentContext.wallet)
    const didRegistry = ledgerService.didRegistry.connect(signer)

    try {
      const { document: resolvedDocument, metadata: resolvedMetadata } = await didRegistry.resolveDid(options.did)

      if (!resolvedDocument) return failedResult('DID not found')
      if (resolvedMetadata.deactivated) return failedResult('DID has been deactivated')

      let didDocument: DidDocument

      switch (options.didDocumentOperation) {
        case 'addToDidDocument':
          didDocument = this.addToDidDocument(resolvedDocument, options.didDocument)
          break
        case 'removeFromDidDocument':
          didDocument = this.removeFromDidDocument(resolvedDocument, options.didDocument)
        default:
          const providedDocument = options.didDocument as DidDocument

          if (providedDocument) {
            didDocument = providedDocument
          } else {
            return failedResult('Provide a valid didDocument')
          }
      }

      const error = validateSpecCompliantPayload(didDocument)
      if (error) return failedResult(error)

      await didRegistry.updateDid(toIndyBesuDidDocument(didDocument))

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
      return failedResult(`unknownError: ${error.message}`)
    }
  }

  public async deactivate(
    agentContext: AgentContext,
    options: IndyBesuDidDeactivateOptions
  ): Promise<DidDeactivateResult> {
    const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

    const key = Key.fromPublicKey(options.secret.publicKey, KeyType.K256)
    const signer = ledgerService.createSigner(key, agentContext.wallet)
    const didRegistry = ledgerService.didRegistry.connect(signer)

    try {
      const { document: resolvedDocument, metadata: resolvedMetadata } = await didRegistry.resolveDid(options.did)

      if (!resolvedDocument) return failedResult('DID not found')
      if (resolvedMetadata.deactivated) return failedResult('DID has been deactivated')

      await didRegistry.deactivateDid(options.did)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: options.did,
          didDocument: fromIndyBesuDidDocument(resolvedDocument),
          secret: options.secret,
        },
      }
    } catch (error) {
      return failedResult(`unknownError: ${error.message}`)
    }
  }

  private addToDidDocument(
    didDocument: IndyBesuDidDocument,
    addedDocument: DidDocument | Partial<DidDocument>
  ): DidDocument {
    throw new Error('Method not implemented.')
  }

  private removeFromDidDocument(
    didDocument: IndyBesuDidDocument,
    addedDocument: DidDocument | Partial<DidDocument>
  ): DidDocument {
    throw new Error('Method not implemented.')
  }
}

export interface IndyBesuEndpoint{
  type: string
  endpoint: string
}

export interface IndyBesuDidCreateOptions extends DidCreateOptions {
  method: 'indy2'
  did?: never
  options: {
    network: string
    endpoints?: IndyBesuEndpoint[]
  }
  secret?: {
    privateKey: Buffer
  }
}

export interface IndyBesuDidUpdateOptions extends DidUpdateOptions {
  options: {
    network: string
  }
  secret: {
    publicKey: Buffer
  }
}

export interface IndyBesuDidDeactivateOptions extends DidDeactivateOptions {
  options: {
    network: string
  }
  secret: {
    publicKey: Buffer
  }
}
