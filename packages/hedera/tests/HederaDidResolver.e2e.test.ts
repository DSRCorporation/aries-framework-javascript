import { Agent, ConsoleLogger, JsonTransformer, Kms, LogLevel } from '@credo-ts/core'
import { PrivateKey } from '@hashgraph/sdk'
import { HederaDidCreateOptions } from '../src/ledger/HederaLedgerService'
import { getHederaAgent } from './utils'

describe('Hedera DID resolver', () => {
  const logger = new ConsoleLogger(LogLevel.error)
  const privateKey = process.env.HEDERA_TEST_OPERATOR_KEY ?? ''

  let agent: Agent
  let did: string

  beforeAll(async () => {
    agent = getHederaAgent({
      logger,
      label: 'alice',
    })
    await agent.initialize()

    const hederaPrivateKey = PrivateKey.fromStringDer(privateKey)
    hederaPrivateKey.toBytes()

    const key = await agent.kms.createKey({
      type: {
        crv: 'Ed25519',
        kty: 'OKP',
      },
    })
    const publicKeyJwk = Kms.PublicJwk.fromPublicJwk(key.publicJwk)
    const _publicKeyMultibase = publicKeyJwk.fingerprint

    const { signature } = await kms.sign({
      data: payload,
      algorithm: publicJwk.signatureAlgorithm,
      keyId: kmsKeyId,
    })

    const didResult = await agent.dids.create<HederaDidCreateOptions>({ method: 'hedera', secret: { key: {} } })
    if (!didResult.didState.did) {
      throw new Error('No DID created')
    }
    did = didResult.didState.did
  })

  afterAll(async () => {
    await agent.shutdown()
  })

  it('should resolve a did:cheqd did from local testnet', async () => {
    const resolveResult = await agent.dids.resolve(did)
    expect(JsonTransformer.toJSON(resolveResult)).toMatchObject({
      didDocument: {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        controller: did,
        verificationMethod: [
          {
            controller: did,
            id: `${did}#did-root-key`,
            type: 'Ed25519VerificationKey2020',
            publicKeyMultibase: expect.any(String),
          },
        ],
      },
      didDocumentMetadata: {},
      didResolutionMetadata: {},
    })
  })
})
