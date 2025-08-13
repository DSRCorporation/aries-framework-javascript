import {
    RegisterSchemaOptions,
    RegisterSchemaReturn,
    GetSchemaReturn,
    RegisterCredentialDefinitionOptions,
    RegisterCredentialDefinitionReturn,
    GetCredentialDefinitionReturn,
    RegisterRevocationRegistryDefinitionOptions,
    RegisterRevocationRegistryDefinitionReturn,
    GetRevocationRegistryDefinitionReturn,
    RegisterRevocationStatusListOptions,
    RegisterRevocationStatusListReturn,
    GetRevocationStatusListReturn,
    RegisterSchemaReturnStateFinished,
} from '@credo-ts/anoncreds'
import {AgentContext} from "@credo-ts/core";
import {HederaAnonCredsRegistry} from "@credo-ts/hedera";
import {HederaLedgerService} from "../../src/ledger/HederaLedgerService";

const createMockAgentContext = () => ({
    dependencyManager: {
        resolve: jest.fn(),
    },
    config: {
        logger: {
            trace: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        },
    },
}) as unknown as AgentContext

describe('HederaAnonCredsRegistry', () => {
    let service: HederaAnonCredsRegistry
    let mockAgentContext: AgentContext
    let mockLedgerService: any

    beforeEach(() => {
        mockAgentContext = createMockAgentContext()
        mockLedgerService = {
            registerSchema: jest.fn(),
            getSchema: jest.fn(),
            registerCredentialDefinition: jest.fn(),
            getCredentialDefinition: jest.fn(),
            registerRevocationRegistryDefinition: jest.fn(),
            getRevocationRegistryDefinition: jest.fn(),
            registerRevocationStatusList: jest.fn(),
            getRevocationStatusList: jest.fn(),
        }
        // @ts-ignore
        mockAgentContext.dependencyManager.resolve.mockReturnValue(mockLedgerService)

        service = new HederaAnonCredsRegistry()
    })

    describe('registerSchema', () => {
        const options: RegisterSchemaOptions = {
            schema: {
                issuerId: 'did:hedera:123', name: 'schemaName', version: '1.0',
                attrNames: []
            },
            options: {},
        }

        it('should call ledgerService.registerSchema and return result on success', async () => {
            const expected: RegisterSchemaReturn = {
                schemaMetadata: {}, registrationMetadata: {},
                schemaState: {
                    state: "finished"
                } as RegisterSchemaReturnStateFinished
            }
            mockLedgerService.registerSchema.mockResolvedValue(expected)

            const result = await service.registerSchema(mockAgentContext, options)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith('Registering schema on Hedera ledger')
            expect(mockAgentContext.dependencyManager.resolve).toHaveBeenCalledWith(expect.any(Function) || HederaLedgerService)
            expect(mockLedgerService.registerSchema).toHaveBeenCalledWith(mockAgentContext, options)
            expect(result).toEqual(expected)
        })

        it('should catch error and return failed state', async () => {
            const error = new Error('fail')
            mockLedgerService.registerSchema.mockRejectedValue(error)

            const result = await service.registerSchema(mockAgentContext, options)

            expect(mockAgentContext.config.logger.debug).toHaveBeenCalledWith(
                `Error registering schema for did '${options.schema.issuerId}'`,
                expect.objectContaining({ error, did: options.schema.issuerId, schema: options })
            )
            expect(result.schemaState.state).toBe('failed')
            if (result.schemaState.state === 'failed')
                expect(result.schemaState.reason).toContain('fail')
        })
    })

    describe('getSchema', () => {
        const schemaId = 'schema-id-123'

        it('should call ledgerService.getSchema and return result on success', async () => {
            const expected: GetSchemaReturn = {
                schemaId: schemaId,
                resolutionMetadata: {},
                schemaMetadata: {}
            }
            mockLedgerService.getSchema.mockResolvedValue(expected)

            const result = await service.getSchema(mockAgentContext, schemaId)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith(`Resolving schema '${schemaId}' from Hedera ledger`)
            expect(mockLedgerService.getSchema).toHaveBeenCalledWith(mockAgentContext, schemaId)
            expect(result).toEqual(expected)
        })

        it('should catch error and return notFound error state', async () => {
            const error = new Error('not found')
            mockLedgerService.getSchema.mockRejectedValue(error)

            const result = await service.getSchema(mockAgentContext, schemaId)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error retrieving schema '${schemaId}'`,
                expect.objectContaining({ error, schemaId })
            )
            expect(result.resolutionMetadata.error).toBe('notFound')
            expect(result.resolutionMetadata.message).toContain('not found')
        })
    })

    describe('registerCredentialDefinition', () => {
        const options: RegisterCredentialDefinitionOptions = {
            credentialDefinition: { issuerId: 'did:hedera:issuer' }
        } as any

        it('should call ledgerService.registerCredentialDefinition and return result on success', async () => {
            const expected: RegisterCredentialDefinitionReturn = {
                credentialDefinitionMetadata: {},
                registrationMetadata: {},
                credentialDefinitionState: {
                    state: "finished",
                    credentialDefinition: {
                        issuerId: '',
                        schemaId: '',
                        type: 'CL',
                        tag: '',
                        value: {
                            primary: {},
                            revocation: undefined
                        }
                    },
                    credentialDefinitionId: "did:hedera:issuerId",
                }
            }
            mockLedgerService.registerCredentialDefinition.mockResolvedValue(expected)

            const result = await service.registerCredentialDefinition(mockAgentContext, options)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith('Registering credential definition on Hedera ledger')
            expect(mockLedgerService.registerCredentialDefinition).toHaveBeenCalledWith(mockAgentContext, options)
            expect(result).toEqual(expected)
        })

        it('should catch error and return failed state', async () => {
            const error = new Error('fail')
            mockLedgerService.registerCredentialDefinition.mockRejectedValue(error)

            const result = await service.registerCredentialDefinition(mockAgentContext, options)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error registering credential definition for did '${options.credentialDefinition.issuerId}'`,
                expect.objectContaining({ error, did: options.credentialDefinition.issuerId, schema: options })
            )
            expect(result.credentialDefinitionState.state).toBe('failed')
            if (result.credentialDefinitionState.state === 'failed')
                expect(result.credentialDefinitionState.reason).toContain('fail')
        })
    })

    describe('getCredentialDefinition', () => {
        const credentialDefinitionId = 'cred-def-123'

        it('should call ledgerService.getCredentialDefinition and return result on success', async () => {
            const expected: GetCredentialDefinitionReturn = {
                credentialDefinitionId,
                resolutionMetadata: {},
                credentialDefinitionMetadata: {}
            }
            mockLedgerService.getCredentialDefinition.mockResolvedValue(expected)

            const result = await service.getCredentialDefinition(mockAgentContext, credentialDefinitionId)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith(
                `Resolving credential definition '${credentialDefinitionId}' from Hedera ledger`
            )
            expect(mockLedgerService.getCredentialDefinition).toHaveBeenCalledWith(mockAgentContext, credentialDefinitionId)
            expect(result).toEqual(expected)
        })

        it('should catch error and return notFound error state', async () => {
            const error = new Error('not found')
            mockLedgerService.getCredentialDefinition.mockRejectedValue(error)

            const result = await service.getCredentialDefinition(mockAgentContext, credentialDefinitionId)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error retrieving credential definition '${credentialDefinitionId}'`,
                expect.objectContaining({ error, credentialDefinitionId })
            )
            expect(result.resolutionMetadata.error).toBe('notFound')
            expect(result.resolutionMetadata.message).toContain('not found')
        })
    })

    describe('registerRevocationRegistryDefinition', () => {
        const options: RegisterRevocationRegistryDefinitionOptions = {
            revocationRegistryDefinition: { credDefId: 'credDef1', issuerId: 'did:hedera:issuer' },
        } as any

        it('should call ledgerService.registerRevocationRegistryDefinition and return result on success', async () => {
            const expected: RegisterRevocationRegistryDefinitionReturn = {
                revocationRegistryDefinitionMetadata: {},
                registrationMetadata: {},
                revocationRegistryDefinitionState: {
                    state: "finished",
                    revocationRegistryDefinitionId: 'test',
                    revocationRegistryDefinition: {
                        issuerId: '',
                        revocDefType: 'CL_ACCUM',
                        credDefId: '',
                        tag: '',
                        value: {
                            publicKeys: {
                                accumKey: {
                                    z: ''
                                }
                            },
                            maxCredNum: 0,
                            tailsLocation: '',
                            tailsHash: ''
                        }
                    }
                }
            }
            mockLedgerService.registerRevocationRegistryDefinition.mockResolvedValue(expected)

            const result = await service.registerRevocationRegistryDefinition(mockAgentContext, options)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith(
                `Registering revocation registry definition for '${options.revocationRegistryDefinition.credDefId}' on Hedera ledger`
            )
            expect(mockLedgerService.registerRevocationRegistryDefinition).toHaveBeenCalledWith(mockAgentContext, options)
            expect(result).toEqual(expected)
        })

        it('should catch error and return failed state', async () => {
            const error = new Error('fail')
            mockLedgerService.registerRevocationRegistryDefinition.mockRejectedValue(error)

            const result = await service.registerRevocationRegistryDefinition(mockAgentContext, options)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error registering revocation registry definition for did '${options.revocationRegistryDefinition.issuerId}'`,
                expect.objectContaining({ error, did: options.revocationRegistryDefinition.issuerId, options })
            )
            expect(result.revocationRegistryDefinitionState.state).toBe('failed')
            if (result.revocationRegistryDefinitionState.state === 'failed')
                expect(result.revocationRegistryDefinitionState.reason).toContain('fail')
        })
    })

    describe('getRevocationRegistryDefinition', () => {
        const revocationRegistryDefinitionId = 'revRegDef123'

        it('should call ledgerService.getRevocationRegistryDefinition and return result on success', async () => {
            const expected: GetRevocationRegistryDefinitionReturn = {
                revocationRegistryDefinitionId,
                resolutionMetadata: {},
                revocationRegistryDefinitionMetadata: {}
            }
            mockLedgerService.getRevocationRegistryDefinition.mockResolvedValue(expected)

            const result = await service.getRevocationRegistryDefinition(mockAgentContext, revocationRegistryDefinitionId)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith(
                `Resolving revocation registry definition for '${revocationRegistryDefinitionId}' from Hedera ledger`
            )
            expect(mockLedgerService.getRevocationRegistryDefinition).toHaveBeenCalledWith(mockAgentContext, revocationRegistryDefinitionId)
            expect(result).toEqual(expected)
        })

        it('should catch error and return notFound error state', async () => {
            const error = new Error('not found')
            mockLedgerService.getRevocationRegistryDefinition.mockRejectedValue(error)

            const result = await service.getRevocationRegistryDefinition(mockAgentContext, revocationRegistryDefinitionId)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error retrieving revocation registry definition '${revocationRegistryDefinitionId}'`,
                expect.objectContaining({ error, revocationRegistryDefinitionId })
            )
            expect(result.resolutionMetadata.error).toBe('notFound')
            expect(result.resolutionMetadata.message).toContain('not found')
        })
    })

    describe('registerRevocationStatusList', () => {
        const options: RegisterRevocationStatusListOptions = {
            revocationStatusList: { revRegDefId: 'regDef1', issuerId: 'did:hedera:issuer' }
        } as any

        it('should call ledgerService.registerRevocationStatusList and return result on success', async () => {
            const expected: RegisterRevocationStatusListReturn = {
                revocationStatusListMetadata: {},
                registrationMetadata: {},
                revocationStatusListState: {
                    state: 'finished',
                    revocationStatusList: {
                        revRegDefId: '',
                        issuerId: '',
                        revocationList: [],
                        timestamp: 0,
                        currentAccumulator: ''
                    }
                }
            }
            mockLedgerService.registerRevocationStatusList.mockResolvedValue(expected)

            const result = await service.registerRevocationStatusList(mockAgentContext, options)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith(
                `Registering revocation status list for '${options.revocationStatusList.revRegDefId}' on Hedera ledger`
            )
            expect(mockLedgerService.registerRevocationStatusList).toHaveBeenCalledWith(mockAgentContext, options)
            expect(result).toEqual(expected)
        })

        it('should catch error and return failed state', async () => {
            const error = new Error('fail')
            mockLedgerService.registerRevocationStatusList.mockRejectedValue(error)

            const result = await service.registerRevocationStatusList(mockAgentContext, options)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error registering revocation status list for did '${options.revocationStatusList.issuerId}'`,
                expect.objectContaining({ error, did: options.revocationStatusList.issuerId, options })
            )
            expect(result.revocationStatusListState.state).toBe('failed')
            if (result.revocationStatusListState.state === 'failed')
              expect(result.revocationStatusListState.reason).toContain('fail')
        })
    })

    describe('getRevocationStatusList', () => {
        const revocationRegistryId = 'revRegId123'
        const timestamp = 1234567890

        it('should call ledgerService.getRevocationStatusList and return result on success', async () => {
            const expected: GetRevocationStatusListReturn = {
                resolutionMetadata: {},
                revocationStatusListMetadata: {}
            }
            mockLedgerService.getRevocationStatusList.mockResolvedValue(expected)

            const result = await service.getRevocationStatusList(mockAgentContext, revocationRegistryId, timestamp)

            expect(mockAgentContext.config.logger.trace).toHaveBeenCalledWith(
                `Resolving revocation status for for '${revocationRegistryId}' from Hedera ledger`
            )
            expect(mockLedgerService.getRevocationStatusList).toHaveBeenCalledWith(mockAgentContext, revocationRegistryId, timestamp * 1000)
            expect(result).toEqual(expected)
        })

        it('should catch error and return notFound error state', async () => {
            const error = new Error('not found')
            mockLedgerService.getRevocationStatusList.mockRejectedValue(error)

            const result = await service.getRevocationStatusList(mockAgentContext, revocationRegistryId, timestamp)

            expect(mockAgentContext.config.logger.error).toHaveBeenCalledWith(
                `Error retrieving revocation registry status list '${revocationRegistryId}'`,
                expect.objectContaining({ error, revocationRegistryId })
            )
            expect(result.resolutionMetadata.error).toBe('notFound')
            expect(result.resolutionMetadata.message).toContain('not found')
        })
    })
})
