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
} from '@credo-ts/core'
import { HederaLedgerService } from '../ledger/HederaLedgerService'

export class HederaDidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['hedera']

  async create(agentContext: AgentContext, _options: DidCreateOptions): Promise<DidCreateResult> {
    try {
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const hederaLedgerService = agentContext.dependencyManager.resolve(HederaLedgerService)
      const sdk = hederaLedgerService.getHederaDidSdk(agentContext)

      const { did, didDocument } = await sdk.createDid({})

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
      agentContext.config.logger.error(`Error registering DID : ${error}`)
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

  update(_agentContext: AgentContext, _options: DidUpdateOptions): Promise<DidUpdateResult> {
    throw new Error('Method not implemented.')
  }

  deactivate(_agentContext: AgentContext, _options: DidDeactivateOptions): Promise<DidDeactivateResult> {
    throw new Error('Method not implemented.')
  }
}
//
// export type SeedString = string
//
// export interface HederaDidCreateOptions extends DidCreateOptions {
//   method: 'hedera'
//   did?: never
//   secret: {
//     network: HederaNetwork
//     seed: string
//   }
// }
