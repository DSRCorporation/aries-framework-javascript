export type Service = {
  id: string
  type: string
  serviceEndpoint: { uri: string } | string
}

export type DidDocument = {
  '@context': string[]
  id: string
  controller: string[]
  verificationMethod: VerificationMethod[]
  authentication: VerificationRelationship[]
  assertionMethod: VerificationRelationship[]
  capabilityInvocation: VerificationRelationship[]
  capabilityDelegation: VerificationRelationship[]
  keyAgreement: VerificationRelationship[]
  service: Service[]
  alsoKnownAs: string[]
}

export type VerificationMethod = {
  id: string
  type: string
  controller: string
  publicKeyJwk?: string
  publicKeyMultibase?: string
}

export type VerificationRelationship = string | VerificationMethod
