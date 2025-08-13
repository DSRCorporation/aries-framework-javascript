import type { AgentContext, DidDocumentKey } from '@credo-ts/core'
import { DidDocumentRole } from '@credo-ts/core'
import { HederaDidRegistrar } from '@credo-ts/hedera'
import { HederaDidUpdateOptions } from '../../src/ledger/HederaLedgerService'

describe('HederaDidRegistrar', () => {
  let service: HederaDidRegistrar
  let mockAgentContext: any
  let mockDidRepository: any
  let mockLedgerService: any

  beforeEach(() => {
    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    }

    mockDidRepository = {
      save: jest.fn(),
      findCreatedDid: jest.fn(),
      update: jest.fn(),
    }

    mockLedgerService = {
      createDid: jest.fn(),
      resolveDid: jest.fn(),
      updateDid: jest.fn(),
      deactivateDid: jest.fn(),
    }

    mockAgentContext = {
      dependencyManager: {
        resolve: jest.fn().mockImplementation((obj: any) => {
          if (obj.name === 'DidRepository') return mockDidRepository
          if (obj.name === 'HederaLedgerService') return mockLedgerService
        }),
      },
      config: {
        logger: mockLogger,
      },
    }

    service = new HederaDidRegistrar()
  })

  describe('create', () => {
    it('should create DID, save it, and return finished state on success', async () => {
      const did = 'did:hedera:123'
      const didDocument = {
        service: [{ id: 'service1' }, { id: 'service2' }],
      }
      const rootKey = { kmsKeyId: 'key1', didDocumentRelativeKeyId: 'rootKeyId' }

      mockLedgerService.createDid.mockResolvedValue({ did, didDocument, rootKey })

      const result = await service.create(
        mockAgentContext as AgentContext,
        {
          method: 'hedera',
          options: {},
        } as any
      )

      expect(mockDidRepository.save).toHaveBeenCalled()
      const savedRecord = mockDidRepository.save.mock.calls[0][1]
      expect(savedRecord.did).toBe(did)
      expect(savedRecord.role).toBe(DidDocumentRole.Created)
      expect(savedRecord.didDocument).toBeInstanceOf(Object)
      expect(savedRecord.didDocument.service[0]).toBeInstanceOf(Object)

      expect(result.didState.state).toBe('finished')
      expect(result.didState.did).toBe(did)
      expect(result.didState.didDocument).toBeInstanceOf(Object)
    })

    it('should handle error and return failed state', async () => {
      mockLedgerService.createDid.mockRejectedValue(new Error('Create failed'))

      const result = await service.create(
        mockAgentContext as AgentContext,
        {
          method: 'hedera',
          options: {},
        } as any
      )

      expect(mockAgentContext.config.logger.debug).toHaveBeenCalledWith('Error creating DID', expect.any(Object))

      expect(result.didState.state).toBe('failed')
      if (result.didState.state === 'failed')
        expect(result.didState.reason).toBe('Unable to register Did: Create failed')
    })
  })

  describe('update', () => {
    const did = 'did:hedera:123'

    it('should update DID and save record successfully', async () => {
      const didDocument = { id: did }
      const updatedDidDocument = { id: did, updated: true }

      const foundDidRecord = {
        didDocument,
        keys: [{ didDocumentRelativeKeyId: 'key1' }],
      }
      mockLedgerService.resolveDid.mockResolvedValue({
        didDocument,
        didDocumentMetadata: { deactivated: false },
        didResolutionMetadata: {},
      })
      mockDidRepository.findCreatedDid.mockResolvedValue(foundDidRecord)
      mockLedgerService.updateDid.mockResolvedValue({ didDocument: updatedDidDocument })
      mockDidRepository.update.mockResolvedValue(undefined)

      const options: HederaDidUpdateOptions = {
        did,
        didDocumentOperation: 'setDidDocument',
        secret: {
          keys: [
            {
              didDocumentRelativeKeyId: 'key2',
              kmsKeyId: 'some-key',
            },
          ],
        },
        didDocument: {},
      }

      const result = await service.update(mockAgentContext as AgentContext, options)

      expect(mockLedgerService.resolveDid).toHaveBeenCalledWith(mockAgentContext, did)
      expect(mockDidRepository.findCreatedDid).toHaveBeenCalledWith(mockAgentContext, did)

      expect(mockLedgerService.updateDid).toHaveBeenCalledWith(
        mockAgentContext,
        expect.objectContaining({
          secret: { keys: expect.any(Array) },
        })
      )

      expect(mockDidRepository.update).toHaveBeenCalledWith(mockAgentContext, foundDidRecord)

      expect(result.didState.state).toBe('finished')
      expect(result.didState.did).toBe(did)
      expect(result.didState.didDocument).toBeInstanceOf(Object)
    })

    it('should return failed state if DID not found or deactivated', async () => {
      mockLedgerService.resolveDid.mockResolvedValue({ didDocument: null, didDocumentMetadata: { deactivated: true } })
      mockDidRepository.findCreatedDid.mockResolvedValue(null)

      const options = {
        did,
      } as any

      const result = await service.update(mockAgentContext as AgentContext, options)

      expect(result.didState.state).toBe('failed')
      if (result.didState.state === 'failed') expect(result.didState.reason).toBe('Did not found')
    })

    it('should handle error and return failed state', async () => {
      mockLedgerService.resolveDid.mockRejectedValue(new Error('Update failed'))

      const options = {
        did,
        didDocumentOperation: 'setDidDocument',
      } as any

      const result = await service.update(mockAgentContext as AgentContext, options)

      expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith('Error update DID', expect.any(Error))
      expect(result.didState.state).toBe('failed')
      if (result.didState.state === 'failed') expect(result.didState.reason).toBe('Unable update DID: Update failed')
    })
  })

  describe('deactivate', () => {
    const did = 'did:hedera:123'

    it('should deactivate DID and save updated record successfully', async () => {
      const didDocument = { id: did }
      const deactivatedDidDocument = { id: did, deactivated: true }

      const foundDidRecord = {
        didDocument,
        keys: [{ didDocumentRelativeKeyId: 'key1' }],
      }

      mockLedgerService.resolveDid.mockResolvedValue({ didDocument, didDocumentMetadata: {} })
      mockDidRepository.findCreatedDid.mockResolvedValue(foundDidRecord)
      mockLedgerService.deactivateDid.mockResolvedValue({ didDocument: deactivatedDidDocument })
      mockDidRepository.update.mockResolvedValue(undefined)

      const options = {
        did,
      }

      const result = await service.deactivate(mockAgentContext as AgentContext, options)

      expect(mockLedgerService.resolveDid).toHaveBeenCalledWith(mockAgentContext, did)
      expect(mockDidRepository.findCreatedDid).toHaveBeenCalledWith(mockAgentContext, did)
      expect(mockLedgerService.deactivateDid).toHaveBeenCalledWith(
        mockAgentContext,
        expect.objectContaining({
          secret: { keys: foundDidRecord.keys },
        })
      )
      expect(mockDidRepository.update).toHaveBeenCalledWith(mockAgentContext, foundDidRecord)

      expect(result.didState.state).toBe('finished')
      expect(result.didState.did).toBe(did)
      expect(result.didState.didDocument).toBeInstanceOf(Object)
    })

    it('should return failed state if DID not found or deactivated', async () => {
      mockLedgerService.resolveDid.mockResolvedValue({ didDocument: null, didDocumentMetadata: { deactivated: true } })
      mockDidRepository.findCreatedDid.mockResolvedValue(null)

      const options = {
        did,
      }

      const result = await service.deactivate(mockAgentContext as AgentContext, options)

      expect(result.didState.state).toBe('failed')
      if (result.didState.state === 'failed') expect(result.didState.reason).toBe('Did not found')
    })

    it('should handle error and return failed state', async () => {
      mockLedgerService.resolveDid.mockRejectedValue(new Error('Deactivate failed'))

      const options = {
        did,
      }

      const result = await service.deactivate(mockAgentContext as AgentContext, options)

      expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith('Error deactivate DID', expect.any(Error))
      expect(result.didState.state).toBe('failed')
      if (result.didState.state === 'failed')
        expect(result.didState.reason).toBe('Unable deactivating DID: Deactivate failed')
    })
  })

  describe('concatKeys (private method)', () => {
    it('should concatenate keys without duplicates based on relativeKeyId', () => {
      const keys1 = [{ didDocumentRelativeKeyId: 'key1' }, { didDocumentRelativeKeyId: 'key2' }] as DidDocumentKey[]

      const keys2 = [{ didDocumentRelativeKeyId: 'key2' }, { didDocumentRelativeKeyId: 'key3' }] as DidDocumentKey[]

      const result = (service as any).concatKeys(keys1, keys2)

      expect(result).toHaveLength(3)
      expect(result).toEqual(
        expect.arrayContaining([
          { didDocumentRelativeKeyId: 'key1' },
          { didDocumentRelativeKeyId: 'key2' },
          { didDocumentRelativeKeyId: 'key3' },
        ])
      )
    })

    it('should handle undefined arguments and return empty array', () => {
      const result = (service as any).concatKeys(undefined, undefined)
      expect(result).toEqual([])
    })
  })
})
