import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { getHederaAgent, waitTimeout } from './utils'

const logger = new ConsoleLogger(LogLevel.error)

//const did = 'did:hedera:testnet:zGdjMu1hPkjbJXSPPp6RgTptnpYYM9uEkPeNbPhSkXTon_0.0.5139753'

describe('Hedera Module did resolver', () => {
  let agent: Agent

  beforeAll(async () => {
    agent = getHederaAgent({
      logger,
      label: 'alice',
    })
    await agent.initialize()
  })

  afterAll(async () => {
    // Wait for messages to flush out
    await waitTimeout(1000)

    if (agent) {
      await agent.shutdown()
    }
  })

  describe('HederaDidResolver', () => {
    it('should creaste and resolve a hedera did', async () => {
      const didResult = await agent.dids.create({method: 'hedera'})
      await waitTimeout(2000)
      const resolvedDIDDoc = await agent.dids.resolve(didResult.didState.did ?? '')
      expect(resolvedDIDDoc.didDocument?.id).toEqual(didResult.didState.did)
    })
  })
})


