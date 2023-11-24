import { AnonCredsCredentialDefinition, AnonCredsSchema } from '@aries-framework/anoncreds'

export function buildSchemaId(schema: AnonCredsSchema): string {
  return `${schema.issuerId}/anoncreds/v0/SCHEMA/${schema.name}/${schema.version}`
}

export function buildCredentialDefinitionId(credentialDefinition: AnonCredsCredentialDefinition): string {
  return `${credentialDefinition.issuerId}/anoncreds/v0/CLAIM_DEF/${credentialDefinition.schemaId}/${credentialDefinition.tag}`
}
