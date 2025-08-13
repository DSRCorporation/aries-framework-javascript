import { Kms } from '@credo-ts/core'
import type { KeyManagementApi, KmsJwkPublicOkp, KmsJwkPublicRsa } from '@credo-ts/core/src/modules/kms'
import { createOrGetKey, getMultibasePublicKey } from '../../src/ledger/utils'

describe('getMultibasePublicKey', () => {
  it('should return a base58 key string prefixed with "z"', () => {
    const base64X = 'dGVzdGtleQ==' // base64 for 'testkey'
    const publicJwk = {
      crv: 'Ed25519',
      x: base64X,
    }
    // Expect base64 'dGVzdGtleQ==' to be decoded into Uint8Array
    // and then encoded into base58 string starting with 'z'
    const multibaseKey = getMultibasePublicKey(publicJwk as KmsJwkPublicOkp & { crv: 'Ed25519' })
    expect(multibaseKey.startsWith('z')).toBe(true)
    expect(typeof multibaseKey).toBe('string')
  })
})

describe('createOrGetKey', () => {
  let kmsMock: jest.Mocked<KeyManagementApi>

  beforeEach(() => {
    kmsMock = {
      createKey: jest.fn(),
      getPublicKey: jest.fn(),
    } as unknown as jest.Mocked<KeyManagementApi>
  })

  it('should creates a key if keyId is not provided', async () => {
    const fakeKeyId = 'key123'
    const fakeJwk: KmsJwkPublicOkp & { kid: string } = { kty: 'OKP', crv: 'Ed25519', x: 'xxx', kid: 'key123' }
    kmsMock.createKey.mockResolvedValue({
      keyId: fakeKeyId,
      publicJwk: fakeJwk,
    })

    const result = await createOrGetKey(kmsMock, undefined)
    // Check that createKey was called with correct parameters
    expect(kmsMock.createKey).toHaveBeenCalledWith({ type: { crv: 'Ed25519', kty: 'OKP' } })
    // Check the returned result matches the mocked createKey response
    expect(result).toEqual({
      keyId: fakeKeyId,
      publicJwk: fakeJwk,
    })
  })

  it('should retrieves an existing key if keyId is provided', async () => {
    const keyId = 'key456'
    const publicJwk: KmsJwkPublicOkp & { kid: string } = { kty: 'OKP', crv: 'Ed25519', x: 'xxx', kid: 'key123' }
    kmsMock.getPublicKey.mockResolvedValue(publicJwk)

    const result = await createOrGetKey(kmsMock, keyId)
    // Check that getPublicKey was called with the given keyId
    expect(kmsMock.getPublicKey).toHaveBeenCalledWith({ keyId })
    // Check the returned keyId and publicJwk match the mocked response
    expect(result).toEqual({
      keyId,
      publicJwk: {
        ...publicJwk,
        crv: publicJwk.crv,
      },
    })
  })

  it('should throws an error if key with given keyId is not found', async () => {
    // @ts-ignore
    kmsMock.getPublicKey.mockResolvedValue(null)

    // Expect the function to throw an error for missing key
    await expect(createOrGetKey(kmsMock, 'notfound')).rejects.toThrowError("Key with key id 'notfound' not found")
  })

  it('should throws an error if key has unsupported kty or crv', async () => {
    const keyId = 'badkey'
    const badJwk: KmsJwkPublicRsa & { kid: string } = { e: '', kid: 'key-1', n: '', kty: 'RSA' }

    kmsMock.getPublicKey.mockResolvedValue(badJwk)

    // Mock Kms.getJwkHumanDescription to control error message output
    const spyDesc = jest.spyOn(Kms, 'getJwkHumanDescription').mockReturnValue('unsupported key type')

    // Expect an error indicating unsupported key type or curve
    await expect(createOrGetKey(kmsMock, keyId)).rejects.toThrow(
      `Key with key id '${keyId}' uses unsupported unsupported key type for did:hedera`
    )

    spyDesc.mockRestore()
  })
})
