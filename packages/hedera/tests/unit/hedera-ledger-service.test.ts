import {
  RegisterCredentialDefinitionOptions,
  RegisterRevocationRegistryDefinitionOptions,
  RegisterRevocationStatusListOptions,
  RegisterSchemaOptions,
} from '@credo-ts/anoncreds'
import { type DidDocument } from '@credo-ts/core'
import { AgentContext, DependencyManager } from '@credo-ts/core'
import { DidDocumentKey, Kms } from '@credo-ts/core'
import { KmsJwkPublicOkp } from '@credo-ts/core/src/modules/kms'
import { Client } from '@hashgraph/sdk'
import { HederaDidCreateOptions, HederaLedgerService } from '../../src/ledger/HederaLedgerService'

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

import { createOrGetKey } from '../../src/ledger/utils'

describe('HederaLedgerService', () => {
  let service: HederaLedgerService
  let mockAgentContext: Partial<AgentContext>
  let mockKms: jest.Mocked<Kms.KeyManagementApi>
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

    mockKms = {
      sign: jest.fn(),
    } as unknown as jest.Mocked<Kms.KeyManagementApi>

    mockAgentContext = {
      dependencyManager: {
        resolve: jest.fn().mockReturnValue(mockKms),
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

    jest.spyOn(service.clientService, 'withClient').mockImplementation(async (_props, operation) => {
      const mockClient = {} as Client
      return operation(mockClient)
    })
  })

  describe('resolveDid', () => {
    it('should calls resolveDID with proper args and returns result', async () => {
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
    it('should creates DID without didDocument', async () => {
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

      jest.spyOn(service as any, 'getPublisher').mockResolvedValue({} as Publisher)

      mockKms.sign.mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) })

      const result = await service.createDid(mockAgentContext as AgentContext, props as any)
      expect(createOrGetKey).toHaveBeenCalledWith(mockKms, keyId)
      expect(generateCreateDIDRequest).toHaveBeenCalled()
      expect(submitCreateDIDRequest).toHaveBeenCalled()
      expect(result.did).toBe('did:hedera:1234')
      expect(result.rootKey).toBeDefined()
    })

    it('should creates DID with didDocument and calls updateDid', async () => {
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
        .mockResolvedValue({ did: 'did:hedera:1234', someProp: true } as any)

      jest.spyOn(service as any, 'getPublisher').mockResolvedValue({} as Publisher)

      mockKms.sign.mockResolvedValue({ signature: new Uint8Array([1, 2, 3]) })

      const result = await service.createDid(mockAgentContext as AgentContext, props as any)
      expect(updateDidSpy).toHaveBeenCalled()
      expect(result.rootKey).toBeDefined()
    })
  })

  describe('updateDid', () => {
    const did = 'did:hedera:1234'
    const kmsKeyId = 'key-id'

    it('should throws error if didDocumentOperation is missing', async () => {
      await expect(service.updateDid(mockAgentContext as AgentContext, { did } as any)).rejects.toThrow(
        'DidDocumentOperation is required'
      )
    })

    it('should throws error if rootKey missing', async () => {
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

    it('should calls correct builder methods for each field and action', () => {
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

    it('should returns builder unchanged for unknown field', () => {
      const unknownField = 'unknownField'
      const fn = (service as any).getUpdateMethod(builder, unknownField, 'add')
      const result = fn('any param')
      expect(result).toBe(builder)
    })

    it('should performs update flow successfully', async () => {
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

      const updatesMock = { build: jest.fn().mockReturnValue(didDocument) } as any

      mockedParseDID.mockReturnValue({
        network: 'testnet',
        method: 'hedera',
        publicKey: '',
        topicId: '',
      })

      ;(resolveDID as jest.Mock).mockResolvedValue(mockDidResolution)

      jest.spyOn(service as any, 'prepareDidUpdates').mockReturnValue(updatesMock)

      jest.spyOn(service as any, 'getPublisher').mockResolvedValue({} as Publisher)

      ;(generateUpdateDIDRequest as jest.Mock).mockResolvedValue({ states: {}, signingRequests: {} })

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

      expect((service as any).prepareDidUpdates).toHaveBeenCalled()
      expect(generateUpdateDIDRequest).toHaveBeenCalled()
      expect(submitUpdateDIDRequest).toHaveBeenCalled()
    })
  })

  describe('deactivateDid', () => {
    const did = 'did:hedera:5678'
    const kmsKeyId = 'key-id'

    it('should throws error if rootKey is missing', async () => {
      await expect(
        service.deactivateDid(mockAgentContext as AgentContext, { did, secret: { keys: [] } } as any)
      ).rejects.toThrow('The root key not found in the KMS')
    })

    it('should throws an error if root key is not found in deactivateDid', async () => {
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

    it('should deactivates DID successfully', async () => {
      const keys: DidDocumentKey[] = [{ kmsKeyId, didDocumentRelativeKeyId: DID_ROOT_KEY_ID }]
      const mockPublisher = {}
      const mockState = {}
      const mockSigningRequest = { serializedPayload: new Uint8Array() }
      const signature = new Uint8Array([1, 2, 3])

      ;(parseDID as jest.Mock).mockReturnValue({ network: 'testnet' })

      jest.spyOn(service as any, 'getPublisher').mockResolvedValue(mockPublisher)

      // @ts-ignore
      mockedGenerateDeactivateDIDRequest.mockResolvedValue({ state: mockState, signingRequest: mockSigningRequest })

      mockKms.sign.mockResolvedValue({ signature })

      ;(submitDeactivateDIDRequest as jest.Mock).mockResolvedValue({ did })

      const result = await service.deactivateDid(
        mockAgentContext as AgentContext,
        {
          did,
          secret: { keys },
        } as any
      )

      expect(result).toHaveProperty('did', did)
      expect(mockKms.sign).toHaveBeenCalledWith({
        keyId: kmsKeyId,
        data: mockSigningRequest.serializedPayload,
        algorithm: 'EdDSA',
      })
    })
  })

  describe('Anoncreds SDK methods', () => {
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
      jest.spyOn(service as any, 'getHederaAnonCredsSdk').mockReturnValue(mockSdk)
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
      expect(mockSdk.registerSchema).toHaveBeenCalledWith(options)
      expect(result).toBe('registerSchema')
    })

    it('getCredentialDefinition', async () => {
      const result = await service.getCredentialDefinition(mockAgentContext as AgentContext, 'credDefId')
      expect(mockSdk.getCredentialDefinition).toHaveBeenCalledWith('credDefId')
      expect(result).toBe('credDef')
    })

    it('registerCredentialDefinition', async () => {
      const options: RegisterCredentialDefinitionOptions = {
        options: { supportRevocation: true },
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
        options: { supportRevocation: true },
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
      expect(mockSdk.registerRevocationRegistryDefinition).toHaveBeenCalledWith(options)
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
})
