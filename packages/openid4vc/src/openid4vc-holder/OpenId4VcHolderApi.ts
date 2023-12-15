import type { AuthenticationRequest, PresentationRequest, PresentationSubmission } from './presentation'
import type {
  ResolvedCredentialOffer,
  ResolvedAuthorizationRequest,
  AuthCodeFlowOptions,
  AcceptCredentialOfferOptions,
  CredentialOfferPayloadV1_0_11,
} from './reception'
import type { VerificationMethod, W3cCredentialRecord } from '@aries-framework/core'
import type { SdJwtVcRecord } from '@aries-framework/sd-jwt-vc'

import { injectable, AgentContext } from '@aries-framework/core'

import { OpenId4VpHolderService } from './presentation'
import { OpenId4VciHolderService } from './reception'

/**
 * @public
 */
@injectable()
export class OpenId4VcHolderApi {
  private agentContext: AgentContext
  private openId4VciHolderService: OpenId4VciHolderService
  private openId4VpHolderService: OpenId4VpHolderService

  public constructor(
    agentContext: AgentContext,
    openId4VcHolderService: OpenId4VciHolderService,
    openId4VpHolderService: OpenId4VpHolderService
  ) {
    this.agentContext = agentContext
    this.openId4VciHolderService = openId4VcHolderService
    this.openId4VpHolderService = openId4VpHolderService
  }

  /**
   * Resolves the authentication request given as URI or JWT to a unified format, and
   * verifies the validity of the request.
   * The resolved request can be accepted with either @see acceptAuthenticationRequest if it is an
   * authentication request or with @see acceptPresentationRequest if it is a proofRequest.
   *
   * @param requestJwtOrUri JWT or an openid:// URI
   * @returns the resolved and verified authentication request or presentation request alongside the data required to fulfill the presentation request if possible.
   */
  public async resolveProofRequest(requestJwtOrUri: string) {
    return await this.openId4VpHolderService.resolveProofRequest(this.agentContext, requestJwtOrUri)
  }

  /**
   * Accepts the authentication request after it has been resolved and verified with @see resolveProofRequest.
   *
   * @param authenticationRequest - The verified authorization request object.
   * @param verificationMethod - The method used for creating the authentication proof.
   * @returns @see ProofSubmissionResponse containing the status of the submission.
   */
  public async acceptAuthenticationRequest(
    authenticationRequest: AuthenticationRequest,
    verificationMethod: VerificationMethod
  ) {
    return await this.openId4VpHolderService.acceptAuthenticationRequest(
      this.agentContext,
      verificationMethod,
      authenticationRequest
    )
  }

  /**
   * Accepts the proof request with a presentation after it has been resolved and verified @see resolveProofRequest.
   *
   * @param presentationRequest - The verified authorization request object containing the presentation definition.
   * @param presentation.submission - The presentation submission object obtained from @see resolveProofRequest
   * @param presentation.submissionEntryIndexes - The indexes of the credentials in the presentation submission that should be send to the verifier.
   * @returns @see ProofSubmissionResponse containing the status of the submission.
   */
  public async acceptPresentationRequest(
    presentationRequest: PresentationRequest,
    presentation: {
      submission: PresentationSubmission
      submissionEntryIndexes: number[]
    }
  ) {
    const { submission, submissionEntryIndexes } = presentation
    return await this.openId4VpHolderService.acceptProofRequest(this.agentContext, presentationRequest, {
      submission,
      submissionEntryIndexes,
    })
  }

  /**
   * Resolves a credential offer given as payload, credential offer URL, or issuance initiation URL,
   * into a unified format with metadata.
   *
   * @param credentialOffer the credential offer to resolve
   * @returns The uniform credential offer payload, the issuer metadata, protocol version, and the offered credentials with metadata.
   */
  public async resolveCredentialOffer(credentialOffer: string | CredentialOfferPayloadV1_0_11) {
    return await this.openId4VciHolderService.resolveCredentialOffer(credentialOffer)
  }

  /**
   * This function is to be used with the Authorization Code Flow.
   * It will generate the authorization request URI based on the provided options.
   * The authorization request URI is used to obtain the authorization code. Currently this needs to be done manually.
   *
   * Authorization to request credentials can be requested via authorization_details or scopes.
   * This function automatically generates the authorization_details for all offered credentials.
   * If scopes are provided, the provided scopes are send alongside the authorization_details.
   *
   * @param resolvedCredentialOffer Obtained through @see resolveCredentialOffer
   * @param authCodeFlowOptions
   * @returns The authorization request URI alongside the code verifier and original @param authCodeFlowOptions
   */
  public async resolveAuthorizationRequest(
    resolvedCredentialOffer: ResolvedCredentialOffer,
    authCodeFlowOptions: AuthCodeFlowOptions
  ) {
    return await this.openId4VciHolderService.resolveAuthorizationRequest(
      this.agentContext,
      resolvedCredentialOffer,
      authCodeFlowOptions
    )
  }

  /**
   * Accepts a credential offer using the pre-authorized code flow.
   * @param resolvedCredentialOffer Obtained through @see resolveCredentialOffer
   * @param acceptCredentialOfferOptions
   * @returns ( @see W3cCredentialRecord | @see SdJwtRecord )[]
   */
  public async acceptCredentialOfferUsingPreAuthorizedCode(
    resolvedCredentialOffer: ResolvedCredentialOffer,
    acceptCredentialOfferOptions: AcceptCredentialOfferOptions
  ): Promise<(W3cCredentialRecord | SdJwtVcRecord)[]> {
    return this.openId4VciHolderService.acceptCredentialOffer(this.agentContext, {
      resolvedCredentialOffer,
      acceptCredentialOfferOptions,
    })
  }

  /**
   * Accepts a credential offer using the authorization code flow.
   * @param resolvedCredentialOffer Obtained through @see resolveCredentialOffer
   * @param resolvedAuthorizationRequest Obtained through @see resolveAuthorizationRequest
   * @param code The authorization code obtained via the authorization request URI
   * @param acceptCredentialOfferOptions
   * @returns ( @see W3cCredentialRecord | @see SdJwtRecord )[]
   */
  public async acceptCredentialOfferUsingAuthorizationCode(
    resolvedCredentialOffer: ResolvedCredentialOffer,
    resolvedAuthorizationRequest: ResolvedAuthorizationRequest,
    code: string,
    acceptCredentialOfferOptions: AcceptCredentialOfferOptions
  ): Promise<(W3cCredentialRecord | SdJwtVcRecord)[]> {
    return this.openId4VciHolderService.acceptCredentialOffer(this.agentContext, {
      resolvedCredentialOffer,
      resolvedAuthorizationRequestWithCode: { ...resolvedAuthorizationRequest, code },
      acceptCredentialOfferOptions,
    })
  }
}
