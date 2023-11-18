import { type Buffer, DidDocument, VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018, VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020, VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020, DidCreateResult, DidUpdateResult } from '@aries-framework/core'
import { DidDocument as IndyBesuDidDocument } from '../ledger/contracts/DidRegistry'
import { VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019 } from './EcdsaSecp256k1VerificationKey2019'

export type SpecValidationResult = {
  valid: boolean
  error?: string
}

export function toIndyBesuDidDocument(didDocument: DidDocument): IndyBesuDidDocument {
  throw new Error('Method not implemented.')
}

export function fromIndyBesuDidDocument(didDocument: IndyBesuDidDocument): DidDocument {
  throw new Error('Method not implemented.')
}

export function buildDid(method: string, network: string, key: Buffer): string {
  throw new Error('Method not implemented.')
}

export function validateSpecCompliantPayload(didDocument: DidDocument): string | null {
  // id is required, validated on both compile and runtime
  if (!didDocument.id && !didDocument.id.startsWith('did:')) return 'id is required'

  // verificationMethod is required
  if (!didDocument.verificationMethod) return 'verificationMethod is required'

  // verificationMethod must be an array
  if (!Array.isArray(didDocument.verificationMethod))
    return 'verificationMethod must be an array'

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
