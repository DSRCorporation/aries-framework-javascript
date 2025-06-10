import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { getHederaAgent, waitTimeout } from './utils'

const logger = new ConsoleLogger(LogLevel.error)

const did = 'did:hedera:testnet:zGdjMu1hPkjbJXSPPp6RgTptnpYYM9uEkPeNbPhSkXTon_0.0.5139753'

describe('Hedera Module did resolver', () => {
  let aliceAgent: Agent

  beforeAll(async () => {
    const aliceAgent = getHederaAgent({
      logger,
      label: 'alice',
    })
    await aliceAgent.initialize()
  })

  afterAll(async () => {
    // Wait for messages to flush out
    await waitTimeout(1000)

    if (aliceAgent) {
      await aliceAgent.shutdown()
    }
  })

  describe('HederaDidResolver', () => {
    it('should resolve a hedera did when valid did is passed', async () => {
      const resolvedDIDDoc = await aliceAgent.dids.resolve(did)
      expect(resolvedDIDDoc).toBeDefined()
    })
  })
})
