import { Agent, TypedArrayEncoder } from '@aries-framework/core'
import { getAgentOptions } from '../../core/tests/helpers'
import { getBesuIndyModules } from './indy-bese-test-utils'
import { IndyBesuDidCreateOptions } from '../src/dids'
import { IndyBesuLedgerService } from '../src/ledger'

const agentOptions = getAgentOptions('Faber 1 Dids Registrar', {}, getBesuIndyModules())

describe('Indy-Besu DID registrar', () => {
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

  it('should create a did:indy2 did', async () => {
    const did = await agent.dids.create<IndyBesuDidCreateOptions>({
      method: 'indy2',
      options: {
        network: 'testnet',
      },
      secret: {
        privateKey: TypedArrayEncoder.fromHex('8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63'),
      },
    })

    console.log(JSON.stringify(did))

    expect(did.didState).toMatchObject({ state: 'finished' })
  })
})
