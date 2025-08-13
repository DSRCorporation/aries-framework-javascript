import { DidDocument, JsonTransformer } from '@credo-ts/core'
import { HederaDidResolver } from '@credo-ts/hedera'
import { HederaLedgerService } from '../../src/ledger/HederaLedgerService'

describe('HederaDidResolver', () => {
  let resolver: HederaDidResolver
  let mockAgentContext: any
  let mockLedgerService: any

  beforeEach(() => {
    const mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
    }

    mockLedgerService = {
      resolveDid: jest.fn(),
    }

    mockAgentContext = {
      config: { logger: mockLogger },
      dependencyManager: {
        resolve: jest.fn().mockReturnValue(mockLedgerService),
      },
    }

    resolver = new HederaDidResolver()
  })

  it('should successfully resolve DID', async () => {
    const did = 'did:hedera:123'
    const fakeDidDocument = { id: did }
    const resolveDidResult = {
      didDocument: { id: did },
      didDocumentMetadata: { meta: 'meta' },
      didResolutionMetadata: { resMeta: 'resMeta' },
    }

    mockLedgerService.resolveDid.mockResolvedValue(resolveDidResult)

    jest.spyOn(JsonTransformer, 'fromJSON').mockReturnValue(fakeDidDocument as unknown as DidDocument)

    const result = await resolver.resolve(mockAgentContext, did, {} as any, {} as any)

    expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith('Try to resolve a did document from ledger')
    expect(mockAgentContext.dependencyManager.resolve).toHaveBeenCalledWith(HederaLedgerService)
    expect(mockLedgerService.resolveDid).toHaveBeenCalledWith(mockAgentContext, did)
    expect(JsonTransformer.fromJSON).toHaveBeenCalledWith(resolveDidResult.didDocument, DidDocument)

    expect(result).toEqual({
      didDocument: fakeDidDocument,
      didDocumentMetadata: resolveDidResult.didDocumentMetadata,
      didResolutionMetadata: resolveDidResult.didResolutionMetadata,
    })
  })

  it('should handle error and return notFound', async () => {
    const did = 'did:hedera:bad'
    const error = new Error('Some error')

    mockLedgerService.resolveDid.mockRejectedValue(error)

    const result = await resolver.resolve(mockAgentContext, did, {} as any, {} as any)

    expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith('Try to resolve a did document from ledger')
    expect(mockAgentContext.config.logger.debug).toHaveBeenCalledWith('Error resolving the did', {
      error,
      did,
    })

    expect(result).toEqual({
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        error: 'notFound',
        message: `Unable to resolve did '${did}': ${error}`,
      },
    })
  })
})
