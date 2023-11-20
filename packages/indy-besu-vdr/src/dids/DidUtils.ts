import {
  type Buffer,
  DidDocument,
  VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2018,
  VERIFICATION_METHOD_TYPE_JSON_WEB_KEY_2020,
  VERIFICATION_METHOD_TYPE_ED25519_VERIFICATION_KEY_2020,
  DidCreateResult,
  VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019,
  Hasher,
  TypedArrayEncoder,
  VerificationMethod,
  DidDocumentService,
} from '@aries-framework/core'
import {
  DidDocument as IndyBesuDidDocument,
  Service,
  VerificationMethod as InvyBesuVerificationMethod,
  VerificationRelationship,
} from '../ledger/contracts/DidRegistry'
import { DidCommDocumentService } from 'packages/core/src/modules/didcomm'

export type SpecValidationResult = {
  valid: boolean
  error?: string
}

export function toIndyBesuDidDocument(didDocument: DidDocument): IndyBesuDidDocument {
  const context = Array.isArray(didDocument.context) ? didDocument.context : [didDocument.context]

  let controller = didDocument.controller ?? []
  controller = Array.isArray(controller) ? controller : [controller]

  return {
    context,
    id: didDocument.id,
    controller,
    verificationMethod: didDocument.verificationMethod?.map(toIndyBesuVerificationMethod) ?? [],
    authentication: didDocument.authentication?.map(toVerificationRelationship) ?? [],
    assertionMethod: didDocument.assertionMethod?.map(toVerificationRelationship) ?? [],
    capabilityInvocation: didDocument.capabilityInvocation?.map(toVerificationRelationship) ?? [],
    capabilityDelegation: didDocument.capabilityDelegation?.map(toVerificationRelationship) ?? [],
    keyAgreement: didDocument.keyAgreement?.map(toVerificationRelationship) ?? [],
    service: didDocument.service?.map(toIndyBesuService) ?? [],
    alsoKnownAs: didDocument.alsoKnownAs ?? [],
  }
}

export function fromIndyBesuDidDocument(didDocument: IndyBesuDidDocument): DidDocument {
  let context

  if (didDocument.context.length == 1) {
    context = didDocument.context[0]
  } else if (didDocument.context.length > 1) {
    context = didDocument.context
  }

  const options = {
    context,
    id: didDocument.id,
    alsoKnownAs: didDocument.alsoKnownAs.length > 0 ? didDocument.alsoKnownAs : undefined,
    controller: didDocument.controller.length > 0 ? didDocument.controller : undefined,
    verificationMethod:
      didDocument.verificationMethod.length > 0
        ? didDocument.verificationMethod.map(fromIndyBesuVerificationMethod)
        : undefined,
    service: didDocument.service.length > 0 ? didDocument.service.map(fromIndyBesuService) : undefined,
    authentication:
      didDocument.authentication.length > 0 ? didDocument.authentication.map(fromVerificationRelationship) : undefined,
    assertionMethod:
      didDocument.assertionMethod.length > 0
        ? didDocument.assertionMethod.map(fromVerificationRelationship)
        : undefined,
    keyAgreement:
      didDocument.keyAgreement.length > 0 ? didDocument.keyAgreement.map(fromVerificationRelationship) : undefined,
    capabilityInvocation:
      didDocument.capabilityInvocation.length > 0
        ? didDocument.capabilityInvocation.map(fromVerificationRelationship)
        : undefined,
    capabilityDelegation:
      didDocument.capabilityDelegation.length > 0
        ? didDocument.capabilityDelegation.map(fromVerificationRelationship)
        : undefined,
  }

  return new DidDocument(options)
}

export function buildDid(method: string, network: string, key: Buffer): string {
  const buffer = Hasher.hash(key, 'sha2-256')
  const namespaceIdentifier = TypedArrayEncoder.toBase58(buffer.slice(0, 16))

  return `did:${method}:${network}:${namespaceIdentifier}`
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

function toVerificationRelationship(verificationMethod: string | VerificationMethod): VerificationRelationship {
  if (typeof verificationMethod === 'string') {
    return {
      id: verificationMethod,
      verificationMethod: {
        id: '',
        verificationMethodType: '',
        controller: '',
        publicKeyJwk: '',
        publicKeyMultibase: '',
      },
    }
  } else {
    return {
      id: '',
      verificationMethod: toIndyBesuVerificationMethod(verificationMethod),
    }
  }
}

function fromVerificationRelationship(verificationRelationship: VerificationRelationship) {
  if (verificationRelationship.verificationMethod) {
    return fromIndyBesuVerificationMethod(verificationRelationship.verificationMethod)
  } else {
    return verificationRelationship.id
  }
}

function toIndyBesuVerificationMethod(verificationMethod: VerificationMethod): InvyBesuVerificationMethod {
  return {
    id: verificationMethod.id,
    verificationMethodType: verificationMethod.type,
    controller: verificationMethod.controller,
    publicKeyJwk: verificationMethod.publicKeyJwk ? JSON.stringify(verificationMethod.publicKeyJwk) : '',
    publicKeyMultibase: verificationMethod.publicKeyMultibase ?? '',
  }
}

function fromIndyBesuVerificationMethod(verificationMethod: InvyBesuVerificationMethod): VerificationMethod {
  const options = {
    id: verificationMethod.id,
    type: verificationMethod.verificationMethodType,
    controller: verificationMethod.controller,
    publicKeyMultibase:
      verificationMethod.publicKeyMultibase.length > 0 ? verificationMethod.publicKeyMultibase : undefined,
    publicKeyJwk: verificationMethod.publicKeyJwk.length > 0 ? JSON.parse(verificationMethod.publicKeyJwk) : undefined,
  }

  return new VerificationMethod(options)
}

function toIndyBesuService(service: DidDocumentService): Service {
  return {
    id: service.id,
    serviceType: service.type,
    serviceEndpoint: service.serviceEndpoint,
    accept: [],
    routingKeys: [],
  }
}

function fromIndyBesuService(service: Service): DidDocumentService {
  return new DidDocumentService({ id: service.id, serviceEndpoint: service.serviceEndpoint, type: service.serviceType })
}
