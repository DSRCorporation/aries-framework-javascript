// Indy-Besu VDR DidDocumentBuilder

import { DidDocument, VerificationKey, VerificationKeyType } from './DidDoc'

export class DidDocumentBuilder {
  public setId(id: string): DidDocumentBuilder {
    return this
  }

  public addVerificationMethod(type: VerificationKeyType, controller: string, key: VerificationKey) {
    return this
  }

  public addAuthenticationReference(index: number) {
    return this
  }

  public build(): DidDocument {
    return {
      context: 'https://www.w3.org/ns/did/v1',
      id: 'did:indy2:test',
      controller: '',
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
      capabilityDelegation: [],
      capabilityInvocation: [],
      keyAgreement: [],
      service: [],
    }
  }
}
