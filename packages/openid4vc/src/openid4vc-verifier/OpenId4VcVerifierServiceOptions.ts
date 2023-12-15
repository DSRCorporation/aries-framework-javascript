import type { VerificationMethod } from '@aries-framework/core'
import type { PresentationDefinitionV1, PresentationDefinitionV2 } from '@sphereon/pex-models'

import {
  type IDTokenPayload,
  type VerifiedOpenID4VPSubmission,
  type ClientMetadataOpts,
  type AuthorizationResponsePayload,
  ResponseType,
  Scope,
  PassBy,
  SigningAlgo,
  SubjectType,
} from '@sphereon/did-auth-siop'

export { PassBy, SigningAlgo, SubjectType, ResponseType, Scope } from '@sphereon/did-auth-siop'

export type HolderMetadata = ClientMetadataOpts & { authorization_endpoint?: string }

export type { PresentationDefinitionV1, PresentationDefinitionV2, VerifiedOpenID4VPSubmission, IDTokenPayload }

export interface VerifierMetadata {
  verifierBaseUrl: string
  verificationEndpointPath: string
}

export interface CreateProofRequestOptions {
  verificationMethod: VerificationMethod
  verificationEndpointUrl?: string

  /**
   * The holder metadata to use for the proof request.
   * If not provided, a static set of configuration values defined in the spec will be used.
   * If provided as a string (url), it will try to retrieve the metadata from the given url.
   */
  holderMetadata?: HolderMetadata | string
  presentationDefinition?: PresentationDefinitionV1 | PresentationDefinitionV2
}

export interface ProofRequestMetadata {
  correlationId: string
  challenge: string
  state: string
}

export type ProofRequestWithMetadata = {
  proofRequest: string
  proofRequestMetadata: ProofRequestMetadata
}

export interface VerifyProofResponseOptions {
  createProofRequestOptions: CreateProofRequestOptions
  proofRequestMetadata: ProofRequestMetadata
}

export interface VerifiedProofResponse {
  idTokenPayload: IDTokenPayload
  submission: VerifiedOpenID4VPSubmission | undefined
}

export type ProofPayload = AuthorizationResponsePayload

export const staticOpSiopConfig: HolderMetadata = {
  authorization_endpoint: 'siopv2:',
  subject_syntax_types_supported: ['urn:ietf:params:oauth:jwk-thumbprint'],
  responseTypesSupported: [ResponseType.ID_TOKEN],
  scopesSupported: [Scope.OPENID],
  subjectTypesSupported: [SubjectType.PAIRWISE],
  idTokenSigningAlgValuesSupported: [SigningAlgo.ES256],
  requestObjectSigningAlgValuesSupported: [SigningAlgo.ES256],
  passBy: PassBy.VALUE,
}

export const staticOpOpenIdConfig: HolderMetadata = {
  authorization_endpoint: 'openid:',
  subject_syntax_types_supported: ['urn:ietf:params:oauth:jwk-thumbprint'],
  responseTypesSupported: [ResponseType.ID_TOKEN, ResponseType.VP_TOKEN],
  scopesSupported: [Scope.OPENID],
  subjectTypesSupported: [SubjectType.PAIRWISE],
  idTokenSigningAlgValuesSupported: [SigningAlgo.ES256],
  requestObjectSigningAlgValuesSupported: [SigningAlgo.ES256],
  passBy: PassBy.VALUE,
  vpFormatsSupported: { jwt_vc: { alg: [SigningAlgo.ES256] }, jwt_vp: { alg: [SigningAlgo.ES256] } },
}

export type ProofResponseHandlerReturn = { status: number }
export type ProofResponseHandler = (verifiedProofResponse: VerifiedProofResponse) => Promise<ProofResponseHandlerReturn>

export interface VerificationEndpointConfig {
  /**
   * Configures the router to expose the verification endpoint.
   */
  enabled: boolean

  proofResponseHandler?: ProofResponseHandler
}

export interface VerifierEndpointConfig {
  basePath: string
  verificationEndpointConfig: VerificationEndpointConfig
}
