import {
  Agent,
  Buffer,
  DidDocumentBuilder,
  JsonTransformer,
  KeyType,
  getEd25519VerificationKey2018,
} from '@aries-framework/core'
import crypto from 'crypto'
import { getAgentOptions } from '../../core/tests/helpers'
import { buildDid, getBesuIndyModules } from './indy-bese-test-utils'
import { IndyBesuDidCreateOptions } from '../src/dids'
import { VerificationKeyPurpose, VerificationKeyType } from '../src/dids/DidUtils'

const agentOptions = getAgentOptions('Faber', {}, getBesuIndyModules())

describe('Indy-Besu DID', () => {
  let agent: Agent<ReturnType<typeof getBesuIndyModules>>

  beforeAll(async () => {
    agent = new Agent(agentOptions)
    await agent.initialize()
  })

  afterAll(async () => {
    await agent.shutdown()
    await agent.wallet.delete()
  })

  it('create and resolve a did:ethr', async () => {
    const didPrivateKey = Buffer.from(crypto.randomBytes(32))
    const assertKey = await agent.wallet.createKey({ keyType: KeyType.Ed25519 })

    const createResult = await agent.dids.create<IndyBesuDidCreateOptions>({
      method: 'ethr',
      options: {
        endpoints: [
          {
            type: 'endpoint',
            endpoint: 'https://example.com/endpoint',
          },
        ],
        verificationKeys: [
          {
            type: VerificationKeyType.Ed25519VerificationKey2018,
            key: assertKey,
            purpose: VerificationKeyPurpose.AssertionMethod,
          },
        ],
      },
      secret: {
        didPrivateKey,
      },
    })

    console.log(JSON.stringify(createResult))

    expect(createResult.didState).toMatchObject({ state: 'finished' })

    const id = createResult.didState.did!
    const namespaceIdentifier = id.split(':').pop()
    const document = createResult.didState.didDocument!

    expect(JsonTransformer.toJSON(document)).toMatchObject({
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/secp256k1recovery-2020/v2',
        // 'https://w3id.org/security/v3-unstable',
        'https://w3id.org/security/suites/ed25519-2018/v1',
      ],
      verificationMethod: [
        {
          id: `${id}#controller`,
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: id,
          blockchainAccountId: `eip155:1337:${namespaceIdentifier}`,
        },
        {
          id: `${id}#delegate-1`,
          type: 'Ed25519VerificationKey2018',
          controller: id,
          publicKeyBase58: assertKey.publicKeyBase58,
        },
      ],
      service: [
        {
          id: `${id}#service-1`,
          serviceEndpoint: 'https://example.com/endpoint',
          type: 'endpoint',
        },
      ],
      authentication: [`${id}#controller`],
      assertionMethod: [`${id}#controller`, `${id}#delegate-1`],
    })

    const resolvedDid = await agent.dids.resolve(id)

    console.log(JSON.stringify(resolvedDid))

    expect(JsonTransformer.toJSON(resolvedDid.didDocument)).toMatchObject(JsonTransformer.toJSON(document))
  })
})
