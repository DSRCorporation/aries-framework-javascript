import {
  type Buffer,
  DidDocument,
  VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018,
  VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020,
  VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020,
  DidCreateResult,
  VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019,
  TypedArrayEncoder,
  VerificationMethod,
  Key,
} from '@aries-framework/core'
import { computeAddress } from 'ethers'

export const VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_RECOVERY_2020 = 'EcdsaSecp256k1RecoveryMethod2020'

export function buildDid(method: string, key: Buffer): string {
  const namespaceIdentifier = computeAddress(`0x${TypedArrayEncoder.toHex(key)}`)
  
  return `did:${method}:${namespaceIdentifier}`
}

export function getEcdsaSecp256k1RecoveryMethod2020({
  key,
  id,
  controller,
}: {
  id: string
  key: Key
  controller: string
}) {
  const namespaceIdentifier = computeAddress(`0x${TypedArrayEncoder.toHex(key.publicKey)}`)

  //TODO: Replace hardcoded chain ID 1337, it should be extracted from configurations
  return new VerificationMethod({
    id,
    type: 'EcdsaSecp256k1RecoveryMethod2020',
    controller,
    blockchainAccountId: `eip155:1337:${namespaceIdentifier}`
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

export function validateSpecCompliantPayload(didDocument: DidDocument): string | null {
  // id is required, validated on both compile and runtime
  if (!didDocument.id && !didDocument.id.startsWith('did:')) return 'id is required'

  // verificationMethod types must be supported
  const isValidVerificationMethod = didDocument.verificationMethod?.every((vm) => {
    const verificationMaterialPropertyName = getVerificationMaterialProperty(vm.type)
    return vm[verificationMaterialPropertyName] != null
  })

  if (!isValidVerificationMethod) return 'verificationMethod publicKey is Invalid'

  const isValidService = didDocument.service
    ? didDocument?.service?.every((s) => {
        return s?.serviceEndpoint && s?.id && s?.type
      })
    : true

  if (!isValidService) return 'Service is Invalid'

  return null
}

export function getVerificationMaterialProperty(verificationMethodType: string): keyof VerificationMethod {
  switch (verificationMethodType) {
    case VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019:
    case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020:
      return 'publicKeyMultibase'
    case VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020:
      return 'publicKeyJwk'
    case VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_RECOVERY_2020:
      return 'blockchainAccountId'
    case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018:
    default:
      return 'publicKeyBase58'
  }
}

export function getVerificationMethodPurpose(document: DidDocument, verificationMethodId: string): string[] {
  const verificationMethodPurposes: Array<string> = []

  if (document.assertionMethod?.includes(verificationMethodId)) {
    verificationMethodPurposes.push('veriKey')
  }

  if (document.authentication?.includes(verificationMethodId)) {
    verificationMethodPurposes.push('sigAuth')
  }

  if (document.authentication?.includes(verificationMethodId)) {
    verificationMethodPurposes.push('enc')
  }

  return verificationMethodPurposes
}
