import { Agent, ConsoleLogger, JsonTransformer, LogLevel } from '@credo-ts/core'
import { HederaDidRegistrar } from '../src/dids'
import { HederaDidCreateOptions } from '../src/dids/HederaDidRegistrar'
import {getHederaAgent, waitTimeout} from './utils'

describe('Hedera DID resolver', () => {
  const logger = new ConsoleLogger(LogLevel.error)

  let agent: Agent
  let did: string

  beforeAll(async () => {
    agent = getHederaAgent({
      logger,
      label: 'alice',
    })
    await agent.initialize()

    const _didRegistrar = agent.dependencyManager.resolve(HederaDidRegistrar)

    const didResult = await agent.dids.create<HederaDidCreateOptions>({ method: 'hedera' })

    await waitTimeout(3000)

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
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
        id: did,
        controller: [did],
        verificationMethod: [
          {
            controller: did,
            id: `${did}#key-1`,
            publicKeyJwk: {
              kty: 'OKP',
              crv: 'Ed25519',
              x: expect.any(String),
            },
            type: 'JsonWebKey2020',
          },
        ],
        authentication: [`${did}#key-1`],
      },
      didDocumentMetadata: {
        created: expect.any(String),
        updated: undefined,
        deactivated: false,
        versionId: expect.any(String),
        nextVersionId: '',
      },
      didResolutionMetadata: {},
    })
  })

})
