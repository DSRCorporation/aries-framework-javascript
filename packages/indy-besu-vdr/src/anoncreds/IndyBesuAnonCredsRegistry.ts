import type {
  AnonCredsRegistry,
  GetCredentialDefinitionReturn,
  GetRevocationStatusListReturn,
  GetRevocationRegistryDefinitionReturn,
  GetSchemaReturn,
  RegisterCredentialDefinitionOptions,
  RegisterCredentialDefinitionReturn,
  RegisterSchemaReturn,
  RegisterSchemaOptions,
} from '@aries-framework/anoncreds'
import { JsonTransformer, type AgentContext, AriesFrameworkError } from '@aries-framework/core'
import { IndyBesuLedgerService } from '../ledger'
import { buildCredentialDefinitionId, buildSchemaId } from './AnonCredsUtils'
import { verificationKeyForDid } from '../dids/DidUtils'
import { CredentialDefinitionValue } from './Trasformers'

export class IndyBesuAnonCredsRegistry implements AnonCredsRegistry {
  public methodName = 'indy2'

  public readonly supportedIdentifier = new RegExp('')

  public async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
    try {
      const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

      const { schema, metadata } = await ledgerService.schemaRegistry.resolveSchema(schemaId)

      return {
        schema: schema,
        schemaId,
        resolutionMetadata: {},
        schemaMetadata: metadata,
      }
    } catch (error) {
      return {
        schemaId,
        resolutionMetadata: {
          error: 'unknownError',
          message: `unable to resolve schema: ${error.message}`,
        },
        schemaMetadata: {},
      }
    }
  }

  public async registerSchema(
    agentContext: AgentContext,
    options: RegisterSchemaOptions
  ): Promise<RegisterSchemaReturn> {
    try {
      const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

      const key = await verificationKeyForDid(agentContext, options.schema.issuerId)
      const signer = ledgerService.createSigner(key, agentContext.wallet)
      const schemaRegistry = ledgerService.schemaRegistry.connect(signer)

      const schemaId = buildSchemaId(options.schema)

      const schema = {
        id: schemaId,
        ...options.schema,
      }

      await schemaRegistry.createSchema(schema)

      return {
        schemaState: {
          state: 'finished',
          schema,
          schemaId: schemaId,
        },
        registrationMetadata: {},
        schemaMetadata: {},
      }
    } catch (error) {
      return {
        schemaMetadata: {},
        registrationMetadata: {},
        schemaState: {
          state: 'failed',
          schema: options.schema,
          reason: `unknownError: ${error.message}`,
        },
      }
    }
  }

  public async getCredentialDefinition(
    agentContext: AgentContext,
    credentialDefinitionId: string
  ): Promise<GetCredentialDefinitionReturn> {
    try {
      const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

      const { credDef, metadata } = await ledgerService.credentialDefinitionRegistry.resolveCredentialDefinition(
        credentialDefinitionId
      )
      
      console.log(JSON.stringify(credDef))

      const value = JsonTransformer.fromJSON(credDef.value, CredentialDefinitionValue)

      console.log(JSON.stringify(value))

      return {
        credentialDefinition: {
          issuerId: credDef.issuerId,
          schemaId: credDef.schemaId,
          type: 'CL',
          tag: credDef.tag,
          value: value,
        },
        credentialDefinitionId,
        resolutionMetadata: {},
        credentialDefinitionMetadata: metadata,
      }
    } catch (error) {
      return {
        credentialDefinitionId,
        resolutionMetadata: {
          error: 'unknownError',
          message: `unable to resolve credential definition: ${error.message}`,
        },
        credentialDefinitionMetadata: {},
      }
    }
  }

  public async registerCredentialDefinition(
    agentContext: AgentContext,
    options: RegisterCredentialDefinitionOptions
  ): Promise<RegisterCredentialDefinitionReturn> {
    try {
      const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)

      const schema = await this.getSchema(agentContext, options.credentialDefinition.schemaId)
      if (!schema.schema) {
        throw new AriesFrameworkError(`Schema not found for schemaId: ${options.credentialDefinition.schemaId}`)
      }

      const key = await verificationKeyForDid(agentContext, options.credentialDefinition.issuerId)
      const signer = ledgerService.createSigner(key, agentContext.wallet)
      const credentialDefinitionRegistry = ledgerService.credentialDefinitionRegistry.connect(signer)

      const createCredentialDefinitionId = buildCredentialDefinitionId(options.credentialDefinition)

      const credentialDefinition = {
        id: createCredentialDefinitionId,
        issuerId: options.credentialDefinition.issuerId,
        schemaId: options.credentialDefinition.schemaId,
        credDefType: options.credentialDefinition.type,
        tag: options.credentialDefinition.tag,
        value: JSON.stringify(options.credentialDefinition.value),
      }

      await credentialDefinitionRegistry.createCredentialDefinition(credentialDefinition)

      return {
        credentialDefinitionState: {
          state: 'finished',
          credentialDefinition: options.credentialDefinition,
          credentialDefinitionId: createCredentialDefinitionId,
        },
        registrationMetadata: {},
        credentialDefinitionMetadata: {},
      }
    } catch (error) {
      return {
        credentialDefinitionMetadata: {},
        registrationMetadata: {},
        credentialDefinitionState: {
          state: 'failed',
          credentialDefinition: options.credentialDefinition,
          reason: `unknownError: ${error.message}`,
        },
      }
    }
  }

  getRevocationRegistryDefinition(
    agentContext: AgentContext,
    revocationRegistryDefinitionId: string
  ): Promise<GetRevocationRegistryDefinitionReturn> {
    throw new Error('Method not implemented.')
  }

  getRevocationStatusList(
    agentContext: AgentContext,
    revocationRegistryId: string,
    timestamp: number
  ): Promise<GetRevocationStatusListReturn> {
    throw new Error('Method not implemented.')
  }
}
