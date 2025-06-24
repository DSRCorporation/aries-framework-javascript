import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { HederaDidCreateOptions, HederaDidDeactivateOptions } from '../src/dids/HederaDidRegistrar'
import { getHederaAgent, waitTimeout } from './utils'

describe('Hedera DID registrar', () => {
  const consensusTimeout = 2000
  const operatorKey = process.env.HEDERA_TEST_OPERATOR_KEY ?? ''

  const logger = new ConsoleLogger(LogLevel.error)

  let agent: Agent

  beforeAll(async () => {
    agent = getHederaAgent({
      logger,
      label: 'alice',
    })
    await agent.initialize()
  })

  afterAll(async () => {
    await agent.shutdown()
  })

  it('should create a did:hedera did', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: { network: 'testnet' },
    })
    expect(didResult).toMatchObject({
      didState: {
        state: 'finished',
        didDocument: {
          verificationMethod: [
            {
              type: 'Ed25519VerificationKey2020',
              publicKeyMultibase: expect.any(String),
            },
          ],
        },
      },
    })
  })

  it('should create and add service to a did:hedera did', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: { network: 'testnet' },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })
  })

  it('should create and add verification to a did:hedera did', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: { network: 'testnet' },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })
  })

  it('should create and deactivate a did:hedera did', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: {
        network: 'testnet',
      },
      secret: {
        privateKey: operatorKey,
      },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did!

    await waitTimeout(consensusTimeout)

    const deactivateResult = await agent.dids.deactivate<HederaDidDeactivateOptions>({
      did,
      secret: {
        privateKey: operatorKey,
      },
    })

    expect(deactivateResult.didState.didDocument?.id).toEqual(did)
    expect(deactivateResult.didState.state).toEqual('finished')

    await waitTimeout(consensusTimeout)

    const resolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })
    expect(resolvedDocument.didDocumentMetadata.deactivated).toBe(true)
  })
})
