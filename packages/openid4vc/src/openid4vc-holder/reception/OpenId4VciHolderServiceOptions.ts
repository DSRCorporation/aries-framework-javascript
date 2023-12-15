import type { OfferedCredentialWithMetadata } from './utils/IssuerMetadataUtils'
import type { JwaSignatureAlgorithm, KeyType, VerificationMethod } from '@aries-framework/core'
import type {
  CredentialOfferPayloadV1_0_11,
  EndpointMetadataResult,
  OpenId4VCIVersion,
  AuthorizationDetails,
} from '@sphereon/oid4vci-common'

import { OpenIdCredentialFormatProfile } from './utils/claimFormatMapping'

export type SupportedCredentialFormats =
  | OpenIdCredentialFormatProfile.JwtVcJson
  | OpenIdCredentialFormatProfile.JwtVcJsonLd
  | OpenIdCredentialFormatProfile.SdJwtVc

export const supportedCredentialFormats: SupportedCredentialFormats[] = [
  OpenIdCredentialFormatProfile.JwtVcJson,
  OpenIdCredentialFormatProfile.JwtVcJsonLd,
  OpenIdCredentialFormatProfile.SdJwtVc,
]

export type { OpenId4VCIVersion, EndpointMetadataResult, CredentialOfferPayloadV1_0_11, AuthorizationDetails }

export interface ResolvedCredentialOffer {
  metadata: EndpointMetadataResult
  credentialOfferPayload: CredentialOfferPayloadV1_0_11
  version: OpenId4VCIVersion
  offeredCredentials: OfferedCredentialWithMetadata[]
}

export interface ResolvedAuthorizationRequest extends AuthCodeFlowOptions {
  codeVerifier: string
  authorizationRequestUri: string
}

export interface ResolvedAuthorizationRequestWithCode extends ResolvedAuthorizationRequest {
  code: string
}

/**
 * Options that are used to accept a credential offer for both the pre-authorized code flow and authorization code flow.
 */
export interface AcceptCredentialOfferOptions {
  /**
   * String value containing a user PIN. This value MUST be present if user_pin_required was set to true in the Credential Offer.
   * This parameter MUST only be used, if the grant_type is urn:ietf:params:oauth:grant-type:pre-authorized_code.
   */
  userPin?: string

  /**
   * This is the list of credentials that will be requested from the issuer.
   * If not provided all offered credentials will be requested.
   */
  credentialsToRequest?: OfferedCredentialWithMetadata[]

  verifyCredentialStatus?: boolean

  /**
   * A list of allowed proof of possession signature algorithms in order of preference.
   *
   * Note that the signature algorithms must be supported by the wallet implementation.
   * Signature algorithms that are not supported by the wallet will be ignored.
   *
   * The proof of possession (pop) signature algorithm is used in the credential request
   * to bind the credential to a did. In most cases the JWA signature algorithm
   * that is used in the pop will determine the cryptographic suite that is used
   * for signing the credential, but this not a requirement for the spec. E.g. if the
   * pop uses EdDsa, the credential will most commonly also use EdDsa, or Ed25519Signature2018/2020.
   */
  allowedProofOfPossessionSignatureAlgorithms?: JwaSignatureAlgorithm[]

  /**
   * A function that should resolve a verification method based on the options passed.
   * This method will be called once for each of the credentials that are included
   * in the credential offer.
   *
   * Based on the credential format, JWA signature algorithm, verification method types
   * and did methods, the resolver must return a verification method that will be used
   * for the proof of possession signature.
   */
  proofOfPossessionVerificationMethodResolver: ProofOfPossessionVerificationMethodResolver
}

/**
 * Options that are used for the authorization code flow.
 * Extends the pre-authorized code flow options.
 */
export interface AuthCodeFlowOptions {
  clientId: string
  redirectUri: string
  scope?: string[]
}

export interface ProofOfPossessionVerificationMethodResolverOptions {
  /**
   * The credential format that will be requested from the issuer.
   * E.g. `jwt_vc` or `ldp_vc`.
   */
  credentialFormat: SupportedCredentialFormats

  /**
   * The JWA Signature Algorithm that will be used in the proof of possession.
   * This is based on the `allowedProofOfPossessionSignatureAlgorithms` passed
   * to the request credential method, and the supported signature algorithms.
   */
  proofOfPossessionSignatureAlgorithm: JwaSignatureAlgorithm

  /**
   * This is a list of verification methods types that are supported
   * for creating the proof of possession signature. The returned
   * verification method type must be of one of these types.
   */
  supportedVerificationMethods: string[]

  /**
   * The key type that will be used to create the proof of possession signature.
   * This is related to the verification method and the signature algorithm, and
   * is added for convenience.
   */
  keyType: KeyType

  /**
   * The credential type that will be requested from the issuer. This is
   * based on the credential types that are included the credential offer.
   *
   * If the offered credential is an inline credential offer, the value
   * will be `undefined`.
   */
  supportedCredentialId?: string

  /**
   * Whether the issuer supports the `did` cryptographic binding method,
   * indicating they support all did methods. In most cases, they do not
   * support all did methods, and it means we have to make an assumption
   * about the did methods they support.
   *
   * If this value is `false`, the `supportedDidMethods` property will
   * contain a list of supported did methods.
   */
  supportsAllDidMethods: boolean

  /**
   * A list of supported did methods. This is only used if the `supportsAllDidMethods`
   * property is `false`. When this array is populated, the returned verification method
   * MUST be based on one of these did methods.
   *
   * The did methods are returned in the format `did:<method>`, e.g. `did:web`.
   *
   * The value is undefined in the case the supported did methods could not be extracted.
   * This is the case when an inline credential was used, or when the issuer didn't include
   * the supported did methods in the issuer metadata.
   *
   * NOTE: an empty array (no did methods supported) has a different meaning from the value
   * being undefined (the supported did methods could not be extracted). If `supportsAllDidMethods`
   * is true, the value of this property MUST be ignored.
   */
  supportedDidMethods?: string[]
}

/**
 * The proof of possession verification method resolver is a function that can be passed by the
 * user of the framework and allows them to determine which verification method should be used
 * for the proof of possession signature.
 */
export type ProofOfPossessionVerificationMethodResolver = (
  options: ProofOfPossessionVerificationMethodResolverOptions
) => Promise<VerificationMethod> | VerificationMethod

/**
 * @internal
 */
export interface ProofOfPossessionRequirements {
  signatureAlgorithm: JwaSignatureAlgorithm
  supportedDidMethods?: string[]
  supportsAllDidMethods: boolean
}
