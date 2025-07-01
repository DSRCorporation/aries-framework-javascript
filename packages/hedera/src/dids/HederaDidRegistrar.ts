import {
  AgentContext,
  DidCreateResult,
  DidDeactivateResult,
  DidDocument,
  DidDocumentRole,
  DidDocumentService,
  DidRecord,
  DidRegistrar,
  DidRepository,
  DidUpdateResult,
} from '@credo-ts/core'
import {
  HederaDidCreateOptions,
  HederaDidDeactivateOptions,
  HederaDidUpdateOptions,
  HederaLedgerService,
} from '../ledger/HederaLedgerService'

export class HederaDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['hedera']

  async create(agentContext: AgentContext, options: HederaDidCreateOptions): Promise<DidCreateResult> {
    try {
      agentContext.config.logger.trace('Try to create the did document to ledger')

      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const ledgerService = agentContext.dependencyManager.resolve(HederaLedgerService)

      // Create did
      const { did, didDocument, keys } = await ledgerService.createDid(agentContext, options)

      // Save the did to wallet
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
          keys,
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

  async update(_agentContext: AgentContext, _options: HederaDidUpdateOptions): Promise<DidUpdateResult> {
    throw new Error('sss')
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
    //   // Update did
    //   const { didDocument: updatedDidDocument } = await ledgerService.updateDid(agentContext, options)
    //
    //   // Save the did to wallet
    //   const hederaSignKey =
    //     options.secret.key.hederaPrivateKey instanceof PrivateKey
    //       ? options.secret.key.hederaPrivateKey
    //       : PrivateKey.fromStringED25519(options.secret.key.hederaPrivateKey)
    //   const keys = didRecord.keys ?? []
    //   keys.push({
    //     kmsKeyId: options.secret.key.kmsKeyId,
    //     didDocumentRelativeKeyId: KeysUtility.fromPublicKey(hederaSignKey.publicKey).toMultibase(),
    //   } satisfies DidDocumentKey)
    //   didRecord.didDocument = JsonTransformer.fromJSON(updatedDidDocument, DidDocument)
    //   didRecord.keys = keys
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

  async deactivate(_agentContext: AgentContext, _options: HederaDidDeactivateOptions): Promise<DidDeactivateResult> {
    throw new Error('sss')
    // const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    // const ledgerService = agentContext.dependencyManager.resolve(HederaLedgerService)
    //
    // const did = options.did
    //
    // try {
    //   const { didDocument, didDocumentMetadata } = await ledgerService.resolveDid(agentContext, did)
    //
    //   const didRecord = await didRepository.findCreatedDid(agentContext, did)
    //
    //   if (!didDocument || didDocumentMetadata.deactivated || !didRecord) {
    //     return {
    //       didDocumentMetadata,
    //       didRegistrationMetadata: {},
    //       didState: {
    //         state: 'failed',
    //         reason: 'Did not found',
    //       },
    //     }
    //   }
    //   // Deactivate did
    //   const { didDocument: deactivatedDidDocument } = await ledgerService.deactivateDid(agentContext, options)
    //
    //   // Save the did to wallet
    //   const hederaSignKey =
    //     options.secret.key.hederaPrivateKey instanceof PrivateKey
    //       ? options.secret.key.hederaPrivateKey
    //       : PrivateKey.fromStringED25519(options.secret.key.hederaPrivateKey)
    //   const keys = didRecord.keys ?? []
    //   keys.push({
    //     kmsKeyId: options.secret.key.kmsKeyId,
    //     didDocumentRelativeKeyId: KeysUtility.fromPublicKey(hederaSignKey.publicKey).toMultibase(),
    //   } satisfies DidDocumentKey)
    //   didRecord.didDocument = JsonTransformer.fromJSON(deactivatedDidDocument, DidDocument)
    //   didRecord.keys = keys
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
    //   agentContext.config.logger.error('Error deactivating DID', error)
    //   return {
    //     didDocumentMetadata: {},
    //     didRegistrationMetadata: {},
    //     didState: {
    //       state: 'failed',
    //       reason: `Unable deactivating DID: ${error.message}`,
    //     },
    //   }
    // }
  }
}
