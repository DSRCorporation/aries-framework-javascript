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
  DidDocumentKey,
  DidUpdateOptions,
  Kms,
  XOR,
  injectable, TypedArrayEncoder,
} from '@credo-ts/core'
import { KmsJwkPublicOkp } from '@credo-ts/core/src/modules/kms'
import { Client, PrivateKey } from '@hashgraph/sdk'
import { HederaAnoncredsRegistry } from '@hiero-did-sdk/anoncreds'
import { HederaClientService } from '@hiero-did-sdk/client'
import { HederaNetwork } from '@hiero-did-sdk/client/dist/index'
import {DIDResolution, Service, VerificationMethod} from '@hiero-did-sdk/core'
import {
  CreateDIDResult,
  DIDUpdateBuilder,
  DeactivateDIDResult,
  UpdateDIDResult,
  generateCreateDIDRequest,
  submitCreateDIDRequest,
} from '@hiero-did-sdk/registrar'
import { TopicReaderHederaHcs, resolveDID } from '@hiero-did-sdk/resolver'
import { HederaModuleConfig } from '../HederaModuleConfig'
import { CredoCache } from './cache/CredoCache'
import { KmsPublisher } from './publisher/KmsPublisher'

type DidOperationSecretOptions = {
  keys?: DidDocumentKey[]
} & XOR<{ createKey?: boolean }, { keyId?: string }>

export interface HederaDidCreateOptions extends DidCreateOptions {
  method: 'hedera'
  options?: {
    network?: HederaNetwork | string
  }
  secret: DidOperationSecretOptions
}

export interface HederaCreateDIDResult extends CreateDIDResult {
  keys: DidDocumentKey[]
}

export interface HederaDidUpdateOptions extends DidUpdateOptions {
  secret: DidOperationSecretOptions
}

export interface HederaDidDeactivateOptions extends DidDeactivateOptions {
  secret: DidOperationSecretOptions
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

      if (!props.secret.createKey && !props.secret.keyId) {
        throw new Error('createKey or keyId are required')
      }

      const kms = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

      let keyId: string
      const keys = props.secret.keys ?? []
      let publicJwk: KmsJwkPublicOkp & { crv: 'Ed25519' }
      if (props.secret.createKey) {
        const createKeyResult = await kms.createKey({
          type: {
            crv: 'Ed25519',
            kty: 'OKP',
          },
        })
        publicJwk = createKeyResult.publicJwk
        keys.push({
          kmsKeyId: createKeyResult.keyId,
          didDocumentRelativeKeyId: '#key',
        })
        keyId = createKeyResult.keyId
      } else {
        keyId = props.secret.keyId!
        const _publicJwk = await kms.getPublicKey({ keyId })
        if (!_publicJwk) {
          throw new Error(`Key with key id '${keyId}' not found`)
        }
        if (_publicJwk.kty !== 'OKP' || _publicJwk.crv !== 'Ed25519') {
          throw new Error(
              `Key with key id '${keyId}' uses unsupported ${Kms.getJwkHumanDescription(_publicJwk)} for did:hedera`
          )
        }
        publicJwk = {
          ..._publicJwk,
          crv: _publicJwk.crv,
        }
      }

      const publisher = await this.getPublisher(agentContext, client, keyId)

      const { state, signingRequest } = await generateCreateDIDRequest(
        {
          controller,
          multibasePublicKey: this.getMultibasePublicKey(publicJwk),
          topicReader,
        },
        {
          client,
          publisher,
        }
      )

      const signatureResult = await kms.sign({ keyId, data: signingRequest.serializedPayload, algorithm: 'EdDSA' })
      const createdDidDocumentResult = await submitCreateDIDRequest(
        { state, signature: signatureResult.signature, topicReader },
        {
          client,
          publisher,
        }
      )

      // if (didDocument) {
      //   const { didDocument: updatedDidDocument, keys: updatedKeys } = await this.updateDid(agentContext, {
      //     did: createdDidDocument.did,
      //     didDocumentOperation: 'setDidDocument',
      //     didDocument: didDocument,
      //     options: { ...options },
      //     secret: { ...secret },
      //   })
      //   return {
      //     did: createdDidDocument.did,
      //     didDocument: updatedDidDocument,
      //     keys: updatedKeys
      //   }
      // }

      return {
        ...createdDidDocumentResult,
        keys,
      }
    })
  }

  public async updateDid(_agentContext: AgentContext, _props: HederaDidUpdateOptions): Promise<UpdateDIDResult> {
    throw new Error('ddd')
    //
    // const { did, didDocumentOperation, didDocument, secret } = props
    //
    // if (!didDocumentOperation) {
    //   throw new Error('DidDocumentOperation is required')
    // }
    //
    // const { network: networkName } = parseDID(did)
    // return this.clientService.withClient({ networkName }, async (client: Client) => {
    //   const topicReader = this.getHederaHcsTopicReader(agentContext)
    //
    //   const currentDidDocumentResolution = await resolveDID(
    //     did,
    //     'application/ld+json;profile="https://w3id.org/did-resolution"',
    //     { topicReader }
    //   )
    //   if (!currentDidDocumentResolution.didDocument) {
    //     throw new Error(`DID ${did} not found`)
    //   }
    //
    //   const didUpdates = this.prepareDidUpdates(
    //     currentDidDocumentResolution.didDocument,
    //     didDocument,
    //     didDocumentOperation
    //   )
    //
    //   const { states, signingRequests } = await generateUpdateDIDRequest(
    //     {
    //       did,
    //       updates: didUpdates.build(),
    //       topicReader,
    //     },
    //     {
    //       client,
    //     }
    //   )
    //
    //   const hederaSignKey =
    //     secret.key.hederaPrivateKey instanceof PrivateKey
    //       ? secret.key.hederaPrivateKey
    //       : PrivateKey.fromStringED25519(secret.key.hederaPrivateKey)
    //   const signatures = this.signRequests(signingRequests, hederaSignKey)
    //   return await submitUpdateDIDRequest(
    //     {
    //       states,
    //       signatures,
    //       topicReader,
    //     },
    //     {
    //       client,
    //     }
    //   )
    // })
  }

  public async deactivateDid(
    _agentContext: AgentContext,
    _props: HederaDidDeactivateOptions
  ): Promise<DeactivateDIDResult> {
    throw new Error('ddd')
    // const { did, secret } = props
    // const { network: networkName } = parseDID(props.did)
    // return this.clientService.withClient({ networkName }, async (client: Client) => {
    //   const topicReader = this.getHederaHcsTopicReader(agentContext)
    //   const { state, signingRequest } = await generateDeactivateDIDRequest(
    //     {
    //       did,
    //       topicReader,
    //     },
    //     {
    //       client,
    //     }
    //   )
    //   const hederaSignKey =
    //     secret.key.hederaPrivateKey instanceof PrivateKey
    //       ? secret.key.hederaPrivateKey
    //       : PrivateKey.fromStringED25519(secret.key.hederaPrivateKey)
    //   const signature = hederaSignKey.sign(signingRequest.serializedPayload)
    //   return await submitDeactivateDIDRequest(
    //     {
    //       state,
    //       signature,
    //       topicReader,
    //     },
    //     {
    //       client,
    //     }
    //   )
    // })
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

  // Private methods

  private getHederaHcsTopicReader(agentContext: AgentContext): TopicReaderHederaHcs {
    const cache = this.config.options.cache ?? new CredoCache(agentContext)
    return new TopicReaderHederaHcs({ ...this.config.options, cache })
  }

  private async getPublisher(agentContext: AgentContext, client: Client, keyId: string): Promise<KmsPublisher> {
    const publisher = new KmsPublisher(agentContext, client)
    await publisher.setKeyId(keyId)
    return publisher
  }

  private getHederaAnonCredsSdk(agentContext: AgentContext): HederaAnoncredsRegistry {
    const cache = this.config.options.cache ?? new CredoCache(agentContext)
    return new HederaAnoncredsRegistry({ ...this.config.options, cache })
  }

  private getMultibasePublicKey(publicJwk: KmsJwkPublicOkp & { crv: 'Ed25519' }): string {
    return `z${TypedArrayEncoder.toBase58(Uint8Array.from(TypedArrayEncoder.fromBase64(publicJwk.x)))}`
  }

  private getId(item: { id: string } | string): string {
    const id = typeof item === 'string' ? item : item.id
    return id.includes('#') ? `#${id.split('#').pop()}` : id
  }

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

  private signRequests(signingRequests: Record<string, any>, privateKey: PrivateKey): Record<string, Uint8Array> {
    return Object.entries(signingRequests).reduce((acc, [key, request]) => {
      return {
        ...acc,
        [key]: privateKey.sign(request.serializedPayload),
      }
    }, {})
  }

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

    fields.forEach((field) => {
      const { existingItems, newItems, missingItems } = this.getDiff(currentDoc[field], newDoc[field])

      if (operation === 'setDidDocument') {
        missingItems.forEach((item) => {
          this.getUpdateMethod(builder, field, 'remove')(this.getId(item))
        })
        newItems.forEach((item) => {
          this.getUpdateMethod(builder, field, 'add')(item)
        })
      }

      if (operation === 'addToDidDocument') {
        newItems.forEach((item) => {
          this.getUpdateMethod(builder, field, 'add')(item)
        })
      }

      if (operation === 'removeFromDidDocument') {
        existingItems.forEach((item) => {
          this.getUpdateMethod(builder, field, 'remove')(item)
        })
      }
    })

    return builder
  }

  private getUpdateMethod(
    builder: DIDUpdateBuilder,
    field: string,
    action: 'add' | 'remove'
  ): (item: any) => DIDUpdateBuilder {
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
}
