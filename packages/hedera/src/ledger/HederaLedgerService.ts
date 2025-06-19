import type {
  GetCredentialDefinitionReturn,
  GetRevocationRegistryDefinitionReturn,
  GetRevocationStatusListReturn,
  GetSchemaReturn,
  RegisterCredentialDefinitionOptions,
  RegisterCredentialDefinitionReturn,
  RegisterRevocationRegistryDefinitionOptions,
  RegisterRevocationRegistryDefinitionReturn,
  RegisterRevocationStatusListOptions,
  RegisterRevocationStatusListReturn,
  RegisterSchemaOptions,
  RegisterSchemaReturn,
} from '@credo-ts/anoncreds'
import { type AgentContext, injectable } from '@credo-ts/core'
import { Client } from '@hashgraph/sdk'
import { HederaAnoncredsRegistry } from '@hiero-did-sdk/anoncreds'
import { HederaClientService, NetworkName } from '@hiero-did-sdk/client'
import { DIDResolution } from '@hiero-did-sdk/core'
import {
  CreateDIDResult,
  DeactivateDIDOptions,
  DeactivateDIDResult,
  UpdateDIDOptions,
  UpdateDIDResult,
  createDID,
  deactivateDID,
  updateDID,
} from '@hiero-did-sdk/registrar'
import { TopicReaderHederaHcs, parseDID, resolveDID } from '@hiero-did-sdk/resolver'
import { HederaModuleConfig } from '../HederaModuleConfig'
import { CredoCache } from '../cache/CredoCache'

@injectable()
export class HederaLedgerService {
  private readonly clientService: HederaClientService

  public constructor(private readonly config: HederaModuleConfig) {
    this.clientService = new HederaClientService(config.options)
  }

  /* Dids */

  public async resolveDid(agentContext: AgentContext, did: string): Promise<DIDResolution> {
    const topicReader = this.getHederaHcsTopicReader(agentContext)
    return await resolveDID(did, 'application/ld+json;profile="https://w3id.org/did-resolution"', { topicReader })
  }

  public async createDid(agentContext: AgentContext, props?: NetworkName): Promise<CreateDIDResult> {
    return this.clientService.withClient({ ...(props ?? {}) }, async (client: Client) => {
      const topicReader = this.getHederaHcsTopicReader(agentContext)
      return await createDID(
        {
          waitForDIDVisibility: false,
          topicReader,
        },
        { client }
      )
    })
  }

  public async updateDid(agentContext: AgentContext, props: UpdateDIDOptions): Promise<UpdateDIDResult> {
    const { network: networkName } = parseDID(props.did)
    return this.clientService.withClient({ networkName }, async (client: Client) => {
      const topicReader = this.getHederaHcsTopicReader(agentContext)
      return await updateDID(
        {
          ...props,
          waitForDIDVisibility: false,
          topicReader,
        },
        { client }
      )
    })
  }

  public async deactivateDid(agentContext: AgentContext, props: DeactivateDIDOptions): Promise<DeactivateDIDResult> {
    const { network: networkName } = parseDID(props.did)
    return this.clientService.withClient({ networkName }, async (client: Client) => {
      const topicReader = this.getHederaHcsTopicReader(agentContext)
      return await deactivateDID(
        {
          ...props,
          waitForDIDVisibility: false,
          topicReader,
        },
        { client }
      )
    })
  }

  /* Anoncreds*/

  async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.getSchema(schemaId)
  }

  async registerSchema(agentContext: AgentContext, options: RegisterSchemaOptions): Promise<RegisterSchemaReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.registerSchema(options)
  }

  async getCredentialDefinition(
    agentContext: AgentContext,
    credentialDefinitionId: string
  ): Promise<GetCredentialDefinitionReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.getCredentialDefinition(credentialDefinitionId)
  }

  async registerCredentialDefinition(
    agentContext: AgentContext,
    options: RegisterCredentialDefinitionOptions
  ): Promise<RegisterCredentialDefinitionReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.registerCredentialDefinition(options)
  }

  async getRevocationRegistryDefinition(
    agentContext: AgentContext,
    revocationRegistryDefinitionId: string
  ): Promise<GetRevocationRegistryDefinitionReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.getRevocationRegistryDefinition(revocationRegistryDefinitionId)
  }

  async registerRevocationRegistryDefinition(
    agentContext: AgentContext,
    options: RegisterRevocationRegistryDefinitionOptions
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.registerRevocationRegistryDefinition(options)
  }

  async getRevocationStatusList(
    agentContext: AgentContext,
    revocationRegistryId: string,
    timestamp: number
  ): Promise<GetRevocationStatusListReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.getRevocationStatusList(revocationRegistryId, timestamp)
  }

  async registerRevocationStatusList(
    agentContext: AgentContext,
    options: RegisterRevocationStatusListOptions
  ): Promise<RegisterRevocationStatusListReturn> {
    const sdk = this.getHederaAnonCredsSdk(agentContext)
    return await sdk.registerRevocationStatusList(options)
  }

  private getHederaHcsTopicReader(agentContext: AgentContext): TopicReaderHederaHcs {
    const cache = this.config.options.cache ?? new CredoCache(agentContext)
    return new TopicReaderHederaHcs({ ...this.config.options, cache })
  }

  private getHederaAnonCredsSdk(agentContext: AgentContext): HederaAnoncredsRegistry {
    const cache = this.config.options.cache ?? new CredoCache(agentContext)
    return new HederaAnoncredsRegistry({ ...this.config.options, cache })
  }
}
