import { DidDocument, VerificationMethod, DidDocumentService } from '@aries-framework/core'
import {
  DidDocument as IndyBesuDidDocument,
  Service,
  VerificationMethod as IndyBesuVerificationMethod,
  VerificationRelationship,
} from '../ledger'

export function toIndyBesuDidDocument(didDocument: DidDocument): IndyBesuDidDocument {
  return {
    context: ensureArray(didDocument.context),
    id: didDocument.id,
    controller: ensureArray(didDocument.controller ?? []),
    verificationMethod: mapOrEmpty(didDocument.verificationMethod, toIndyBesuVerificationMethod),
    authentication: mapOrEmpty(didDocument.authentication, toVerificationRelationship),
    assertionMethod: mapOrEmpty(didDocument.assertionMethod, toVerificationRelationship),
    capabilityInvocation: mapOrEmpty(didDocument.capabilityInvocation, toVerificationRelationship),
    capabilityDelegation: mapOrEmpty(didDocument.capabilityDelegation, toVerificationRelationship),
    keyAgreement: mapOrEmpty(didDocument.keyAgreement, toVerificationRelationship),
    service: mapOrEmpty(didDocument.service, toIndyBesuService),
    alsoKnownAs: didDocument.alsoKnownAs ?? [],
  }
}

export function fromIndyBesuDidDocument(didDocument: IndyBesuDidDocument): DidDocument {
  const context = didDocument.context.length === 1 ? didDocument.context[0] : didDocument.context
  return new DidDocument({
    context,
    id: didDocument.id,
    alsoKnownAs: didDocument.alsoKnownAs.length > 0 ? didDocument.alsoKnownAs : undefined,
    controller: didDocument.controller.length > 0 ? didDocument.controller : undefined,
    verificationMethod: mapOrUndefined(didDocument.verificationMethod, fromIndyBesuVerificationMethod),
    service: mapOrUndefined(didDocument.service, fromIndyBesuService),
    authentication: mapOrUndefined(didDocument.authentication, fromVerificationRelationship),
    assertionMethod: mapOrUndefined(didDocument.assertionMethod, fromVerificationRelationship),
    keyAgreement: mapOrUndefined(didDocument.keyAgreement, fromVerificationRelationship),
    capabilityInvocation: mapOrUndefined(didDocument.capabilityInvocation, fromVerificationRelationship),
    capabilityDelegation: mapOrUndefined(didDocument.capabilityDelegation, fromVerificationRelationship),
  })
}

function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

function mapOrEmpty<T, R>(array: T[] | undefined, mapfunction: (item: T) => R): R[] {
  return array?.map(mapfunction) ?? []
}

function mapOrUndefined<T, R>(array: T[], mapfunction: (item: T) => R): R[] | undefined {
  return array.length > 0 ? array.map(mapfunction) : undefined
}

function toIndyBesuVerificationMethod(verificationMethod: VerificationMethod): IndyBesuVerificationMethod {
  return {
    id: verificationMethod.id,
    verificationMethodType: verificationMethod.type,
    controller: verificationMethod.controller,
    publicKeyJwk: verificationMethod.publicKeyJwk ? JSON.stringify(verificationMethod.publicKeyJwk) : '',
    publicKeyMultibase: verificationMethod.publicKeyMultibase ?? '',
  }
}

function fromIndyBesuVerificationMethod(verificationMethod: IndyBesuVerificationMethod): VerificationMethod {
  return new VerificationMethod({
    id: verificationMethod.id,
    type: verificationMethod.verificationMethodType,
    controller: verificationMethod.controller,
    publicKeyMultibase: verificationMethod.publicKeyMultibase || undefined,
    publicKeyJwk: verificationMethod.publicKeyJwk ? JSON.parse(verificationMethod.publicKeyJwk) : undefined,
  })
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

function fromVerificationRelationship(verificationRelationship: VerificationRelationship): string | VerificationMethod {
  return verificationRelationship.verificationMethod
    ? fromIndyBesuVerificationMethod(verificationRelationship.verificationMethod)
    : verificationRelationship.id
}
