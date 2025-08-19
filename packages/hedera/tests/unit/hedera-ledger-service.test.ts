import {
  RegisterCredentialDefinitionOptions,
  RegisterRevocationRegistryDefinitionOptions,
  RegisterRevocationStatusListOptions,
  RegisterSchemaOptions,
} from '@credo-ts/anoncreds'
import { type DidDocument, DidRecord, DidRepository } from '@credo-ts/core'
import { AgentContext, DependencyManager } from '@credo-ts/core'
import { DidDocumentKey, Kms } from '@credo-ts/core'
import { KmsJwkPublicOkp } from '@credo-ts/core/src/modules/kms'
import { Client, PrivateKey } from '@hashgraph/sdk'
import {
  HederaDidCreateOptions,
  HederaDidUpdateOptions,
  HederaLedgerService,
} from '../../src/ledger/HederaLedgerService'

jest.mock('@hiero-did-sdk/registrar', () => ({
  DIDUpdateBuilder: jest.fn().mockReturnValue({
    addService: jest.fn().mockReturnThis(),
    removeService: jest.fn().mockReturnThis(),
    addVerificationMethod: jest.fn().mockReturnThis(),
    removeVerificationMethod: jest.fn().mockReturnThis(),
    addAssertionMethod: jest.fn().mockReturnThis(),
    removeAssertionMethod: jest.fn().mockReturnThis(),
    addAuthenticationMethod: jest.fn().mockReturnThis(),
    removeAuthenticationMethod: jest.fn().mockReturnThis(),
    addCapabilityDelegationMethod: jest.fn().mockReturnThis(),
    removeCapabilityDelegationMethod: jest.fn().mockReturnThis(),
    addCapabilityInvocationMethod: jest.fn().mockReturnThis(),
    removeCapabilityInvocationMethod: jest.fn().mockReturnThis(),
    addKeyAgreementMethod: jest.fn().mockReturnThis(),
    removeKeyAgreementMethod: jest.fn().mockReturnThis(),
    build: jest.fn(),
  }),
  generateCreateDIDRequest: jest.fn(),
  submitCreateDIDRequest: jest.fn(),
  generateUpdateDIDRequest: jest.fn(),
  submitUpdateDIDRequest: jest.fn(),
  generateDeactivateDIDRequest: jest.fn(),
  submitDeactivateDIDRequest: jest.fn(),
}))

import {
  DIDUpdateBuilder,
  UpdateDIDResult,
  generateCreateDIDRequest,
  generateDeactivateDIDRequest,
  generateUpdateDIDRequest,
  submitCreateDIDRequest,
  submitDeactivateDIDRequest,
  submitUpdateDIDRequest,
} from '@hiero-did-sdk/registrar'

jest.mock('@hiero-did-sdk/resolver', () => ({
  resolveDID: jest.fn(),
  TopicReaderHederaHcs: jest.fn(),
}))

import { resolveDID } from '@hiero-did-sdk/resolver'

jest.mock('@hiero-did-sdk/core', () => ({
  parseDID: jest.fn(),
}))

import { DID_ROOT_KEY_ID, Publisher, parseDID } from '@hiero-did-sdk/core'

jest.mock('../../src/ledger/utils')

import { AskarKeyManagementService } from '@credo-ts/askar'
import { KeyEntryObject } from '@openwallet-foundation/askar-nodejs'
import { createOrGetKey } from '../../src/ledger/utils'

describe('HederaLedgerService', () => {
  let service: HederaLedgerService
  let mockAgentContext: Partial<AgentContext>
  let mockKms: jest.Mocked<Kms.KeyManagementApi>
  let mockDidRepository: jest.Mocked<DidRepository>
  let mockKeyManagementService: jest.Mocked<AskarKeyManagementService>
  let mockedCreateOrGetKey: jest.MockedFunction<typeof createOrGetKey>
  let mockedParseDID: jest.MockedFunction<typeof parseDID>
  let mockedGenerateDeactivateDIDRequest: jest.MockedFunction<typeof generateDeactivateDIDRequest>
  let builder: DIDUpdateBuilder

  beforeEach(() => {
    jest.clearAllMocks()

    mockedCreateOrGetKey = createOrGetKey as jest.MockedFunction<typeof createOrGetKey>
    mockedParseDID = parseDID as jest.MockedFunction<typeof parseDID>
    mockedGenerateDeactivateDIDRequest = generateDeactivateDIDRequest as jest.MockedFunction<
      typeof generateDeactivateDIDRequest
    >

    builder = new DIDUpdateBuilder()

    mockDidRepository = {
      findCreatedDid: jest.fn().mockReturnValue({
        keys: [
          {
            didDocumentRelativeKeyId: DID_ROOT_KEY_ID,
            kmsKeyId: 'kmsKeyId',
          },
        ],
      } as unknown as DidRecord),
    } as unknown as jest.Mocked<DidRepository>

    mockKeyManagementService = {
      getKeyAsserted: jest
        .fn()
        .mockReturnValue({ key: { secretBytes: PrivateKey.generateED25519().toBytes() } } as unknown as KeyEntryObject),
    } as unknown as jest.Mocked<AskarKeyManagementService>

    mockKms = {
      sign: jest.fn(),
      getKms: jest.fn().mockReturnValue(mockKeyManagementService),
    } as unknown as jest.Mocked<Kms.KeyManagementApi>

    mockAgentContext = {
      dependencyManager: {
        resolve: jest.fn((cls) => {
          if (cls === Kms.KeyManagementApi) {
            return mockKms
          }
          if (cls === DidRepository) {
            return mockDidRepository
          }
          throw new Error(`No instance found for ${cls}`)
        }),
      } as unknown as DependencyManager,
    }

    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
      cleanupExpired: jest.fn(),
    }

    service = new HederaLedgerService({
      options: {
        networks: [
          {
            network: 'testnet',
            operatorId: '1',
            operatorKey: '2',
          },
        ],
        cache: mockCache,
      },
    })

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    jest.spyOn((service as any).clientService, 'withClient').mockImplementation(async (_props, operation) => {
      const mockClient = {} as Client
      // @ts-ignore
      return operation(mockClient)
    })
  })

  describe('resolveDid', () => {
    it('should call resolveDID with proper args and returns result', async () => {
      const did = 'did:hedera:test'

      const mockResolution = { didDocument: { id: did } }
      ;(resolveDID as jest.Mock).mockResolvedValue(mockResolution)

      const result = await service.resolveDid(mockAgentContext as AgentContext, did)

      expect(resolveDID).toHaveBeenCalledWith(
        did,
        'application/ld+json;profile="https://w3id.org/did-resolution"',
        expect.any(Object)
      )
      expect(result).toBe(mockResolution)
    })
  })

  describe('createDid', () => {
    it('should create DID without didDocument', async () => {
      const keyId = 'key123'
      const publicJwk: KmsJwkPublicOkp & { crv: 'Ed25519' } = { crv: 'Ed25519', kty: 'OKP', x: 'abc' }
      const props: HederaDidCreateOptions = {
        method: 'hedera',
        options: { network: 'testnet' },
        secret: { rootKeyId: keyId, keys: [] },
      }

      mockedCreateOrGetKey.mockResolvedValue({ keyId, publicJwk })
      ;(generateCreateDIDRequest as jest.Mock).mockResolvedValue({
        state: {},
        signingRequest: { serializedPayload: new Uint8Array() },
      })
      ;(submitCreateDIDRequest as jest.Mock).mockResolvedValue({ did: 'did:hedera:1234' })

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'getPublisher').mockResolvedValue({} as Publisher)

      mockKms.sign.mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) })

      const result = await service.createDid(mockAgentContext as AgentContext, props)
      expect(createOrGetKey).toHaveBeenCalledWith(mockKms, keyId)
      expect(generateCreateDIDRequest).toHaveBeenCalled()
      expect(submitCreateDIDRequest).toHaveBeenCalled()
      expect(result.did).toBe('did:hedera:1234')
      expect(result.rootKey).toBeDefined()
    })

    it('should create DID with didDocument and calls updateDid', async () => {
      const keyId = 'key123'
      const publicJwk: KmsJwkPublicOkp & { crv: 'Ed25519' } = { crv: 'Ed25519', kty: 'OKP', x: 'abc' }
      const didDocument = { controller: 'did:hedera:controller' }
      const props = {
        method: 'hedera',
        options: { network: 'testnet' },
        secret: { rootKeyId: keyId, keys: [] },
        didDocument,
      }

      mockedCreateOrGetKey.mockResolvedValue({ keyId, publicJwk })
      ;(generateCreateDIDRequest as jest.Mock).mockResolvedValue({
        state: {},
        signingRequest: { serializedPayload: new Uint8Array() },
      })
      ;(submitCreateDIDRequest as jest.Mock).mockResolvedValue({ did: 'did:hedera:1234' })

      const updateDidSpy = jest
        .spyOn(service, 'updateDid')
        .mockResolvedValue({ did: 'did:hedera:1234' } as unknown as UpdateDIDResult)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'getPublisher').mockResolvedValue({} as Publisher)

      mockKms.sign.mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) })

      const result = await service.createDid(
        mockAgentContext as AgentContext,
        props as unknown as HederaDidCreateOptions
      )
      expect(updateDidSpy).toHaveBeenCalled()
      expect(result.rootKey).toBeDefined()
    })
  })

  describe('updateDid', () => {
    const did = 'did:hedera:1234'
    const kmsKeyId = 'key-id'

    it('should throw error if didDocumentOperation is missing', async () => {
      await expect(
        service.updateDid(mockAgentContext as AgentContext, { did } as HederaDidUpdateOptions)
      ).rejects.toThrow('DidDocumentOperation is required')
    })

    it('should throw error if rootKey missing', async () => {
      const keys: DidDocumentKey[] = []
      await expect(
        service.updateDid(mockAgentContext as AgentContext, {
          did,
          didDocumentOperation: 'setDidDocument',
          secret: { keys },
          didDocument: {},
        })
      ).rejects.toThrow('The root key not found in the KMS')
    })

    it('should call correct builder methods for each field and action', () => {
      const spies = {
        addService: jest.spyOn(builder, 'addService'),
        removeService: jest.spyOn(builder, 'removeService'),
        addVerificationMethod: jest.spyOn(builder, 'addVerificationMethod'),
        removeVerificationMethod: jest.spyOn(builder, 'removeVerificationMethod'),
        addAssertionMethod: jest.spyOn(builder, 'addAssertionMethod'),
        removeAssertionMethod: jest.spyOn(builder, 'removeAssertionMethod'),
        addAuthenticationMethod: jest.spyOn(builder, 'addAuthenticationMethod'),
        removeAuthenticationMethod: jest.spyOn(builder, 'removeAuthenticationMethod'),
        addCapabilityDelegationMethod: jest.spyOn(builder, 'addCapabilityDelegationMethod'),
        removeCapabilityDelegationMethod: jest.spyOn(builder, 'removeCapabilityDelegationMethod'),
        addCapabilityInvocationMethod: jest.spyOn(builder, 'addCapabilityInvocationMethod'),
        removeCapabilityInvocationMethod: jest.spyOn(builder, 'removeCapabilityInvocationMethod'),
        addKeyAgreementMethod: jest.spyOn(builder, 'addKeyAgreementMethod'),
        removeKeyAgreementMethod: jest.spyOn(builder, 'removeKeyAgreementMethod'),
      }

      const testCases: [string, 'add' | 'remove', string, jest.SpyInstance][] = [
        ['service', 'add', 'service-item', spies.addService],
        ['service', 'remove', 'service-id', spies.removeService],

        ['verificationMethod', 'add', 'verificationMethod-item', spies.addVerificationMethod],
        ['verificationMethod', 'remove', 'verificationMethod-id', spies.removeVerificationMethod],

        ['assertionMethod', 'add', 'assertionMethod-item', spies.addAssertionMethod],
        ['assertionMethod', 'remove', 'assertionMethod-id', spies.removeAssertionMethod],

        ['authentication', 'add', 'authentication-item', spies.addAuthenticationMethod],
        ['authentication', 'remove', 'authentication-id', spies.removeAuthenticationMethod],

        ['capabilityDelegation', 'add', 'capabilityDelegation-item', spies.addCapabilityDelegationMethod],
        ['capabilityDelegation', 'remove', 'capabilityDelegation-id', spies.removeCapabilityDelegationMethod],

        ['capabilityInvocation', 'add', 'capabilityInvocation-item', spies.addCapabilityInvocationMethod],
        ['capabilityInvocation', 'remove', 'capabilityInvocation-id', spies.removeCapabilityInvocationMethod],

        ['keyAgreement', 'add', 'keyAgreement-item', spies.addKeyAgreementMethod],
        ['keyAgreement', 'remove', 'keyAgreement-id', spies.removeKeyAgreementMethod],
      ]

      for (const [field, action, param, spy] of testCases) {
        jest.clearAllMocks()

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const fn = (service as any).getUpdateMethod(builder, field, action)

        const result = fn(param)

        expect(result).toBe(builder)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(param)
        for (const otherSpy of Object.values(spies)) {
          if (otherSpy !== spy) expect(otherSpy).not.toHaveBeenCalled()
        }
      }
    })

    it('should return builder unchanged for unknown field', () => {
      const unknownField = 'unknownField'
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const fn = (service as any).getUpdateMethod(builder, unknownField, 'add')
      const result = fn('any param')
      expect(result).toBe(builder)
    })

    it('should perform update flow successfully', async () => {
      const keys: DidDocumentKey[] = [
        { kmsKeyId, didDocumentRelativeKeyId: DID_ROOT_KEY_ID },
        { kmsKeyId: 'some-key', didDocumentRelativeKeyId: '#abc' },
      ]

      const didDocument: Partial<DidDocument> = {
        verificationMethod: [
          {
            id: '#abc',
            type: 'hedera',
            controller: 'test',
          },
        ],
      }
      const currentDidDoc = { verificationMethod: [{ id: '#abc' }] }
      const mockDidResolution = { didDocument: currentDidDoc }

      const updatesMock = { build: jest.fn().mockReturnValue(didDocument) }

      mockedParseDID.mockReturnValue({
        network: 'testnet',
        method: 'hedera',
        publicKey: '',
        topicId: '',
      })
      ;(resolveDID as jest.Mock).mockResolvedValue(mockDidResolution)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'prepareDidUpdates').mockReturnValue(updatesMock)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'getPublisher').mockResolvedValue({} as Publisher)
      ;(generateUpdateDIDRequest as jest.Mock).mockResolvedValue({ states: {}, signingRequests: {} })

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'signRequests').mockResolvedValue(Promise.resolve())
      ;(submitUpdateDIDRequest as jest.Mock).mockResolvedValue({ did: did })

      await expect(
        service.updateDid(mockAgentContext as AgentContext, {
          did,
          didDocumentOperation: 'setDidDocument',
          didDocument,
          secret: { keys },
        })
      ).resolves.toHaveProperty('did', did)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      expect((service as any).prepareDidUpdates).toHaveBeenCalled()
      expect(generateUpdateDIDRequest).toHaveBeenCalled()
      expect(submitUpdateDIDRequest).toHaveBeenCalled()
    })
  })

  describe('deactivateDid', () => {
    const did = 'did:hedera:5678'
    const kmsKeyId = 'key-id'

    it('should throw error if rootKey is missing', async () => {
      await expect(
        service.deactivateDid(mockAgentContext as AgentContext, { did, secret: { keys: [] } })
      ).rejects.toThrow('The root key not found in the KMS')
    })

    it('should throw an error if root key is not found in deactivateDid', async () => {
      const props = {
        did: 'did:hedera:123',
        secret: {
          keys: [],
        },
      }

      // @ts-ignore
      mockAgentContext.dependencyManager.resolve.mockReturnValue({ sign: jest.fn() })

      await expect(service.deactivateDid(mockAgentContext as AgentContext, props)).rejects.toThrow(
        'The root key not found in the KMS'
      )
    })

    it('should deactivate DID successfully', async () => {
      const keys: DidDocumentKey[] = [{ kmsKeyId, didDocumentRelativeKeyId: DID_ROOT_KEY_ID }]
      const mockPublisher = {}
      const mockState = {}
      const mockSigningRequest = { serializedPayload: new Uint8Array() }
      const signature = new Uint8Array([1, 2, 3])
      ;(parseDID as jest.Mock).mockReturnValue({ network: 'testnet' })

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'getPublisher').mockResolvedValue(mockPublisher)

      // @ts-ignore
      mockedGenerateDeactivateDIDRequest.mockResolvedValue({ state: mockState, signingRequest: mockSigningRequest })

      mockKms.sign.mockResolvedValue({ signature })
      ;(submitDeactivateDIDRequest as jest.Mock).mockResolvedValue({ did })

      const result = await service.deactivateDid(mockAgentContext as AgentContext, {
        did,
        secret: { keys },
      })

      expect(result).toHaveProperty('did', did)
      expect(mockKms.sign).toHaveBeenCalledWith({
        keyId: kmsKeyId,
        data: mockSigningRequest.serializedPayload,
        algorithm: 'EdDSA',
      })
    })
  })

  describe('anoncreds SDK methods', () => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let mockSdk: any

    beforeEach(() => {
      mockSdk = {
        getSchema: jest.fn().mockResolvedValue('schema'),
        registerSchema: jest.fn().mockResolvedValue('registerSchema'),
        getCredentialDefinition: jest.fn().mockResolvedValue('credDef'),
        registerCredentialDefinition: jest.fn().mockResolvedValue('registerCredDef'),
        getRevocationRegistryDefinition: jest.fn().mockResolvedValue('revRegDef'),
        registerRevocationRegistryDefinition: jest.fn().mockResolvedValue('registerRevRegDef'),
        getRevocationStatusList: jest.fn().mockResolvedValue('revStatusList'),
        registerRevocationStatusList: jest.fn().mockResolvedValue('registerRevStatus'),
      }
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      jest.spyOn(service as any, 'getHederaAnoncredsRegistry').mockReturnValue(mockSdk)
    })

    it('getSchema', async () => {
      const result = await service.getSchema(mockAgentContext as AgentContext, 'schemaId')
      expect(mockSdk.getSchema).toHaveBeenCalledWith('schemaId')
      expect(result).toBe('schema')
    })

    it('registerSchema', async () => {
      const options: RegisterSchemaOptions = {
        schema: {
          issuerId: '',
          name: '',
          version: '',
          attrNames: [],
        },
        options: {},
      }
      const result = await service.registerSchema(mockAgentContext as AgentContext, options)
      expect(mockSdk.registerSchema).toHaveBeenCalledWith({ ...options, issuerKeyDer: expect.anything() })
      expect(result).toBe('registerSchema')
    })

    it('getCredentialDefinition', async () => {
      const result = await service.getCredentialDefinition(mockAgentContext as AgentContext, 'credDefId')
      expect(mockSdk.getCredentialDefinition).toHaveBeenCalledWith('credDefId')
      expect(result).toBe('credDef')
    })

    it('registerCredentialDefinition', async () => {
      const options: RegisterCredentialDefinitionOptions = {
        options: {
          supportRevocation: true,
        },
        credentialDefinition: {
          issuerId: '',
          schemaId: '',
          type: 'CL',
          tag: '',
          value: {
            primary: {},
            revocation: undefined,
          },
        },
      }
      await service.registerCredentialDefinition(mockAgentContext as AgentContext, options)
      expect(mockSdk.registerCredentialDefinition).toHaveBeenCalledWith({
        ...options,
        issuerKeyDer: expect.anything(),
        options: {
          supportRevocation: true,
        },
      })
    })

    it('getRevocationRegistryDefinition', async () => {
      const result = await service.getRevocationRegistryDefinition(mockAgentContext as AgentContext, 'revRegDefId')
      expect(mockSdk.getRevocationRegistryDefinition).toHaveBeenCalledWith('revRegDefId')
      expect(result).toBe('revRegDef')
    })

    it('registerRevocationRegistryDefinition', async () => {
      const options: RegisterRevocationRegistryDefinitionOptions = {
        revocationRegistryDefinition: {
          issuerId: '',
          revocDefType: 'CL_ACCUM',
          credDefId: '',
          tag: '',
          value: {
            publicKeys: {
              accumKey: {
                z: '',
              },
            },
            maxCredNum: 0,
            tailsLocation: '',
            tailsHash: '',
          },
        },
        options: {},
      }
      const result = await service.registerRevocationRegistryDefinition(mockAgentContext as AgentContext, options)
      expect(mockSdk.registerRevocationRegistryDefinition).toHaveBeenCalledWith({
        ...options,
        issuerKeyDer: expect.anything(),
      })
      expect(result).toBe('registerRevRegDef')
    })

    it('getRevocationStatusList', async () => {
      const result = await service.getRevocationStatusList(mockAgentContext as AgentContext, 'revRegId', 12345)
      expect(mockSdk.getRevocationStatusList).toHaveBeenCalledWith('revRegId', 12345)
      expect(result).toBe('revStatusList')
    })

    it('registerRevocationStatusList', async () => {
      const options: RegisterRevocationStatusListOptions = {
        options: {},
        revocationStatusList: {
          revRegDefId: '',
          issuerId: '',
          revocationList: [],
          currentAccumulator: '',
        },
      }
      const result = await service.registerRevocationStatusList(mockAgentContext as AgentContext, options)
      expect(mockSdk.registerRevocationStatusList).toHaveBeenCalledWith(options)
      expect(result).toBe('registerRevStatus')
    })
  })

  describe('getIssuerPrivateKey', () => {
    it('should return PrivateKey from secretBytes when rootKey exists', async () => {
      const secretBytes = PrivateKey.generate().toBytes()
      const didRecord = {
        keys: [{ didDocumentRelativeKeyId: DID_ROOT_KEY_ID, kmsKeyId: 'kms-key-id' }],
      }
      const keyInfo = { key: { secretBytes } }

      mockDidRepository.findCreatedDid.mockResolvedValue(didRecord as unknown as DidRecord)
      // @ts-ignore
      mockKeyManagementService.getKeyAsserted.mockResolvedValue(keyInfo)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const result = await (service as any).getIssuerPrivateKey(mockAgentContext, 'issuer-id')

      expect(mockDidRepository.findCreatedDid).toHaveBeenCalledWith(mockAgentContext, 'issuer-id')
      // @ts-ignore
      expect(mockKms.getKms).toHaveBeenCalledWith(mockAgentContext)
      // @ts-ignore
      expect(mockKeyManagementService.getKeyAsserted).toHaveBeenCalledWith(mockAgentContext, 'kms-key-id')
      expect(result).toEqual(PrivateKey.fromBytesED25519(secretBytes))
    })

    it('should throw error if no rootKey found', async () => {
      const didRecord = {
        keys: [],
      }
      mockDidRepository.findCreatedDid.mockResolvedValue(didRecord as unknown as DidRecord)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      await expect((service as any).getIssuerPrivateKey(mockAgentContext, 'issuer-id')).rejects.toThrow(
        'The root key not found in the KMS'
      )
    })

    it('should throw error if didRecord is null or undefined', async () => {
      mockDidRepository.findCreatedDid.mockResolvedValue(null)

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      await expect((service as any).getIssuerPrivateKey(mockAgentContext, 'issuer-id')).rejects.toThrow(
        'The root key not found in the KMS'
      )
    })
  })
})
