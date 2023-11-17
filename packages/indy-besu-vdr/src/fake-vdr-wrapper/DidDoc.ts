// Indy-Besu VDR DID data

type StringOrVector = string | string[]

export interface DidDocumentWithMetadata {
  document: DidDocument
  metadata: DidMetadata
}

interface DidMetadata {
  creatorAddress: string
  created: bigint
  updated: bigint
  deactivated: boolean
}

export interface VerificationMethod {
  id: string
  type: VerificationKeyType
  controller: string
  verification_key: VerificationKey
}

type VerificationMethodOrReference = VerificationMethod | string

interface Service {}

export interface DidDocument {
  context: StringOrVector
  id: string
  controller: StringOrVector
  verificationMethod: VerificationMethod[]
  authentication: VerificationMethodOrReference[]
  assertionMethod: VerificationMethodOrReference[]
  capabilityInvocation: VerificationMethodOrReference[]
  capabilityDelegation: VerificationMethodOrReference[]
  keyAgreement: VerificationMethodOrReference[]
  service: Service[]
  alsoKnownAs?: string[]
}

export enum VerificationKeyType {
  Ed25519VerificationKey2018,
  X25519KeyAgreementKey2019,
  Ed25519VerificationKey2020,
  X25519KeyAgreementKey2020,
  JsonWebKey2020,
  EcdsaSecp256k1VerificationKey2019,
}

export interface VerificationMethod {
  id: string
  type: VerificationKeyType
  controller: string
  verification_key: VerificationKey
}

export type Multibase = {
  type: 'Multibase'
  publicKeyMultibase: string
}

export type JWK = {
  type: 'JWK'
  publicKeyJwk: string
}

export type VerificationKey = Multibase | JWK
