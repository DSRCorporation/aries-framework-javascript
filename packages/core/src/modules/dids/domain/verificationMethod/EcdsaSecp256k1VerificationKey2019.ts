import { AriesFrameworkError, Key, KeyType, VerificationMethod } from '@aries-framework/core'

export const VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019 = 'EcdsaSecp256k1VerificationKey2019'
type EcdsaSecp256k1VerificationKey2019 = VerificationMethod & {
  type: typeof VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019
}

/**
 * Get a EcdsaSecp256k1VerificationKey2019 verification method.
 */
export function getEcdsaSecp256k1VerificationKey2019({
  key,
  id,
  controller,
}: {
  id: string
  key: Key
  controller: string
}) {
  return new VerificationMethod({
    id,
    type: VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019,
    controller,
    publicKeyMultibase: key.fingerprint,
  })
}

/**
 * Check whether a verification method is a EcdsaSecp256k1VerificationKey2019 verification method.
 */
export function isEcdsaSecp256k1VerificationKey2019(
  verificationMethod: VerificationMethod
): verificationMethod is EcdsaSecp256k1VerificationKey2019 {
  return verificationMethod.type === VERIFICATION_METHOD_TYPE_ECDSA_SECP256K1_VERIFICATION_KEY_2019
}

/**
 * Get a key from a EcdsaSecp256k1VerificationKey2019 verification method.
 */
export function getKeyFromEcdsaSecp256k1VerificationKey2019(verificationMethod: EcdsaSecp256k1VerificationKey2019) {
  if (!verificationMethod.publicKeyMultibase) {
    throw new AriesFrameworkError('verification method is missing publicKeyMultibase')
  }

  const key = Key.fromFingerprint(verificationMethod.publicKeyMultibase)
  if (key.keyType !== KeyType.K256) {
    throw new AriesFrameworkError(`Verification method publicKeyMultibase is for unexpected key type ${key.keyType}`)
  }

  return key
}
