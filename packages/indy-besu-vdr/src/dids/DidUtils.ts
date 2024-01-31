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

  // verificationMethod is required
  if (!didDocument.verificationMethod) return 'verificationMethod is required'

  // verificationMethod must be an array
  if (!Array.isArray(didDocument.verificationMethod)) return 'verificationMethod must be an array'

  // verificationMethod must be not be empty
  if (!didDocument.verificationMethod.length) return 'verificationMethod must be not be empty'

  // verificationMethod types must be supported
  const isValidVerificationMethod = didDocument.verificationMethod.every((vm) => {
    switch (vm.type) {
      case VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019:
      case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020:
        return vm.publicKeyMultibase != null
      case VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020:
        return vm.publicKeyJwk != null
      case VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018:
        return vm.publicKeyBase58 != null
      default:
        return false
    }
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
