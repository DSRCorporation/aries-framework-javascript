import { Buffer, Kms, TypedArrayEncoder } from '@credo-ts/core'
import { type SigningInput, type SigningOutput, prepareDataForSigning } from 'didwebvh-ts'
import type { Signer as VhSigner, Verifier as VhVerifier } from 'didwebvh-ts/dist/types/interfaces'

export function getVhSigner(keyManagementApi: Kms.KeyManagementApi, keyId: string, keyFingerprint: string): VhSigner {
  return {
    sign: async (input: SigningInput): Promise<SigningOutput> => {
      const dataToSign = await prepareDataForSigning(input.document, input.proof).then((bytes) => Buffer.from(bytes))
      const { signature } = await keyManagementApi.sign({ keyId, data: dataToSign, algorithm: 'EdDSA' })
      return {
        proofValue: `z${TypedArrayEncoder.toBase58(signature)}`,
      }
    },
    getVerificationMethodId: () => `did:key:${keyFingerprint}`,
  }
}

export function getVhVerifier(keyManagementApi: Kms.KeyManagementApi): VhVerifier {
  return {
    verify: async (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): Promise<boolean> => {
      const publicKeyJwk = Kms.PublicJwk.fromPublicKey({ crv: 'Ed25519', kty: 'OKP', publicKey })
      const { verified } = await keyManagementApi.verify({
        signature: Buffer.from(signature),
        data: Buffer.from(message),
        key: { publicJwk: publicKeyJwk.toJson() },
        algorithm: 'EdDSA',
      })
      return verified
    },
  }
}

// Based on didwebvh-ts implementation: https://github.com/decentralized-identity/didwebvh-ts/blob/main/src/utils.ts#L249
export function getVhRelativeVerificationMethodId(publicKeyMultibase: string): string {
  return publicKeyMultibase.slice(-8)
}
