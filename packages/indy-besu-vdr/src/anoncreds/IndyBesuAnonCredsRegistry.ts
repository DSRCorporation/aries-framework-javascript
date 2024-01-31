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
import { Key, JsonTransformer, type AgentContext, AriesFrameworkError } from '@aries-framework/core'
import { CredentialDefinitionRegistry, IndyBesuSigner, SchemaRegistry } from '../ledger'
import { buildCredentialDefinitionId, buildSchemaId } from './AnonCredsUtils'
import { CredentialDefinition, Schema } from '../types'

export class IndyBesuAnonCredsRegistry implements AnonCredsRegistry {
  public methodName = 'indy2'

  public readonly supportedIdentifier = new RegExp('')

  public async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
    try {
      const schemaRegistry = agentContext.dependencyManager.resolve(SchemaRegistry)

      const schemaJson = await schemaRegistry.resolveSchema(schemaId)

      const schema = JsonTransformer.fromJSON(schemaJson, Schema)

      return {
        schema,
        schemaId,
        resolutionMetadata: {},
        schemaMetadata: {},
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
    options: IndyBesuRegisterSchemaOptions
  ): Promise<RegisterSchemaReturn> {
    try {
      const schemaRegistry = agentContext.dependencyManager.resolve(SchemaRegistry)

      const signer = new IndyBesuSigner(options.options.accountKey, agentContext.wallet)

      const schemaId = buildSchemaId(options.schema)

      const schemaJson = JSON.stringify(options.schema)

      await schemaRegistry.createSchema(schemaId, schemaJson, signer)

      return {
        schemaState: {
          state: 'finished',
          schema: options.schema,
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
      const credentialDefinitionRegistry = agentContext.dependencyManager.resolve(CredentialDefinitionRegistry)

      const credentialDefinitionJson = await credentialDefinitionRegistry.resolveCredentialDefinition(credentialDefinitionId)

      const credentialDefinition = JsonTransformer.fromJSON(credentialDefinitionJson, CredentialDefinition)

      return {
        credentialDefinition,
        credentialDefinitionId,
        resolutionMetadata: {},
        credentialDefinitionMetadata: {},
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
    options: IndyBesuRegisterCredentialDefinitionOptions
  ): Promise<RegisterCredentialDefinitionReturn> {
    try {
      const credentialDefinitionRegistry = agentContext.dependencyManager.resolve(CredentialDefinitionRegistry)

      const schema = await this.getSchema(agentContext, options.credentialDefinition.schemaId)
      if (!schema.schema) {
        throw new AriesFrameworkError(`Schema not found for schemaId: ${options.credentialDefinition.schemaId}`)
      }

      const signer = new IndyBesuSigner(options.options.accountKey, agentContext.wallet)
      const createCredentialDefinitionId = buildCredentialDefinitionId(options.credentialDefinition)
      const credentialDefinitionJson = JSON.stringify(options.credentialDefinition)

      await credentialDefinitionRegistry.createCredentialDefinition(createCredentialDefinitionId, credentialDefinitionJson, signer)

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

export interface IndyBesuRegisterSchemaOptions extends RegisterSchemaOptions {
  options: {
    accountKey: Key
  }
}

export interface IndyBesuRegisterCredentialDefinitionOptions extends RegisterCredentialDefinitionOptions {
  options: {
    accountKey: Key
  }
}
