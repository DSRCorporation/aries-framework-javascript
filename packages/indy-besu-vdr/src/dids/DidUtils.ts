import {
  type Buffer,
  DidCreateResult,
  TypedArrayEncoder,
  VerificationMethod,
  Key,
  DidDocumentBuilder,
  getEd25519VerificationKey2018,
  getX25519KeyAgreementKey2019,
  DidDocumentService,
} from '@aries-framework/core'
import { computeAddress } from 'ethers'

export const VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_RECOVERY_2020 = 'EcdsaSecp256k1RecoveryMethod2020'
export const CONTEXT_SECURITY_SUITES_ED25519_2018_V1 = 'https://w3id.org/security/suites/ed25519-2018/v1'

export enum VerificationKeyType {
  Ed25519VerificationKey2018,
  X25519KeyAgreementKey2020,
  EcdsaSecp256k1RecoveryMethod2020,
}

export enum VerificationKeyPurpose {
  AssertionMethod,
  Authentication,
  keyAgreement,
}

export interface VerificationKey {
  type: VerificationKeyType
  key: Key
  purpose: VerificationKeyPurpose
}

export interface IndyBesuEndpoint {
  type: string
  endpoint: string
}

export function buildDid(method: string, key: Buffer): string {
  const namespaceIdentifier = computeAddress(`0x${TypedArrayEncoder.toHex(key)}`)

  return `did:${method}:${namespaceIdentifier}`
}

export function getEcdsaSecp256k1RecoveryMethod2020({
  id,
  key,
  controller,
}: {
  id: string
  key: Key
  controller: string
}) {
  const address = computeAddress(`0x${TypedArrayEncoder.toHex(key.publicKey)}`)

  //TODO: Replace hardcoded chain ID 1337, it should be extracted from configurations
  return new VerificationMethod({
    id,
    type: 'EcdsaSecp256k1RecoveryMethod2020',
    controller,
    blockchainAccountId: `eip155:1337:${address}`,
  })
}

export function failedResult(reason: string): DidCreateResult {
  return {
    didDocumentMetadata: {},
    didRegistrationMetadata: {},
    didState: {
      state: 'failed',
      reason: reason,
    },
  }
}

export function getVerificationMaterialPropertyName(type: VerificationKeyType): string {
  switch (type) {
    case VerificationKeyType.Ed25519VerificationKey2018:
    case VerificationKeyType.X25519KeyAgreementKey2020:
      return 'publicKeyBase58'
    case VerificationKeyType.EcdsaSecp256k1RecoveryMethod2020:
      return 'blockchainAccountId'
  }
}

export function getVerificationMaterial(type: VerificationKeyType, key: Key): string {
  switch (type) {
    case VerificationKeyType.Ed25519VerificationKey2018:
    case VerificationKeyType.X25519KeyAgreementKey2020:
      return key.publicKeyBase58
    case VerificationKeyType.EcdsaSecp256k1RecoveryMethod2020:
      const address = computeAddress(`0x${TypedArrayEncoder.toHex(key.publicKey)}`)
      //TODO: Replace hardcoded chain ID 1337, it should be extracted from configurations
      return `eip155:1337:${address}`
  }
}

export function getVerificationPurpose(purpose: VerificationKeyPurpose): string {
  switch (purpose) {
    case VerificationKeyPurpose.AssertionMethod:
      return 'veriKey'
    case VerificationKeyPurpose.Authentication:
      return 'sigAuth'
    case VerificationKeyPurpose.keyAgreement:
      return 'enc'
  }
}

export function getVerificationMethod(
  id: string,
  type: VerificationKeyType,
  key: Key,
  controller: string
): VerificationMethod {
  switch (type) {
    case VerificationKeyType.Ed25519VerificationKey2018:
      return getEd25519VerificationKey2018({ id, key, controller })
    case VerificationKeyType.X25519KeyAgreementKey2020:
      return getX25519KeyAgreementKey2019({ id, key, controller })
    case VerificationKeyType.EcdsaSecp256k1RecoveryMethod2020:
      return getEcdsaSecp256k1RecoveryMethod2020({ id, key, controller })
  }
}

export function getKeyContext(type: VerificationKeyType) {
  switch (type) {
    case VerificationKeyType.Ed25519VerificationKey2018:
      return 'https://w3id.org/security/suites/ed25519-2018/v1'
    case VerificationKeyType.X25519KeyAgreementKey2020:
      return 'https://w3id.org/security/suites/x25519-2020/v1'
    case VerificationKeyType.EcdsaSecp256k1RecoveryMethod2020:
      return 'https://w3id.org/security/suites/secp256k1recovery-2020/v2'
  }
}

export function buildDidDocument(
  did: string,
  key: Key,
  endpoints?: IndyBesuEndpoint[],
  verificationKeys?: VerificationKey[]
) {
  const context = [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/secp256k1recovery-2020/v2',
    // 'https://w3id.org/security/v3-unstable',
  ]

  const verificationMethod = getEcdsaSecp256k1RecoveryMethod2020({
    key: key,
    id: `${did}#controller`,
    controller: did,
  })

  const didDocumentBuilder = new DidDocumentBuilder(did)
    .addVerificationMethod(verificationMethod)
    .addAuthentication(verificationMethod.id)
    .addAssertionMethod(verificationMethod.id)

  // add key security context
  verificationKeys
    ?.map((value) => value.type)
    .map((value) => getKeyContext(value))
    .forEach((value) => {
      if (!context.includes(value)) {
        context.push(value)
      }
    })

  // add verification methods
  verificationKeys?.forEach((value, index) => {
    const id = `${did}#delegate-${index + 1}`

    const verificationMethod = getVerificationMethod(id, value.type, value.key, did)
    didDocumentBuilder.addVerificationMethod(verificationMethod)

    switch (value.purpose) {
      case VerificationKeyPurpose.AssertionMethod:
        didDocumentBuilder.addAssertionMethod(id)
        break
      case VerificationKeyPurpose.Authentication:
        didDocumentBuilder.addAuthentication(id)
        break
      case VerificationKeyPurpose.keyAgreement:
        didDocumentBuilder.addKeyAgreement(id)
    }
  })

  // add services
  endpoints?.forEach((value, index) => {
    const service = new DidDocumentService({
      id: `${did}#service-${index + 1}`,
      serviceEndpoint: value.endpoint,
      type: value.type,
    })

    didDocumentBuilder.addService(service)
  })

  const didDocument = didDocumentBuilder.build()

  didDocument.context = context

  return didDocument
}
