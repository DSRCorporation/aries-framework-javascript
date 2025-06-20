import {
  AgentContext,
  DidCreateOptions,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidDocument,
  DidDocumentRole,
  DidDocumentService,
  DidRecord,
  DidRegistrar,
  DidRepository,
  DidUpdateOptions,
  DidUpdateResult,
  JsonTransformer,
} from '@credo-ts/core'
import { HederaLedgerService } from '../ledger/HederaLedgerService'

import { PrivateKey } from '@hashgraph/sdk'
import { HederaNetwork } from '@hiero-did-sdk/client'

export interface HederaDidCreateOptions extends DidCreateOptions {
  method: 'hedera'
  did?: string
  didDocument?: DidDocument
  secret?: {
    privateKey?: string | PrivateKey | undefined
  }
  options?: {
    network?: HederaNetwork | string
  }
}

export interface HederaDidUpdateOptions extends DidUpdateOptions {
  did: string
  secret?: {
    privateKey?: string | PrivateKey | undefined
  }
}

export interface HederaDidDeactivateOptions extends DidDeactivateOptions {
  did: string
  secret?: {
    privateKey?: string | PrivateKey | undefined
  }
}

export class HederaDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['hedera']

  async create(agentContext: AgentContext, options: HederaDidCreateOptions): Promise<DidCreateResult> {
    try {
      agentContext.config.logger.trace('Try to create the did document to ledger')

      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const ledgerService = agentContext.dependencyManager.resolve(HederaLedgerService)

      // Create did
      const { did, didDocument } = await ledgerService.createDid(agentContext, options.options?.network)

      // Save the did so we know we created it and can issue with it
      const credoDidDocument = new DidDocument({
        ...didDocument,
        service: didDocument.service?.map((s) => new DidDocumentService(s)),
      })
      await didRepository.save(
        agentContext,
        new DidRecord({
          did,
          role: DidDocumentRole.Created,
          didDocument: credoDidDocument,
        })
      )

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did,
          didDocument: credoDidDocument,
        },
      }
    } catch (error) {
      agentContext.config.logger.debug('Error creating of the did ', {
        error,
      })
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `Unable to register Did: ${error.message}`,
        },
      }
    }
  }

  async update(agentContext: AgentContext, options: HederaDidUpdateOptions): Promise<DidUpdateResult> {
    throw new Error('Method not implemented.')
    // const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    // const ledgerService = agentContext.dependencyManager.resolve(HederaLedgerService)
    //
    // try {
    //   const { did } = options
    //   const { didDocument, didDocumentMetadata } = await ledgerService.resolveDid(agentContext, did)
    //   const didRecord = await didRepository.findCreatedDid(agentContext, did)
    //   if (!didDocument || didDocumentMetadata.deactivated || !didRecord) {
    //     return {
    //       didDocumentMetadata: {},
    //       didRegistrationMetadata: {},
    //       didState: {
    //         state: 'failed',
    //         reason: 'Did not found',
    //       },
    //     }
    //   }
    //
    //   const { didDocument: updatedDidDocument } = await ledgerService.updateDid(agentContext, {
    //     did,
    //     updates: {
    //       operation: ,
    //       // id: options.,
    //       // property: 'verificationMethod',
    //       // publicKeyMultibase: 'z6MkkFf6yboMwr1LQVAHqatuGYD9foRe7L2wPkEn1A7LyoQb',
    //     },
    //     privateKey: options.secret?.privateKey,
    //   })
    //
    //   didRecord.didDocument = JsonTransformer.fromJSON(updatedDidDocument, DidDocument)
    //   await didRepository.update(agentContext, didRecord)
    //
    //   return {
    //     didDocumentMetadata: {},
    //     didRegistrationMetadata: {},
    //     didState: {
    //       state: 'finished',
    //       did,
    //       didDocument: didRecord.didDocument,
    //     },
    //   }
    // } catch (error) {
    //   agentContext.config.logger.error('Error updating DID', error)
    //   return {
    //     didDocumentMetadata: {},
    //     didRegistrationMetadata: {},
    //     didState: {
    //       state: 'failed',
    //       reason: `Unable update DID: ${error.message}`,
    //     },
    //   }
    // }
  }

  async deactivate(agentContext: AgentContext, options: HederaDidDeactivateOptions): Promise<DidDeactivateResult> {
    throw new Error('Method not implemented.')
  //   const didRepository = agentContext.dependencyManager.resolve(DidRepository)
  //   const ledgerService = agentContext.dependencyManager.resolve(HederaLedgerService)
  //
  //   const did = options.did
  //
  //   try {
  //     const { didDocument, didDocumentMetadata } = await ledgerService.resolveDid(agentContext, did)
  //
  //     const didRecord = await didRepository.findCreatedDid(agentContext, did)
  //
  //     if (!didDocument || didDocumentMetadata.deactivated || !didRecord) {
  //       return {
  //         didDocumentMetadata,
  //         didRegistrationMetadata: {},
  //         didState: {
  //           state: 'failed',
  //           reason: 'Did not found',
  //         },
  //       }
  //     }
  //
  //     const { didDocument: deactivatedDidDocument } = await ledgerService.deactivateDid(agentContext, {
  //       did: options.did,
  //       privateKey: options.secret?.privateKey,
  //     })
  //
  //     didRecord.didDocument = JsonTransformer.fromJSON(deactivatedDidDocument, DidDocument)
  //     await didRepository.update(agentContext, didRecord)
  //
  //     return {
  //       didDocumentMetadata: {},
  //       didRegistrationMetadata: {},
  //       didState: {
  //         state: 'finished',
  //         did,
  //         didDocument: didRecord.didDocument,
  //       },
  //     }
  //   } catch (error) {
  //     agentContext.config.logger.error('Error deactivating DID', error)
  //     return {
  //       didDocumentMetadata: {},
  //       didRegistrationMetadata: {},
  //       didState: {
  //         state: 'failed',
  //         reason: `Unable deactivating DID: ${error.message}`,
  //       },
  //     }
  //   }
  }
}
