import { Agent, Buffer, JsonTransformer, Key, KeyType, TypedArrayEncoder } from '@aries-framework/core'
import crypto from 'crypto'
import { getAgentOptions } from '../../core/tests/helpers'
import { getBesuIndyModules, trusteePrivateKey } from './indy-bese-test-utils'
import { IndyBesuDidCreateOptions } from '../src/dids'

const agentOptions = getAgentOptions('Faber', {}, getBesuIndyModules())

describe('Indy-Besu DID', () => {
  let agent: Agent<ReturnType<typeof getBesuIndyModules>>
  let trusteeKey: Key

  beforeAll(async () => {
    agent = new Agent(agentOptions)
    await agent.initialize()
    trusteeKey = await agent.wallet.createKey({
      keyType: KeyType.K256,
      privateKey: trusteePrivateKey,
    })
  })

  afterAll(async () => {
    await agent.shutdown()
    await agent.wallet.delete()
  })

  it('create and resolve a did:indy2 did', async () => {
    const didPrivateKey = Buffer.from(crypto.randomBytes(32))

    const createResult = await agent.dids.create<IndyBesuDidCreateOptions>({
      method: 'ethr',
      options: {
        network: 'testnet',
        endpoints: [
          {
            type: 'endpoint',
            endpoint: 'https://example.com/endpoint',
          },
        ],
        accountKey: trusteeKey,
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
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/secp256k1recovery-2020/v2'],
      verificationMethod: [
        {
          id: `${id}#controller`,
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: id,
          blockchainAccountId: `eip155:1337:${namespaceIdentifier}`
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
    })

    const resolvedDid = await agent.dids.resolve(id)

    console.log(JSON.stringify(resolvedDid))


    expect(JsonTransformer.toJSON(resolvedDid.didDocument)).toMatchObject(JsonTransformer.toJSON(document))
  })
})
