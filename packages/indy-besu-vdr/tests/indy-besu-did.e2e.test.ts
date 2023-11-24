import {
  Agent,
  JsonTransformer,
  TypedArrayEncoder,
} from '@aries-framework/core'
import { getAgentOptions } from '../../core/tests/helpers'
import { getBesuIndyModules } from './indy-bese-test-utils'
import { IndyBesuDidCreateOptions } from '../src/dids'
import { IndyBesuLedgerService } from '../src/ledger'

const agentOptions = getAgentOptions('Faber', {}, getBesuIndyModules())

describe('Indy-Besu DID', () => {
  let agent: Agent<ReturnType<typeof getBesuIndyModules>>

  beforeAll(async () => {
    agent = new Agent(agentOptions)
    await agent.initialize()
  })

  afterAll(async () => {
    agent.dependencyManager.resolve(IndyBesuLedgerService).destroyProvider()
    await agent.shutdown()
    await agent.wallet.delete()
  })

  it('create and resolve a did:indy2 did', async () => {
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
        privateKey: TypedArrayEncoder.fromHex('8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63'),
      },
    })

    expect(createdDid.didState).toMatchObject({ state: 'finished' })

    const resolvedDid = await agent.dids.resolve(createdDid.didState.did!)

    console.log(JSON.stringify(resolvedDid))

    expect(JsonTransformer.toJSON(resolvedDid.didDocument)).toMatchObject({
      '@context': ['https://w3id.org/did/v1', 'https://www.w3.org/ns/did/v1'],
      verificationMethod: [
        {
          id: 'did:indy2:testnet:4JG9HccaMGUS4E5k2gYVne#KEY-1',
          type: 'EcdsaSecp256k1VerificationKey2019',
          controller: 'did:indy2:testnet:4JG9HccaMGUS4E5k2gYVne',
          publicKeyMultibase: 'zQ3shN4cFC5oaCVKL37yh5Jn6mvpXMEb6wyjd29C25SuZkiL9',
        },
      ],
      service: [
        {
          id: 'did:indy2:testnet:4JG9HccaMGUS4E5k2gYVne#endpoint',
          serviceEndpoint: 'https://example.com/endpoint',
          type: 'endpoint',
        },
      ],
      authentication: ['did:indy2:testnet:4JG9HccaMGUS4E5k2gYVne#KEY-1'],
    })
  })
})
