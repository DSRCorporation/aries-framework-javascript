import type {
  AnonCredsCredential,
  AnonCredsCredentialInfo,
  AnonCredsCredentialRequest,
  AnonCredsCredentialRequestMetadata,
  AnonCredsHolderService,
  AnonCredsProof,
  AnonCredsProofRequestRestriction,
  AnonCredsRequestedAttributeMatch,
  AnonCredsRequestedPredicateMatch,
  AnonCredsW3CCredential,
  CreateCredentialRequestOptions,
  CreateCredentialRequestReturn,
  CreateLinkSecretOptions,
  CreateLinkSecretReturn,
  CreateProofOptions,
  GetCredentialOptions,
  GetCredentialsForProofRequestOptions,
  GetCredentialsForProofRequestReturn,
  GetCredentialsOptions,
  StoreCredentialOptions,
} from '@aries-framework/anoncreds'
import type { AgentContext, Query, SimpleQuery } from '@aries-framework/core'
import type { CredentialEntry } from '@hyperledger/anoncreds-nodejs'
import type {
  CredentialProve,
  CredentialRequestMetadata,
  JsonObject,
  W3CCredentialEntry,
} from '@hyperledger/anoncreds-shared'

import {
  AnonCredsLinkSecretRepository,
  AnonCredsRegistryService,
  AnonCredsRestrictionWrapper,
  AnonCredsW3CCredentialRecord,
  AnonCredsW3CCredentialRepository,
  storeLinkSecret,
  unqualifiedCredentialDefinitionIdRegex,
} from '@aries-framework/anoncreds'
import { AnonCredsCredentialRecord } from '@aries-framework/anoncreds/src/repository/AnonCredsCredentialRecord'
import { AnonCredsCredentialRepository } from '@aries-framework/anoncreds/src/repository/AnonCredsCredentialRepository'
import { AriesFrameworkError, injectable, JsonTransformer, TypedArrayEncoder, utils } from '@aries-framework/core'
import { CredentialRequest } from '@hyperledger/anoncreds-nodejs'
import {
  anoncreds,
  CredentialRevocationState,
  LinkSecret,
  Presentation,
  RevocationRegistryDefinition,
  RevocationStatusList,
  W3CCredential,
  W3CCredentialRequest,
  W3CPresentation,
} from '@hyperledger/anoncreds-shared'
import * as console from 'console'

import { AnonCredsRsModuleConfig } from '../AnonCredsRsModuleConfig'
import { AnonCredsRsError } from '../errors/AnonCredsRsError'

@injectable()
export class AnonCredsRsHolderService implements AnonCredsHolderService {
  public async createLinkSecret(
    agentContext: AgentContext,
    options?: CreateLinkSecretOptions
  ): Promise<CreateLinkSecretReturn> {
    return {
      linkSecretId: options?.linkSecretId ?? utils.uuid(),
      linkSecretValue: LinkSecret.create(),
    }
  }

  public async createProof(agentContext: AgentContext, options: CreateProofOptions): Promise<AnonCredsProof> {
    const { proofRequest } = options
    if (proofRequest.isW3C) {
      return this.createProofW3C(agentContext, options)
    } else {
      return this.createProofLegacy(agentContext, options)
    }
  }
  public async createProofW3C(agentContext: AgentContext, options: CreateProofOptions): Promise<AnonCredsProof> {
    const { credentialDefinitions, proofRequest, selectedCredentials, schemas } = options

    let presentation: W3CPresentation | undefined
    try {
      const rsCredentialDefinitions: Record<string, JsonObject> = {}
      for (const credDefId in credentialDefinitions) {
        rsCredentialDefinitions[credDefId] = credentialDefinitions[credDefId] as unknown as JsonObject
      }

      const rsSchemas: Record<string, JsonObject> = {}
      for (const schemaId in schemas) {
        rsSchemas[schemaId] = schemas[schemaId] as unknown as JsonObject
      }
      const credentialRepository = agentContext.dependencyManager.resolve(AnonCredsW3CCredentialRepository)

      // Cache retrieved credentials in order to minimize storage calls
      const retrievedCredentials = new Map<string, AnonCredsW3CCredentialRecord>()

      const credentialEntryFromAttribute = async (
        attribute: AnonCredsRequestedAttributeMatch | AnonCredsRequestedPredicateMatch
      ): Promise<{ linkSecretId: string; credentialEntry: W3CCredentialEntry }> => {
        let credentialRecord = retrievedCredentials.get(attribute.credentialId)
        if (!credentialRecord) {
          credentialRecord = await credentialRepository.getByCredentialId(agentContext, attribute.credentialId)
          retrievedCredentials.set(attribute.credentialId, credentialRecord)
        }

        // @ts-ignore
        const revocationRegistryDefinitionId = credentialRecord.credential.credentialStatus?.id
        const revocationRegistryIndex = credentialRecord.credentialRevocationId

        // TODO: Check if credential has a revocation registry id (check response from anoncreds-rs API, as it is
        // sending back a mandatory string in Credential.revocationRegistryId)
        const timestamp = attribute.timestamp

        let revocationState: CredentialRevocationState | undefined
        let revocationRegistryDefinition: RevocationRegistryDefinition | undefined
        try {
          if (timestamp && revocationRegistryIndex && revocationRegistryDefinitionId) {
            if (!options.revocationRegistries[revocationRegistryDefinitionId]) {
              throw new AnonCredsRsError(`Revocation Registry ${revocationRegistryDefinitionId} not found`)
            }

            const { definition, revocationStatusLists, tailsFilePath } =
              options.revocationRegistries[revocationRegistryDefinitionId]

            // Extract revocation status list for the given timestamp
            const revocationStatusList = revocationStatusLists[timestamp]
            if (!revocationStatusList) {
              throw new AriesFrameworkError(
                `Revocation status list for revocation registry ${revocationRegistryDefinitionId} and timestamp ${timestamp} not found in revocation status lists. All revocation status lists must be present.`
              )
            }

            revocationRegistryDefinition = RevocationRegistryDefinition.fromJson(definition as unknown as JsonObject)
            revocationState = CredentialRevocationState.create({
              revocationRegistryIndex: Number(revocationRegistryIndex),
              revocationRegistryDefinition,
              tailsPath: tailsFilePath,
              revocationStatusList: RevocationStatusList.fromJson(revocationStatusList as unknown as JsonObject),
            })
          }
          return {
            linkSecretId: credentialRecord.linkSecretId,
            credentialEntry: {
              credential: credentialRecord.credential as unknown as JsonObject,
              revocationState: revocationState?.toJson(),
              timestamp,
            },
          }
        } finally {
          revocationState?.handle.clear()
          revocationRegistryDefinition?.handle.clear()
        }
      }

      const credentialsProve: CredentialProve[] = []
      const credentials: { linkSecretId: string; credentialEntry: W3CCredentialEntry }[] = []

      let entryIndex = 0
      for (const referent in selectedCredentials.attributes) {
        const attribute = selectedCredentials.attributes[referent]
        credentials.push(await credentialEntryFromAttribute(attribute))
        credentialsProve.push({ entryIndex, isPredicate: false, referent, reveal: attribute.revealed })
        entryIndex = entryIndex + 1
      }

      for (const referent in selectedCredentials.predicates) {
        const predicate = selectedCredentials.predicates[referent]
        credentials.push(await credentialEntryFromAttribute(predicate))
        credentialsProve.push({ entryIndex, isPredicate: true, referent, reveal: true })
        entryIndex = entryIndex + 1
      }

      // Get all requested credentials and take linkSecret. If it's not the same for every credential, throw error
      const linkSecretsMatch = credentials.every((item) => item.linkSecretId === credentials[0].linkSecretId)
      if (!linkSecretsMatch) {
        throw new AnonCredsRsError('All credentials in a Proof should have been issued using the same Link Secret')
      }

      const linkSecretRecord = await agentContext.dependencyManager
        .resolve(AnonCredsLinkSecretRepository)
        .getByLinkSecretId(agentContext, credentials[0].linkSecretId)

      if (!linkSecretRecord.value) {
        throw new AnonCredsRsError('Link Secret value not stored')
      }

      presentation = W3CPresentation.create({
        credentialDefinitions: rsCredentialDefinitions,
        schemas: rsSchemas,
        presentationRequest: proofRequest as unknown as JsonObject,
        credentials: credentials.map((entry) => entry.credentialEntry),
        credentialsProve,
        // selfAttest: selectedCredentials.selfAttestedAttributes,
        linkSecret: linkSecretRecord.value,
      })
      console.log('\n------------Created presentation in W3C format------------')
      console.dir(presentation.toJson(), { depth: null })
      console.log('------------------------------------------------------\n')

      return presentation.toJson() as unknown as AnonCredsProof
    } finally {
      presentation?.handle.clear()
    }
  }
  public async createProofLegacy(agentContext: AgentContext, options: CreateProofOptions): Promise<AnonCredsProof> {
    const { credentialDefinitions, proofRequest, selectedCredentials, schemas } = options

    let presentation: Presentation | undefined
    try {
      const rsCredentialDefinitions: Record<string, JsonObject> = {}
      for (const credDefId in credentialDefinitions) {
        rsCredentialDefinitions[credDefId] = credentialDefinitions[credDefId] as unknown as JsonObject
      }

      const rsSchemas: Record<string, JsonObject> = {}
      for (const schemaId in schemas) {
        rsSchemas[schemaId] = schemas[schemaId] as unknown as JsonObject
      }
      const credentialRepository = agentContext.dependencyManager.resolve(AnonCredsCredentialRepository)

      // Cache retrieved credentials in order to minimize storage calls
      const retrievedCredentials = new Map<string, AnonCredsCredentialRecord>()

      const credentialEntryFromAttribute = async (
        attribute: AnonCredsRequestedAttributeMatch | AnonCredsRequestedPredicateMatch
      ): Promise<{ linkSecretId: string; credentialEntry: CredentialEntry }> => {
        let credentialRecord = retrievedCredentials.get(attribute.credentialId)
        if (!credentialRecord) {
          credentialRecord = await credentialRepository.getByCredentialId(agentContext, attribute.credentialId)
          retrievedCredentials.set(attribute.credentialId, credentialRecord)
        }

        const revocationRegistryDefinitionId = credentialRecord.credential.rev_reg_id
        const revocationRegistryIndex = credentialRecord.credentialRevocationId

        // TODO: Check if credential has a revocation registry id (check response from anoncreds-rs API, as it is
        // sending back a mandatory string in Credential.revocationRegistryId)
        const timestamp = attribute.timestamp

        let revocationState: CredentialRevocationState | undefined
        let revocationRegistryDefinition: RevocationRegistryDefinition | undefined
        try {
          if (timestamp && revocationRegistryIndex && revocationRegistryDefinitionId) {
            if (!options.revocationRegistries[revocationRegistryDefinitionId]) {
              throw new AnonCredsRsError(`Revocation Registry ${revocationRegistryDefinitionId} not found`)
            }

            const { definition, revocationStatusLists, tailsFilePath } =
              options.revocationRegistries[revocationRegistryDefinitionId]

            // Extract revocation status list for the given timestamp
            const revocationStatusList = revocationStatusLists[timestamp]
            if (!revocationStatusList) {
              throw new AriesFrameworkError(
                `Revocation status list for revocation registry ${revocationRegistryDefinitionId} and timestamp ${timestamp} not found in revocation status lists. All revocation status lists must be present.`
              )
            }

            revocationRegistryDefinition = RevocationRegistryDefinition.fromJson(definition as unknown as JsonObject)
            revocationState = CredentialRevocationState.create({
              revocationRegistryIndex: Number(revocationRegistryIndex),
              revocationRegistryDefinition,
              tailsPath: tailsFilePath,
              revocationStatusList: RevocationStatusList.fromJson(revocationStatusList as unknown as JsonObject),
            })
          }
          return {
            linkSecretId: credentialRecord.linkSecretId,
            credentialEntry: {
              credential: credentialRecord.credential as unknown as JsonObject,
              revocationState: revocationState?.toJson(),
              timestamp,
            },
          }
        } finally {
          revocationState?.handle.clear()
          revocationRegistryDefinition?.handle.clear()
        }
      }

      const credentialsProve: CredentialProve[] = []
      const credentials: { linkSecretId: string; credentialEntry: CredentialEntry }[] = []

      let entryIndex = 0
      for (const referent in selectedCredentials.attributes) {
        const attribute = selectedCredentials.attributes[referent]
        credentials.push(await credentialEntryFromAttribute(attribute))
        credentialsProve.push({ entryIndex, isPredicate: false, referent, reveal: attribute.revealed })
        entryIndex = entryIndex + 1
      }

      for (const referent in selectedCredentials.predicates) {
        const predicate = selectedCredentials.predicates[referent]
        credentials.push(await credentialEntryFromAttribute(predicate))
        credentialsProve.push({ entryIndex, isPredicate: true, referent, reveal: true })
        entryIndex = entryIndex + 1
      }

      // Get all requested credentials and take linkSecret. If it's not the same for every credential, throw error
      const linkSecretsMatch = credentials.every((item) => item.linkSecretId === credentials[0].linkSecretId)
      if (!linkSecretsMatch) {
        throw new AnonCredsRsError('All credentials in a Proof should have been issued using the same Link Secret')
      }

      const linkSecretRecord = await agentContext.dependencyManager
        .resolve(AnonCredsLinkSecretRepository)
        .getByLinkSecretId(agentContext, credentials[0].linkSecretId)

      if (!linkSecretRecord.value) {
        throw new AnonCredsRsError('Link Secret value not stored')
      }

      presentation = Presentation.create({
        credentialDefinitions: rsCredentialDefinitions,
        schemas: rsSchemas,
        presentationRequest: proofRequest as unknown as JsonObject,
        credentials: credentials.map((entry) => entry.credentialEntry as CredentialEntry),
        credentialsProve,
        selfAttest: selectedCredentials.selfAttestedAttributes,
        linkSecret: linkSecretRecord.value,
      })
      console.log('\n------------Created presentation in Old format------------')
      console.dir(presentation.toJson(), { depth: null })
      console.log('------------------------------------------------------\n')

      return presentation.toJson() as unknown as AnonCredsProof
    } finally {
      presentation?.handle.clear()
    }
  }

  public async createCredentialRequest(
    agentContext: AgentContext,
    options: CreateCredentialRequestOptions
  ): Promise<CreateCredentialRequestReturn> {
    const { useLegacyProverDid, credentialDefinition, credentialOffer } = options
    let createReturnObj:
      | {
          credentialRequest: W3CCredentialRequest | CredentialRequest
          credentialRequestMetadata: CredentialRequestMetadata
        }
      | undefined
    try {
      const linkSecretRepository = agentContext.dependencyManager.resolve(AnonCredsLinkSecretRepository)

      // If a link secret is specified, use it. Otherwise, attempt to use default link secret
      let linkSecretRecord = options.linkSecretId
        ? await linkSecretRepository.getByLinkSecretId(agentContext, options.linkSecretId)
        : await linkSecretRepository.findDefault(agentContext)

      // No default link secret. Automatically create one if set on module config
      if (!linkSecretRecord) {
        const moduleConfig = agentContext.dependencyManager.resolve(AnonCredsRsModuleConfig)
        if (!moduleConfig.autoCreateLinkSecret) {
          throw new AnonCredsRsError(
            'No link secret provided to createCredentialRequest and no default link secret has been found'
          )
        }
        const { linkSecretId, linkSecretValue } = await this.createLinkSecret(agentContext, {})
        linkSecretRecord = await storeLinkSecret(agentContext, { linkSecretId, linkSecretValue, setAsDefault: true })
      }

      if (!linkSecretRecord.value) {
        throw new AnonCredsRsError('Link Secret value not stored')
      }

      const isLegacyIdentifier = credentialOffer.cred_def_id.match(unqualifiedCredentialDefinitionIdRegex)
      if (!isLegacyIdentifier && useLegacyProverDid) {
        throw new AriesFrameworkError('Cannot use legacy prover_did with non-legacy identifiers')
      }

      if (options.isW3C) {
        createReturnObj = W3CCredentialRequest.create({
          entropy: !useLegacyProverDid || !isLegacyIdentifier ? anoncreds.generateNonce() : undefined,
          proverDid: useLegacyProverDid
            ? TypedArrayEncoder.toBase58(TypedArrayEncoder.fromString(anoncreds.generateNonce().slice(0, 16)))
            : undefined,
          credentialDefinition: credentialDefinition as unknown as JsonObject,
          credentialOffer: credentialOffer as unknown as JsonObject,
          linkSecret: linkSecretRecord.value,
          linkSecretId: linkSecretRecord.linkSecretId,
        })
      } else {
        createReturnObj = CredentialRequest.create({
          entropy: !useLegacyProverDid || !isLegacyIdentifier ? anoncreds.generateNonce() : undefined,
          proverDid: useLegacyProverDid
            ? TypedArrayEncoder.toBase58(TypedArrayEncoder.fromString(anoncreds.generateNonce().slice(0, 16)))
            : undefined,
          credentialDefinition: credentialDefinition as unknown as JsonObject,
          credentialOffer: credentialOffer as unknown as JsonObject,
          linkSecret: linkSecretRecord.value,
          linkSecretId: linkSecretRecord.linkSecretId,
        })
      }
      const credRequest = createReturnObj.credentialRequest.toJson() as unknown as AnonCredsCredentialRequest

      return {
        credentialRequest: credRequest,
        credentialRequestMetadata:
          createReturnObj.credentialRequestMetadata.toJson() as unknown as AnonCredsCredentialRequestMetadata,
      }
    } finally {
      createReturnObj?.credentialRequest.handle.clear()
      createReturnObj?.credentialRequestMetadata.handle.clear()
    }
  }

  public async storeCredential(agentContext: AgentContext, options: StoreCredentialOptions): Promise<string> {
    const { credential, credentialDefinition, credentialRequestMetadata, revocationRegistry, schema } = options

    const linkSecretRecord = await agentContext.dependencyManager
      .resolve(AnonCredsLinkSecretRepository)
      .getByLinkSecretId(agentContext, credentialRequestMetadata.link_secret_name)

    if (!linkSecretRecord.value) {
      throw new AnonCredsRsError('Link Secret value not stored')
    }

    const revocationRegistryDefinition = revocationRegistry?.definition as unknown as JsonObject

    const credentialId = options.credentialId ?? utils.uuid()

    let credentialObj: W3CCredential | undefined
    let processedCredential: W3CCredential | undefined
    try {
      credentialObj = W3CCredential.fromJson(credential as unknown as JsonObject)
      processedCredential = credentialObj.process({
        credentialDefinition: credentialDefinition as unknown as JsonObject,
        credentialRequestMetadata: credentialRequestMetadata as unknown as JsonObject,
        linkSecret: linkSecretRecord.value,
        revocationRegistryDefinition,
      })

      const credentialW3CRepository = agentContext.dependencyManager.resolve(AnonCredsW3CCredentialRepository)

      const methodName = agentContext.dependencyManager
        .resolve(AnonCredsRegistryService)
        .getRegistryForIdentifier(agentContext, credential.credentialSchema.definition).methodName

      await credentialW3CRepository.save(
        agentContext,
        new AnonCredsW3CCredentialRecord({
          credential: processedCredential.toJson() as unknown as AnonCredsW3CCredential,
          credentialId,
          linkSecretId: linkSecretRecord.linkSecretId,
          issuerId: options.credentialDefinition.issuerId,
          schemaName: schema.name,
          schemaIssuerId: schema.issuerId,
          schemaVersion: schema.version,
          credentialRevocationId: processedCredential.revocationRegistryIndex?.toString(),
          methodName,
        })
      )

      console.log('\n------------Saved credential in W3C format------------')
      console.log(processedCredential.toJson())
      console.log('------------------------------------------------------\n')

      const credentialRepository = agentContext.dependencyManager.resolve(AnonCredsCredentialRepository)

      await credentialRepository.save(
        agentContext,
        new AnonCredsCredentialRecord({
          credential: processedCredential.toLegacy().toJson() as unknown as AnonCredsCredential,
          credentialId: options.credentialId ?? utils.uuid(),
          linkSecretId: linkSecretRecord.linkSecretId,
          issuerId: options.credentialDefinition.issuerId,
          schemaName: schema.name,
          schemaIssuerId: schema.issuerId,
          schemaVersion: schema.version,
          credentialRevocationId: processedCredential.revocationRegistryIndex?.toString(),
          methodName,
        })
      )

      console.log('\n------------Saved credential in Old format------------')
      console.log(processedCredential.toLegacy().toJson())
      console.log('------------------------------------------------------\n')

      return credentialId
    } finally {
      credentialObj?.handle.clear()
      processedCredential?.handle.clear()
    }
  }

  public async getCredential(
    agentContext: AgentContext,
    options: GetCredentialOptions
  ): Promise<AnonCredsCredentialInfo> {
    let credInfo: AnonCredsCredentialInfo

    if (options.isLegacy) {
      const credentialRecord = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialRepository)
        .getByCredentialId(agentContext, options.credentialId)

      credInfo = this.createAnonCredsCredentialInfo(credentialRecord)
    } else {
      const credentialRecord = await agentContext.dependencyManager
        .resolve(AnonCredsW3CCredentialRepository)
        .getByCredentialId(agentContext, options.credentialId)

      credInfo = this.createAnonCredsCredentialInfoW3C(credentialRecord)
    }

    return credInfo
  }
  private createAnonCredsCredentialInfoW3C(credentialRecord: AnonCredsW3CCredentialRecord): AnonCredsCredentialInfo {
    const cred = credentialRecord.credential
    const credId = credentialRecord.credentialId
    const methodName = credentialRecord.methodName
    const credDef = cred.credentialSchema.definition
    const schema = cred.credentialSchema.schema
    const revRegId = cred.credentialStatus?.id
    const revId = credentialRecord.credentialRevocationId
    const attributes: { [key: string]: string } = {}

    for (const [key, value] of Object.entries(credentialRecord.credential.credentialSubject)) {
      attributes[key] = value
    }
    return {
      attributes,
      credentialDefinitionId: credDef,
      credentialId: credId,
      schemaId: schema,
      credentialRevocationId: revId,
      revocationRegistryId: revRegId,
      methodName: methodName,
    }
  }
  private createAnonCredsCredentialInfo(credentialRecord: AnonCredsCredentialRecord): AnonCredsCredentialInfo {
    const credId = credentialRecord.credentialId
    const methodName = credentialRecord.methodName
    const credDef = credentialRecord.credential.cred_def_id
    const schema = credentialRecord.credential.schema_id
    const revId = credentialRecord.credentialRevocationId
    const revRegId = credentialRecord.credential.rev_reg_id
    const attributes: { [key: string]: string } = {}

    for (const attribute in credentialRecord.credential.values) {
      attributes[attribute] = credentialRecord.credential.values[attribute].raw
    }

    for (const attribute in credentialRecord.credential.values) {
      attributes[attribute] = credentialRecord.credential.values[attribute].raw
    }
    return {
      attributes,
      credentialDefinitionId: credDef,
      credentialId: credId,
      schemaId: schema,
      credentialRevocationId: revId,
      revocationRegistryId: revRegId,
      methodName: methodName,
    }
  }

  public async getCredentials(
    agentContext: AgentContext,
    options: GetCredentialsOptions
  ): Promise<AnonCredsCredentialInfo[]> {
    const credentialRecords = await agentContext.dependencyManager
      .resolve(AnonCredsW3CCredentialRepository)
      .findByQuery(agentContext, {
        credentialDefinitionId: options.credentialDefinitionId,
        schemaId: options.schemaId,
        issuerId: options.issuerId,
        schemaName: options.schemaName,
        schemaVersion: options.schemaVersion,
        schemaIssuerId: options.schemaIssuerId,
        methodName: options.methodName,
      })

    return credentialRecords.map((credentialRecord) => {
      const cred = credentialRecord.credential
      return {
        attributes: Object.fromEntries(Object.entries(cred.credentialSubject).map(([key, value]) => [key, value])),
        credentialDefinitionId: cred.credentialSchema.definition,
        credentialId: credentialRecord.credentialId,
        schemaId: cred.credentialSchema.schema,
        credentialRevocationId: credentialRecord.credentialRevocationId,
        revocationRegistryId: cred.credentialStatus?.id,
        methodName: credentialRecord.methodName,
      }
    })
  }

  public async deleteCredential(agentContext: AgentContext, credentialId: string): Promise<void> {
    const credentialRepository = agentContext.dependencyManager.resolve(AnonCredsW3CCredentialRepository)
    const credentialRecord = await credentialRepository.getByCredentialId(agentContext, credentialId)
    await credentialRepository.delete(agentContext, credentialRecord)
  }

  public async getCredentialsForProofRequest(
    agentContext: AgentContext,
    options: GetCredentialsForProofRequestOptions
  ): Promise<GetCredentialsForProofRequestReturn> {
    const proofRequest = options.proofRequest
    const referent = options.attributeReferent

    const requestedAttribute =
      proofRequest.requested_attributes[referent] ?? proofRequest.requested_predicates[referent]

    if (!requestedAttribute) {
      throw new AnonCredsRsError(`Referent not found in proof request`)
    }

    const $and = []

    // Make sure the attribute(s) that are requested are present using the marker tag
    const attributes = requestedAttribute.names ?? [requestedAttribute.name]
    const attributeQuery: SimpleQuery<AnonCredsW3CCredentialRecord | AnonCredsCredentialRecord> = {}
    for (const attribute of attributes) {
      attributeQuery[`attr::${attribute}::marker`] = true
    }
    $and.push(attributeQuery)

    // Add query for proof request restrictions
    if (requestedAttribute.restrictions) {
      const restrictionQuery = this.queryFromRestrictions(requestedAttribute.restrictions)
      $and.push(restrictionQuery)
    }

    // Add extra query
    // TODO: we're not really typing the extraQuery, and it will work differently based on the anoncreds implmentation
    // We should make the allowed properties more strict
    if (options.extraQuery) {
      $and.push(options.extraQuery)
    }

    if (proofRequest?.isW3C) {
      let credentials = await agentContext.dependencyManager
        .resolve(AnonCredsW3CCredentialRepository)
        .findByQuery(agentContext, { $and })

      credentials = credentials.filter((value) => value.type == AnonCredsW3CCredentialRecord.type)

      return credentials.map((credentialRecord) => {
        return {
          credentialInfo: this.createAnonCredsCredentialInfoW3C(credentialRecord),
          interval: proofRequest.non_revoked,
        }
      })
    } else {
      let credentials = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialRepository)
        .findByQuery(agentContext, { $and })

      credentials = credentials.filter((value) => value.type == AnonCredsCredentialRecord.type)

      return credentials.map((credentialRecord) => {
        return {
          credentialInfo: this.createAnonCredsCredentialInfo(credentialRecord),
          interval: proofRequest.non_revoked,
        }
      })
    }
  }

  private queryFromRestrictions(restrictions: AnonCredsProofRequestRestriction[]) {
    const query: Query<AnonCredsW3CCredentialRecord | AnonCredsCredentialRecord>[] = []

    const { restrictions: parsedRestrictions } = JsonTransformer.fromJSON({ restrictions }, AnonCredsRestrictionWrapper)

    for (const restriction of parsedRestrictions) {
      const queryElements: SimpleQuery<AnonCredsW3CCredentialRecord> = {}

      if (restriction.credentialDefinitionId) {
        queryElements.credentialDefinitionId = restriction.credentialDefinitionId
      }

      if (restriction.issuerId || restriction.issuerDid) {
        queryElements.issuerId = restriction.issuerId ?? restriction.issuerDid
      }

      if (restriction.schemaId) {
        queryElements.schemaId = restriction.schemaId
      }

      if (restriction.schemaIssuerId || restriction.schemaIssuerDid) {
        queryElements.schemaIssuerId = restriction.schemaIssuerId ?? restriction.issuerDid
      }

      if (restriction.schemaName) {
        queryElements.schemaName = restriction.schemaName
      }

      if (restriction.schemaVersion) {
        queryElements.schemaVersion = restriction.schemaVersion
      }

      for (const [attributeName, attributeValue] of Object.entries(restriction.attributeValues)) {
        queryElements[`attr::${attributeName}::value`] = attributeValue
      }

      for (const [attributeName, isAvailable] of Object.entries(restriction.attributeMarkers)) {
        if (isAvailable) {
          queryElements[`attr::${attributeName}::marker`] = isAvailable
        }
      }

      query.push(queryElements)
    }

    return query.length === 1 ? query[0] : { $or: query }
  }
}
