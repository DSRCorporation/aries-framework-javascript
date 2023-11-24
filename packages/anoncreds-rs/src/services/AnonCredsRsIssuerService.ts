import type {
  AnonCredsIssuerService,
  CreateCredentialDefinitionOptions,
  CreateCredentialOfferOptions,
  CreateCredentialOptions,
  CreateCredentialReturn,
  CreateSchemaOptions,
  AnonCredsCredentialOffer,
  AnonCredsSchema,
  AnonCredsCredentialDefinition,
  CreateCredentialDefinitionReturn,
  AnonCredsCredential,
} from '@aries-framework/anoncreds'
import type { AgentContext } from '@aries-framework/core'
import type { CredentialDefinitionPrivate, JsonObject, KeyCorrectnessProof } from '@hyperledger/anoncreds-shared'

import {
  parseIndyDid,
  getUnqualifiedSchemaId,
  parseIndySchemaId,
  isUnqualifiedCredentialDefinitionId,
  AnonCredsKeyCorrectnessProofRepository,
  AnonCredsCredentialDefinitionPrivateRepository,
  AnonCredsCredentialDefinitionRepository,
} from '@aries-framework/anoncreds'
import { injectable, AriesFrameworkError } from '@aries-framework/core'
import {
  Credential,
  W3CCredential,
  CredentialDefinition,
  W3CCredentialOffer,
  Schema,
} from '@hyperledger/anoncreds-shared'

import { AnonCredsRsError } from '../errors/AnonCredsRsError'

@injectable()
export class AnonCredsRsIssuerService implements AnonCredsIssuerService {
  public async createSchema(agentContext: AgentContext, options: CreateSchemaOptions): Promise<AnonCredsSchema> {
    const { issuerId, name, version, attrNames: attributeNames } = options

    let schema: Schema | undefined
    try {
      const schema = Schema.create({
        issuerId,
        name,
        version,
        attributeNames,
      })

      return schema.toJson() as unknown as AnonCredsSchema
    } finally {
      schema?.handle.clear()
    }
  }

  public async createCredentialDefinition(
    agentContext: AgentContext,
    options: CreateCredentialDefinitionOptions
  ): Promise<CreateCredentialDefinitionReturn> {
    const { tag, supportRevocation, schema, issuerId, schemaId } = options

    let createReturnObj:
      | {
          credentialDefinition: CredentialDefinition
          credentialDefinitionPrivate: CredentialDefinitionPrivate
          keyCorrectnessProof: KeyCorrectnessProof
        }
      | undefined
    try {
      createReturnObj = CredentialDefinition.create({
        schema: schema as unknown as JsonObject,
        issuerId,
        schemaId,
        tag,
        supportRevocation,
        signatureType: 'CL',
      })

      return {
        credentialDefinition: createReturnObj.credentialDefinition.toJson() as unknown as AnonCredsCredentialDefinition,
        credentialDefinitionPrivate: createReturnObj.credentialDefinitionPrivate.toJson(),
        keyCorrectnessProof: createReturnObj.keyCorrectnessProof.toJson(),
      }
    } finally {
      createReturnObj?.credentialDefinition.handle.clear()
      createReturnObj?.credentialDefinitionPrivate.handle.clear()
      createReturnObj?.keyCorrectnessProof.handle.clear()
    }
  }

  public async createCredentialOffer(
    agentContext: AgentContext,
    options: CreateCredentialOfferOptions
  ): Promise<AnonCredsCredentialOffer> {
    const { credentialDefinitionId } = options

    let credentialOffer: W3CCredentialOffer | undefined
    try {
      // The getByCredentialDefinitionId supports both qualified and unqualified identifiers, even though the
      // record is always stored using the qualified identifier.
      const credentialDefinitionRecord = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialDefinitionRepository)
        .getByCredentialDefinitionId(agentContext, options.credentialDefinitionId)

      // We fetch the keyCorrectnessProof based on the credential definition record id, as the
      // credential definition id passed to this module could be unqualified, and the key correctness
      // proof is only stored using the qualified identifier.
      const keyCorrectnessProofRecord = await agentContext.dependencyManager
        .resolve(AnonCredsKeyCorrectnessProofRepository)
        .getByCredentialDefinitionId(agentContext, credentialDefinitionRecord.credentialDefinitionId)

      if (!credentialDefinitionRecord) {
        throw new AnonCredsRsError(`Credential Definition ${credentialDefinitionId} not found`)
      }

      let schemaId = credentialDefinitionRecord.credentialDefinition.schemaId

      // if the credentialDefinitionId is not qualified, we need to transform the schemaId to also be unqualified
      if (isUnqualifiedCredentialDefinitionId(options.credentialDefinitionId)) {
        const { namespaceIdentifier, schemaName, schemaVersion } = parseIndySchemaId(schemaId)
        schemaId = getUnqualifiedSchemaId(namespaceIdentifier, schemaName, schemaVersion)
      }

      credentialOffer = W3CCredentialOffer.create({
        credentialDefinitionId,
        keyCorrectnessProof: keyCorrectnessProofRecord?.value,
        schemaId,
      })

      return credentialOffer.toJson() as unknown as AnonCredsCredentialOffer
    } finally {
      credentialOffer?.handle.clear()
    }
  }

  public async createCredential(
    agentContext: AgentContext,
    options: CreateCredentialOptions
  ): Promise<CreateCredentialReturn> {
    if (options.credentialRequest.isW3C) {
      return this.createCredentialW3c(agentContext, options)
    } else {
      return this.createCredentialLegacy(agentContext, options)
    }
  }

  public async createCredentialLegacy(
    agentContext: AgentContext,
    options: CreateCredentialOptions
  ): Promise<CreateCredentialReturn> {
    const { tailsFilePath, credentialOffer, credentialRequest, credentialValues, revocationRegistryId } = options

    let credential: Credential | undefined
    try {
      if (revocationRegistryId || tailsFilePath) {
        throw new AriesFrameworkError('Revocation not supported yet')
      }

      const attributeRawValues: Record<string, string> = {}
      const attributeEncodedValues: Record<string, string> = {}

      Object.keys(credentialValues).forEach((key) => {
        attributeRawValues[key] = credentialValues[key].raw
        attributeEncodedValues[key] = credentialValues[key].encoded
      })

      const credentialDefinitionRecord = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialDefinitionRepository)
        .getByCredentialDefinitionId(agentContext, options.credentialRequest.cred_def_id)

      // We fetch the private record based on the cred def id from the cred def record, as the
      // credential definition id passed to this module could be unqualified, and the private record
      // is only stored using the qualified identifier.
      const credentialDefinitionPrivateRecord = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialDefinitionPrivateRepository)
        .getByCredentialDefinitionId(agentContext, credentialDefinitionRecord.credentialDefinitionId)

      let credentialDefinition = credentialDefinitionRecord.credentialDefinition

      if (isUnqualifiedCredentialDefinitionId(options.credentialRequest.cred_def_id)) {
        const { namespaceIdentifier, schemaName, schemaVersion } = parseIndySchemaId(credentialDefinition.schemaId)
        const { namespaceIdentifier: unqualifiedDid } = parseIndyDid(credentialDefinition.issuerId)
        parseIndyDid
        credentialDefinition = {
          ...credentialDefinition,
          schemaId: getUnqualifiedSchemaId(namespaceIdentifier, schemaName, schemaVersion),
          issuerId: unqualifiedDid,
        }
      }

      credential = Credential.create({
        credentialDefinition: credentialDefinitionRecord.credentialDefinition as unknown as JsonObject,
        credentialOffer: credentialOffer as unknown as JsonObject,
        credentialRequest: credentialRequest as unknown as JsonObject,
        revocationRegistryId,
        // attributeEncodedValues,
        attributeRawValues,
        credentialDefinitionPrivate: credentialDefinitionPrivateRecord.value,
      })

      return {
        credential: credential.toJson() as unknown as AnonCredsCredential,
        credentialRevocationId: credential.revocationRegistryIndex?.toString(),
      }
    } finally {
      credential?.handle.clear()
    }
  }

  public async createCredentialW3c(
    agentContext: AgentContext,
    options: CreateCredentialOptions
  ): Promise<CreateCredentialReturn> {
    const { tailsFilePath, credentialOffer, credentialRequest, credentialValues, revocationRegistryId } = options

    let credential: W3CCredential | undefined
    try {
      if (revocationRegistryId || tailsFilePath) {
        throw new AriesFrameworkError('Revocation not supported yet')
      }

      const attributeRawValues: Record<string, string> = {}
      const attributeEncodedValues: Record<string, string> = {}

      Object.keys(credentialValues).forEach((key) => {
        attributeRawValues[key] = credentialValues[key].raw
        attributeEncodedValues[key] = credentialValues[key].encoded
      })

      const credentialDefinitionRecord = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialDefinitionRepository)
        .getByCredentialDefinitionId(agentContext, options.credentialRequest.cred_def_id)

      // We fetch the private record based on the cred def id from the cred def record, as the
      // credential definition id passed to this module could be unqualified, and the private record
      // is only stored using the qualified identifier.
      const credentialDefinitionPrivateRecord = await agentContext.dependencyManager
        .resolve(AnonCredsCredentialDefinitionPrivateRepository)
        .getByCredentialDefinitionId(agentContext, credentialDefinitionRecord.credentialDefinitionId)

      let credentialDefinition = credentialDefinitionRecord.credentialDefinition

      if (isUnqualifiedCredentialDefinitionId(options.credentialRequest.cred_def_id)) {
        const { namespaceIdentifier, schemaName, schemaVersion } = parseIndySchemaId(credentialDefinition.schemaId)
        const { namespaceIdentifier: unqualifiedDid } = parseIndyDid(credentialDefinition.issuerId)
        parseIndyDid
        credentialDefinition = {
          ...credentialDefinition,
          schemaId: getUnqualifiedSchemaId(namespaceIdentifier, schemaName, schemaVersion),
          issuerId: unqualifiedDid,
        }
      }

      credential = W3CCredential.create({
        credentialDefinition: credentialDefinitionRecord.credentialDefinition as unknown as JsonObject,
        credentialOffer: credentialOffer as unknown as JsonObject,
        credentialRequest: credentialRequest as unknown as JsonObject,
        revocationRegistryId,
        // attributeEncodedValues,
        attributeRawValues,
        credentialDefinitionPrivate: credentialDefinitionPrivateRecord.value,
      })

      return {
        credential: credential.toJson() as unknown as AnonCredsCredential,
        credentialRevocationId: credential.revocationRegistryIndex?.toString(),
      }
    } finally {
      credential?.handle.clear()
    }
  }
}
