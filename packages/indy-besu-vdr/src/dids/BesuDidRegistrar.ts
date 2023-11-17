import {
  KeyType,
  type AgentContext,
  type DidCreateOptions,
  type DidCreateResult,
  type DidDeactivateOptions,
  type DidDeactivateResult,
  DidDocument,
  type DidRegistrar,
  type DidUpdateOptions,
  type DidUpdateResult,
  type Buffer,
} from '@aries-framework/core'
import { LedgerClient } from '../fake-vdr-wrapper/LedgerClient'
import { DidRegistry } from '../fake-vdr-wrapper/DidRegistry'
import { DidDocument as BesuDidDocument, Multibase, VerificationKeyType } from '../fake-vdr-wrapper/DidDoc'
import { DidDocumentBuilder } from '../fake-vdr-wrapper/DidDocBuilder'
import {
  buildDid,
  deriveAddress,
  fromBesuDidDocument,
  toBesuDidDocument,
  toMultibase,
  validateDidDcoument,
} from './BesuDidUtils'

export class BesuDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['indy', 'sov', 'indy2']

  public async create(agentContext: AgentContext, options: BesuDidCreateOptions): Promise<DidCreateResult> {
    const client = agentContext.dependencyManager.resolve(LedgerClient)
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    const privateKey = options.secret?.privateKey

    if (!privateKey) {
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: 'Private key is required',
        },
      }
    }

    const key = await agentContext.wallet.createKey({ keyType: KeyType.K256, privateKey })
    const did = buildDid(options.method, options.options.network, key.publicKey)

    let didDocument: BesuDidDocument

    if (options.didDocument) {
      didDocument = toBesuDidDocument(options.didDocument)

      if (!validateDidDcoument(didDocument)) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Provide a valid didDocument',
          },
        }
      }
    } else {
      didDocument = new DidDocumentBuilder()
        .setId(did)
        .addVerificationMethod(VerificationKeyType.EcdsaSecp256k1VerificationKey2019, did, toMultibase(key.publicKey))
        .build()
    }

    try {
      const accountAddress = deriveAddress(key.publicKey)
      await didRegistry.createDid(client, accountAddress, didDocument)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didDocument.id,
          didDocument: fromBesuDidDocument(didDocument),
          secret: options.secret,
        },
      }
    } catch (error) {
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `unknownError: ${error.message}`,
        },
      }
    }
  }

  public async update(agentContext: AgentContext, options: BesuDidUpdateOptions): Promise<DidUpdateResult> {
    const client = agentContext.dependencyManager.resolve(LedgerClient)
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const { document: resolvedDocument, metadata: resolvedMetadata } = await didRegistry.resolveDid(
        client,
        options.did
      )

      if (!resolvedDocument || resolvedMetadata.deactivated) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Did not found',
          },
        }
      }

      let didDocument: BesuDidDocument

      switch (options.didDocumentOperation) {
        case 'addToDidDocument':
          didDocument = this.addToDidDocument(resolvedDocument, options.didDocument)
          break
        case 'removeFromDidDocument':
          didDocument = this.removeFromDidDocument(resolvedDocument, options.didDocument)
        default:
          const providedDocument = options.didDocument as DidDocument

          if (providedDocument) {
            didDocument = toBesuDidDocument(providedDocument)
          } else {
            return {
              didDocumentMetadata: {},
              didRegistrationMetadata: {},
              didState: {
                state: 'failed',
                reason: 'Provide a valid didDocument',
              },
            }
          }
      }

      if (!validateDidDcoument(didDocument)) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'The resulting DID document is not valid',
          },
        }
      }

      const accountAddress = deriveAddress(options.secret.publicKey)
      await didRegistry.updateDid(client, accountAddress, didDocument)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didDocument.id,
          didDocument: fromBesuDidDocument(didDocument),
          secret: options.secret,
        },
      }
    } catch (error) {
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `unknownError: ${error.message}`,
        },
      }
    }
  }

  public async deactivate(agentContext: AgentContext, options: BesuDidDeactivateOptions): Promise<DidDeactivateResult> {
    const client = agentContext.dependencyManager.resolve(LedgerClient)
    const didRegistry = agentContext.dependencyManager.resolve(DidRegistry)

    try {
      const { document: resolvedDocument, metadata: resolvedMetadata } = await didRegistry.resolveDid(
        client,
        options.did
      )

      if (!resolvedDocument || resolvedMetadata.deactivated) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Did not found',
          },
        }
      }

      const accountAddress = deriveAddress(options.secret.publicKey)
      await didRegistry.deactivateDid(client, accountAddress, options.did)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: options.did,
          didDocument: fromBesuDidDocument(resolvedDocument),
          secret: options.secret,
        },
      }
    } catch (error) {
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `unknownError: ${error.message}`,
        },
      }
    }
  }

  private addToDidDocument(
    didDocument: BesuDidDocument,
    addedDocument: DidDocument | Partial<DidDocument>
  ): BesuDidDocument {
    throw new Error('Method not implemented.')
  }

  private removeFromDidDocument(
    didDocument: BesuDidDocument,
    addedDocument: DidDocument | Partial<DidDocument>
  ): BesuDidDocument {
    throw new Error('Method not implemented.')
  }
}

export interface BesuDidCreateOptions extends DidCreateOptions {
  method: 'indy2'
  did: never
  options: {
    network: string
  }
  secret: {
    privateKey: Buffer
  }
}

export interface BesuDidUpdateOptions extends DidUpdateOptions {
  options: {
    network: string
  }
  secret: {
    publicKey: Buffer
  }
}

export interface BesuDidDeactivateOptions extends DidDeactivateOptions {
  options: {
    network: string
  }
  secret: {
    publicKey: Buffer
  }
}
