import { Agent, Buffer, JsonTransformer, Key, KeyType, TypedArrayEncoder } from '@aries-framework/core'
import crypto from "crypto";
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

    const createdDid = await agent.dids.create<IndyBesuDidCreateOptions>({
      method: 'indy2',
      options: {
        network: 'testnet',
        endpoints: [
          {
            type: 'endpoint',
            endpoint: 'https://example.com/endpoint',
          },
        ],
      },
      secret: {
        accountKey: trusteeKey,
        didPrivateKey,
      },
    })

    expect(createdDid.didState).toMatchObject({ state: 'finished' })

    const id = createdDid.didState.did!

    const resolvedDid = await agent.dids.resolve(id)

    console.log(JSON.stringify(resolvedDid))

    expect(JsonTransformer.toJSON(resolvedDid.didDocument)).toMatchObject({
      '@context': ['https://w3id.org/did/v1', 'https://www.w3.org/ns/did/v1'],
      verificationMethod: [
        {
          id: `${id}#KEY-1`,
          type: 'EcdsaSecp256k1VerificationKey2019',
          controller: id,
          publicKeyMultibase: createdDid.didState.didDocument!.verificationMethod![0].publicKeyMultibase,
        },
      ],
      service: [
        {
          id:  `${id}#endpoint`,
          serviceEndpoint: 'https://example.com/endpoint',
          type: 'endpoint',
        },
      ],
      authentication: [`${id}#KEY-1`],
    })
  })
})
