import {
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
import {
  type AgentContext,
  DidCreateOptions,
  DidDeactivateOptions,
  type DidDocument,
  DidDocumentKey,
  DidRepository,
  DidUpdateOptions,
  Kms,
  injectable,
} from '@credo-ts/core'
import { KeyManagementApi } from '@credo-ts/core/src/modules/kms'
import { Client, PrivateKey } from '@hashgraph/sdk'
import { HederaAnoncredsRegistry } from '@hiero-did-sdk/anoncreds'
import { HederaClientService, HederaNetwork } from '@hiero-did-sdk/client'
import { DIDResolution, DID_ROOT_KEY_ID, Service, VerificationMethod, parseDID } from '@hiero-did-sdk/core'
import {
  CreateDIDResult,
  DIDUpdateBuilder,
  DeactivateDIDResult,
  UpdateDIDResult,
  generateCreateDIDRequest,
  generateDeactivateDIDRequest,
  generateUpdateDIDRequest,
  submitCreateDIDRequest,
  submitDeactivateDIDRequest,
  submitUpdateDIDRequest,
} from '@hiero-did-sdk/registrar'
import { TopicReaderHederaHcs, resolveDID } from '@hiero-did-sdk/resolver'
import { HederaModuleConfig } from '../HederaModuleConfig'
import { CredoCache } from './cache/CredoCache'
import { KmsPublisher } from './publisher/KmsPublisher'
import { createOrGetKey, getMultibasePublicKey } from './utils'

export interface HederaDidCreateOptions extends DidCreateOptions {
  method: 'hedera'
  options?: {
    network?: HederaNetwork | string
  }
  secret?: {
    rootKeyId?: string
    keys?: DidDocumentKey[]
  }
}

export interface HederaCreateDIDResult extends CreateDIDResult {
  rootKey: DidDocumentKey
}

export interface HederaDidUpdateOptions extends DidUpdateOptions {
  secret?: {
    keys?: DidDocumentKey[]
  }
}

export interface HederaDidDeactivateOptions extends DidDeactivateOptions {
  secret?: {
    keys?: DidDocumentKey[]
  }
}

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

  public async createDid(agentContext: AgentContext, props: HederaDidCreateOptions): Promise<HederaCreateDIDResult> {
    const { options, secret, didDocument } = props
    return this.clientService.withClient({ networkName: options?.network }, async (client: Client) => {
      const topicReader = this.getHederaHcsTopicReader(agentContext)

      const controller =
        typeof didDocument?.controller === 'string'
          ? didDocument?.controller
          : Array.isArray(didDocument?.controller)
            ? didDocument?.controller[0]
            : undefined

      const kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

      const { keyId, publicJwk } = await createOrGetKey(kms, secret?.rootKeyId)
      const rootKey = { kmsKeyId: keyId, didDocumentRelativeKeyId: DID_ROOT_KEY_ID }

      const publisher = await this.getPublisher(agentContext, client, keyId)

      const { state, signingRequest } = await generateCreateDIDRequest(
        {
          controller,
          multibasePublicKey: getMultibasePublicKey(publicJwk),
          topicReader,
        },
        {
          client,
          publisher,
        }
      )

      const signatureResult = await kms.sign({ keyId, data: signingRequest.serializedPayload, algorithm: 'EdDSA' })
      const createDidDocumentResult = await submitCreateDIDRequest(
        { state, signature: signatureResult.signature, topicReader },
        {
          client,
          publisher,
        }
      )

      if (didDocument) {
        const keys = [...(secret?.keys ?? []), ...[rootKey]]
        const updateDidDocumentResult = await this.updateDid(agentContext, {
          did: createDidDocumentResult.did,
          didDocumentOperation: 'setDidDocument',
          didDocument,
          options: { ...options },
          secret: { keys },
        })
        return {
          ...updateDidDocumentResult,
          rootKey,
        }
      }

      return {
        ...createDidDocumentResult,
        rootKey,
      }
    })
  }

  public async updateDid(agentContext: AgentContext, props: HederaDidUpdateOptions): Promise<UpdateDIDResult> {
    const { did, didDocumentOperation, didDocument, secret } = props
    const kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    if (!didDocumentOperation) {
      throw new Error('DidDocumentOperation is required')
    }

    // Check root key presents
    const rootKey = secret?.keys?.find((k) => k.didDocumentRelativeKeyId === DID_ROOT_KEY_ID)
    if (!rootKey?.kmsKeyId) {
      throw new Error('The root key not found in the KMS')
    }

    // Check all required keys presents
    this.checkRequiredDidDocumentKeys(didDocument, secret?.keys ?? [])

    const { network: networkName } = parseDID(did)
    return this.clientService.withClient({ networkName }, async (client: Client) => {
      const topicReader = this.getHederaHcsTopicReader(agentContext)

      const currentDidDocumentResolution = await resolveDID(
        did,
        'application/ld+json;profile="https://w3id.org/did-resolution"',
        { topicReader }
      )
      if (!currentDidDocumentResolution.didDocument) {
        throw new Error(`DID ${did} not found`)
      }

      const didUpdates = this.prepareDidUpdates(
        currentDidDocumentResolution.didDocument,
        didDocument,
        didDocumentOperation
      )

      const publisher = await this.getPublisher(agentContext, client, rootKey.kmsKeyId)

      const { states, signingRequests } = await generateUpdateDIDRequest(
        {
          did,
          updates: didUpdates.build(),
          topicReader,
        },
        {
          client,
          publisher,
        }
      )

      const signatures = await this.signRequests(signingRequests, kms, rootKey.kmsKeyId)
      return await submitUpdateDIDRequest(
        {
          states,
          signatures,
          topicReader,
        },
        {
          client,
          publisher,
        }
      )
    })
  }

  public async deactivateDid(
    agentContext: AgentContext,
    props: HederaDidDeactivateOptions
  ): Promise<DeactivateDIDResult> {
    const { did, secret } = props

    const kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    const rootKey = secret?.keys?.find((k) => k.didDocumentRelativeKeyId === DID_ROOT_KEY_ID)
    if (!rootKey?.kmsKeyId) {
      throw new Error('The root key not found in the KMS')
    }

    const { network: networkName } = parseDID(props.did)
    return this.clientService.withClient({ networkName }, async (client: Client) => {
      const topicReader = this.getHederaHcsTopicReader(agentContext)

      const publisher = await this.getPublisher(agentContext, client, rootKey.kmsKeyId)

      const { state, signingRequest } = await generateDeactivateDIDRequest(
        {
          did,
          topicReader,
        },
        {
          client,
          publisher,
        }
      )
      const signatureResult = await kms.sign({
        keyId: rootKey.kmsKeyId,
        data: signingRequest.serializedPayload,
        algorithm: 'EdDSA',
      })
      return await submitDeactivateDIDRequest(
        {
          state,
          signature: signatureResult.signature,
          topicReader,
        },
        {
          client,
          publisher,
        }
      )
    })
  }

  /* Anoncreds*/

  async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    return await registry.getSchema(schemaId)
  }

  async registerSchema(agentContext: AgentContext, options: RegisterSchemaOptions): Promise<RegisterSchemaReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    const issuerPrivateKey = await this.getIssuerPrivateKey(agentContext, options.schema.issuerId)
    return await registry.registerSchema({ ...options, issuerKeyDer: issuerPrivateKey.toStringDer() })
  }

  async getCredentialDefinition(
    agentContext: AgentContext,
    credentialDefinitionId: string
  ): Promise<GetCredentialDefinitionReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    return await registry.getCredentialDefinition(credentialDefinitionId)
  }

  async registerCredentialDefinition(
    agentContext: AgentContext,
    options: RegisterCredentialDefinitionOptions
  ): Promise<RegisterCredentialDefinitionReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    const issuerPrivateKey = await this.getIssuerPrivateKey(agentContext, options.credentialDefinition.issuerId)
    return await registry.registerCredentialDefinition({
      ...options,
      issuerKeyDer: issuerPrivateKey.toStringDer(),
      options: {
        supportRevocation: options.options?.supportRevocation === true,
      },
    })
  }

  async getRevocationRegistryDefinition(
    agentContext: AgentContext,
    revocationRegistryDefinitionId: string
  ): Promise<GetRevocationRegistryDefinitionReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    return await registry.getRevocationRegistryDefinition(revocationRegistryDefinitionId)
  }

  async registerRevocationRegistryDefinition(
    agentContext: AgentContext,
    options: RegisterRevocationRegistryDefinitionOptions
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    const issuerPrivateKey = await this.getIssuerPrivateKey(agentContext, options.revocationRegistryDefinition.issuerId)
    return await registry.registerRevocationRegistryDefinition({
      ...options,
      issuerKeyDer: issuerPrivateKey.toStringDer(),
    })
  }

  async getRevocationStatusList(
    agentContext: AgentContext,
    revocationRegistryId: string,
    timestamp: number
  ): Promise<GetRevocationStatusListReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    return await registry.getRevocationStatusList(revocationRegistryId, timestamp)
  }

  async registerRevocationStatusList(
    agentContext: AgentContext,
    options: RegisterRevocationStatusListOptions
  ): Promise<RegisterRevocationStatusListReturn> {
    const registry = this.getHederaAnoncredsRegistry(agentContext)
    const issuerPrivateKey = await this.getIssuerPrivateKey(agentContext, options.revocationStatusList.issuerId)
    return await registry.registerRevocationStatusList({
      ...options,
      issuerKeyDer: issuerPrivateKey.toStringDer(),
    })
  }

  // Private methods

  private getHederaHcsTopicReader(agentContext: AgentContext): TopicReaderHederaHcs {
    const cache = this.config.options.cache ?? new CredoCache(agentContext)
    return new TopicReaderHederaHcs({ ...this.config.options, cache })
  }

  private async getPublisher(agentContext: AgentContext, client: Client, keyId: string): Promise<KmsPublisher> {
    const kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)
    const key = await createOrGetKey(kms, keyId)
    return new KmsPublisher(agentContext, client, key)
  }

  private getHederaAnoncredsRegistry(agentContext: AgentContext): HederaAnoncredsRegistry {
    const cache = this.config.options.cache ?? new CredoCache(agentContext)
    return new HederaAnoncredsRegistry({ ...this.config.options, cache })
  }

  private isDidRootKeyId(id: string): boolean {
    return id.endsWith(DID_ROOT_KEY_ID)
  }

  private getId(item: { id: string } | string): string {
    const id = typeof item === 'string' ? item : item.id
    return id.includes('#') ? `#${id.split('#').pop()}` : id
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private getDiff(currentArray?: any[], newArray?: any[]) {
    const currentList = currentArray || []
    const newList = newArray || []

    const currentIds = new Set(currentList.map((item) => this.getId(item)))
    const newIds = new Set(newList.map((item) => this.getId(item)))

    const existingItems = newList.filter((item) => currentIds.has(this.getId(item))).map((item) => item.id)
    const newItems = newList.filter((item) => !currentIds.has(this.getId(item)))
    const missingItems = currentList.filter((item) => !newIds.has(this.getId(item)))

    return { existingItems, newItems, missingItems }
  }

  private async signRequests(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    signingRequests: Record<string, any>,
    kms: KeyManagementApi,
    keyId: string
  ): Promise<Record<string, Uint8Array>> {
    const result: Record<string, Uint8Array> = {}

    for (const [key, request] of Object.entries(signingRequests)) {
      const signResult = await kms.sign({
        keyId,
        data: request.serializedPayload,
        algorithm: 'EdDSA',
      })
      result[key] = signResult.signature
    }

    return result
  }

  private checkRequiredDidDocumentKeys(didDocument: DidDocument | Partial<DidDocument>, keys: DidDocumentKey[]) {
    const fields = [
      'verificationMethod',
      'assertionMethod',
      'authentication',
      'capabilityDelegation',
      'capabilityInvocation',
      'keyAgreement',
    ]
    for (const field of fields) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const fieldValue = (didDocument as any)[field]
      if (fieldValue) {
        const fieldValues = Array.isArray(fieldValue) ? fieldValue : [fieldValue]

        for (const value of fieldValues) {
          const id = this.getId(value)
          if (!keys.some((key) => key.didDocumentRelativeKeyId === id)) {
            throw new Error(`Key ${id} from ${field} not found in keys`)
          }
        }
      }
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private prepareDidUpdates(currentDoc: any, newDoc: any, operation: string): DIDUpdateBuilder {
    const builder = new DIDUpdateBuilder()
    const fields = [
      'service',
      'verificationMethod',
      'assertionMethod',
      'authentication',
      'capabilityDelegation',
      'capabilityInvocation',
      'keyAgreement',
    ]

    for (const field of fields) {
      const { existingItems, newItems, missingItems } = this.getDiff(currentDoc[field], newDoc[field])

      if (operation === 'setDidDocument') {
        for (const item of missingItems) {
          if (!this.isDidRootKeyId(typeof item === 'string' ? item : item.id)) {
            this.getUpdateMethod(builder, field, 'remove')(this.getId(item))
          }
        }
        for (const item of newItems) {
          if (!this.isDidRootKeyId(typeof item === 'string' ? item : item.id)) {
            this.getUpdateMethod(builder, field, 'add')(item)
          }
        }
      }

      if (operation === 'addToDidDocument') {
        for (const item of newItems) {
          if (!this.isDidRootKeyId(typeof item === 'string' ? item : item.id)) {
            this.getUpdateMethod(builder, field, 'add')(item)
          }
        }
      }

      if (operation === 'removeFromDidDocument') {
        for (const item of existingItems) {
          if (!this.isDidRootKeyId(typeof item === 'string' ? item : item.id)) {
            this.getUpdateMethod(builder, field, 'remove')(item)
          }
        }
      }
    }

    return builder
  }

  private getUpdateMethod(
    builder: DIDUpdateBuilder,
    field: string,
    action: 'add' | 'remove'
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ): (item: any) => DIDUpdateBuilder {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    type MethodDelegate = (item: any) => DIDUpdateBuilder

    const methodMap: Record<string, Record<'add' | 'remove', MethodDelegate>> = {
      service: {
        add: (item: Service) => builder.addService(item),
        remove: (id: string) => builder.removeService(id),
      },
      verificationMethod: {
        add: (item: VerificationMethod | string) => builder.addVerificationMethod(item),
        remove: (id: string) => builder.removeVerificationMethod(id),
      },
      assertionMethod: {
        add: (item: VerificationMethod | string) => builder.addAssertionMethod(item),
        remove: (id: string) => builder.removeAssertionMethod(id),
      },
      authentication: {
        add: (item: VerificationMethod | string) => builder.addAuthenticationMethod(item),
        remove: (id: string) => builder.removeAuthenticationMethod(id),
      },
      capabilityDelegation: {
        add: (item: VerificationMethod | string) => builder.addCapabilityDelegationMethod(item),
        remove: (id: string) => builder.removeCapabilityDelegationMethod(id),
      },
      capabilityInvocation: {
        add: (item: VerificationMethod | string) => builder.addCapabilityInvocationMethod(item),
        remove: (id: string) => builder.removeCapabilityInvocationMethod(id),
      },
      keyAgreement: {
        add: (item: VerificationMethod | string) => builder.addKeyAgreementMethod(item),
        remove: (id: string) => builder.removeKeyAgreementMethod(id),
      },
    }

    const fieldMethods = methodMap[field]
    if (!fieldMethods) {
      return () => builder
    }

    return fieldMethods[action]
  }

  private async getIssuerPrivateKey(agentContext: AgentContext, issuerId: string): Promise<PrivateKey> {
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    const didRecord = await didRepository.findCreatedDid(agentContext, issuerId)
    const rootKey = didRecord?.keys?.find((k) => k.didDocumentRelativeKeyId === DID_ROOT_KEY_ID)
    if (!rootKey?.kmsKeyId) {
      throw new Error('The root key not found in the KMS')
    }

    // @ts-ignore
    const keyManagementService = kms.getKms(agentContext) as AskarKeyManagementService
    // @ts-ignore
    const keyInfo = await keyManagementService.getKeyAsserted(agentContext, rootKey.kmsKeyId)

    return PrivateKey.fromBytesED25519(keyInfo.key.secretBytes)
  }
}
