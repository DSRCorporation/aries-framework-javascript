import { Agent, ConsoleLogger, JsonTransformer, LogLevel } from '@credo-ts/core'
import { HederaDidCreateOptions } from '../src/ledger/HederaLedgerService'
import { getHederaAgent } from './utils'

describe('Hedera DID resolver', () => {
  const logger = new ConsoleLogger(LogLevel.debug)
  const _privateKey = process.env.HEDERA_TEST_OPERATOR_KEY ?? ''

  let agent: Agent
  let did: string

  beforeAll(async () => {
    agent = getHederaAgent({
      logger,
      label: 'alice',
    })
    await agent.initialize()

    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      secret: {
        createKey: true
      },
    })
    if (!didResult.didState.did) {
      throw new Error('No DID created')
    }
    did = didResult.didState.did

    console.log(JSON.stringify(didResult, null, 2))
  })

  afterAll(async () => {
    await agent.shutdown()
  })

  it('should resolve a did:cheqd did from local testnet', async () => {
    const resolveResult = await agent.dids.resolve(did)

    console.log(JSON.stringify(resolveResult, null, 2))


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
