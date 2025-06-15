import {
  AnonCredsError,
  AnonCredsModuleConfig,
  type AnonCredsRegistry,
  type GetCredentialDefinitionReturn,
  type GetRevocationRegistryDefinitionReturn,
  type GetRevocationStatusListReturn,
  type GetSchemaReturn,
  type RegisterCredentialDefinitionOptions,
  type RegisterCredentialDefinitionReturn,
  type RegisterRevocationRegistryDefinitionOptions,
  type RegisterRevocationRegistryDefinitionReturn,
  type RegisterRevocationStatusListOptions,
  type RegisterRevocationStatusListReturn,
  type RegisterSchemaOptions,
  type RegisterSchemaReturn,
} from '@credo-ts/anoncreds'
import type { AgentContext } from '@credo-ts/core'
import { parseDidScid } from '../dids/identifiers'

function getAnonCredsIssuerId(resourceId: string): string {
  return resourceId.split('/')[0]
}

export class DidScidAnonCredsRegistry implements AnonCredsRegistry {
  public readonly methodName: string = 'scid'

  public readonly supportedIdentifier: RegExp = /^did:scid:.*$/

  public async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, getAnonCredsIssuerId(schemaId))
    return registry.getSchema(agentContext, schemaId)
  }

  public async getCredentialDefinition(
    agentContext: AgentContext,
    credentialDefinitionId: string
  ): Promise<GetCredentialDefinitionReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, getAnonCredsIssuerId(credentialDefinitionId))
    return registry.getCredentialDefinition(agentContext, credentialDefinitionId)
  }

  public getRevocationRegistryDefinition(
    agentContext: AgentContext,
    revocationRegistryDefinitionId: string
  ): Promise<GetRevocationRegistryDefinitionReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, getAnonCredsIssuerId(revocationRegistryDefinitionId))
    return registry.getRevocationRegistryDefinition(agentContext, revocationRegistryDefinitionId)
  }

  public getRevocationStatusList(
    agentContext: AgentContext,
    revocationRegistryId: string,
    timestamp: number
  ): Promise<GetRevocationStatusListReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, getAnonCredsIssuerId(revocationRegistryId))
    return registry.getRevocationStatusList(agentContext, revocationRegistryId, timestamp)
  }

  public registerSchema(agentContext: AgentContext, options: RegisterSchemaOptions): Promise<RegisterSchemaReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, options.schema.issuerId)
    return registry.registerSchema(agentContext, options)
  }

  public registerCredentialDefinition(
    agentContext: AgentContext,
    options: RegisterCredentialDefinitionOptions
  ): Promise<RegisterCredentialDefinitionReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, options.credentialDefinition.issuerId)
    return registry.registerCredentialDefinition(agentContext, options)
  }

  public registerRevocationRegistryDefinition(
    agentContext: AgentContext,
    options: RegisterRevocationRegistryDefinitionOptions
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, options.revocationRegistryDefinition.issuerId)
    return registry.registerRevocationRegistryDefinition(agentContext, options)
  }

  public registerRevocationStatusList(
    agentContext: AgentContext,
    options: RegisterRevocationStatusListOptions
  ): Promise<RegisterRevocationStatusListReturn> {
    const registry = this.findRegistryForIssuerId(agentContext, options.revocationStatusList.issuerId)
    return registry.registerRevocationStatusList(agentContext, options)
  }

  private findRegistryForIssuerId(agentContext: AgentContext, issuerId: string): AnonCredsRegistry {
    const { host } = parseDidScid(issuerId)
    const hostMethod = host.split(':')[0]

    const registries = agentContext.dependencyManager.resolve(AnonCredsModuleConfig).registries
    const hostRegistry = registries.find((registry) => registry.methodName === hostMethod)

    if (!hostRegistry) {
      throw new AnonCredsError(`No AnonCredsRegistry registered for did:scid host method '${host}'`)
    }

    return hostRegistry
  }
}
