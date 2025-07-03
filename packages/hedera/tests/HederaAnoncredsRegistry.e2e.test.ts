import { Agent, ConsoleLogger, LogLevel, utils } from '@credo-ts/core'
import { HederaDidCreateOptions } from '../src/ledger/HederaLedgerService'
import { getHederaAgent } from './utils'
import { testCache } from './utils/testCache'

describe('Hedera AnonCreds support', () => {
  let agent: Agent
  let did: string

  const logger = new ConsoleLogger(LogLevel.error)
  const cache = new testCache()

  beforeAll(async () => {
    // Initialize the agent
    agent = getHederaAgent({
      label: 'alice',
      logger,
      cache,
    })
    await agent.initialize()

    // Making the test did
    const didRegistrarResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
    })
    if (!didRegistrarResult.didState?.didDocument?.id) throw new Error('DidRegistrarError')

    did = didRegistrarResult.didState.didDocument.id
    logger.debug('DID', [did])
  })

  beforeEach(() => {
    cache.clear()
  })

  afterAll(async () => {
    // Wait for messages to flush out
    await new Promise((r) => setTimeout(r, 1000))

    if (agent) {
      await agent.shutdown()
    }
  })

  describe('Hedera Anoncreds Registry', () => {
    it('Full flow (register and resolve schema, credential definition, revocation registry definition, revocation status list)', async () => {
      // Create the schema
      const schemaResult = await agent.modules.anoncreds.registerSchema({
        schema: {
          name: utils.uuid(),
          version: '1',
          issuerId: did,
          attrNames: ['field1'],
        },
        options: {},
      })
      logger.debug('RegisterSchema', [schemaResult])

      const schemaId = schemaResult?.schemaState?.schemaId
      expect(schemaId).toBeDefined()

      // Register credential definition for the schema
      const credDefResult = await agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: {
          tag: 'default',
          issuerId: did,
          schemaId: schemaId!,
        },
        options: {
          supportRevocation: true,
        },
      })

      logger.debug('credDefResult', [credDefResult])
      expect(credDefResult?.credentialDefinitionState?.state).toEqual('finished')

      const credentialDefinitionId = credDefResult.credentialDefinitionState.credentialDefinitionId ?? ''

      // Register revocation registry definition
      const revRegDefRegResult = await agent.modules.anoncreds.registerRevocationRegistryDefinition({
        revocationRegistryDefinition: {
          issuerId: did,
          credentialDefinitionId,
          maximumCredentialNumber: 10,
          tag: 'default',
        },
        options: {},
      })
      logger.debug('revRegDefRegResult', [revRegDefRegResult])
      const revocationRegistryDefinitionId =
        revRegDefRegResult?.revocationRegistryDefinitionState?.revocationRegistryDefinitionId ?? ''
      expect(revocationRegistryDefinitionId).toBeDefined()

      const resolvedRevRegDef =
        await agent.modules.anoncreds.getRevocationRegistryDefinition(revocationRegistryDefinitionId)
      expect(resolvedRevRegDef.revocationRegistryDefinitionId).toEqual(revocationRegistryDefinitionId)

      // Register the init revocation status list
      const registerRevocationStatusListResponse = await agent.modules.anoncreds.registerRevocationStatusList({
        options: {},
        revocationStatusList: {
          issuerId: did,
          revocationRegistryDefinitionId,
        },
      })
      logger.debug('registerRevocationStatusListResponse', [registerRevocationStatusListResponse])
      const revocationStatusList = registerRevocationStatusListResponse?.revocationStatusListState.revocationStatusList
      expect(revocationStatusList).toBeDefined()

      // Resolve the revocation status list
      const revocationStatusListResponse = await agent.modules.anoncreds.getRevocationStatusList(
        revocationRegistryDefinitionId,
        Date.now() / 1000
      )
      logger.debug('revocationStatusListResponse', [revocationStatusListResponse])

      expect(revocationStatusListResponse?.revocationStatusList?.revRegDefId).toEqual(revocationRegistryDefinitionId)
      expect(revocationStatusListResponse?.revocationStatusList?.issuerId).toEqual(did)
      expect(revocationStatusListResponse?.revocationStatusList?.revocationList).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

      // Update revocation status list - Revoke indexes
      const revokeUpdateRevocationStatusListResponse = await agent.modules.anoncreds.updateRevocationStatusList({
        options: {},
        revocationStatusList: {
          revocationRegistryDefinitionId: revocationRegistryDefinitionId,
          issuedCredentialIndexes: undefined,
          revokedCredentialIndexes: [1, 3, 5, 9],
        },
      })
      logger.debug('revokeUpdateRevocationStatusListResponse', [revokeUpdateRevocationStatusListResponse])
      const revokeRevocationStatusList =
        revokeUpdateRevocationStatusListResponse?.revocationStatusListState.revocationStatusList
      expect(revokeRevocationStatusList).toBeDefined()

      // Resolve the revocation status list
      const revokeRevocationStatusListResponse = await agent.modules.anoncreds.getRevocationStatusList(
        revocationRegistryDefinitionId,
        Date.now() / 1000
      )
      logger.debug('revokeRevocationStatusListResponse', [revokeRevocationStatusListResponse])
      expect(revokeRevocationStatusListResponse?.revocationStatusList?.revRegDefId).toEqual(
        revocationRegistryDefinitionId
      )
      expect(revokeRevocationStatusListResponse?.revocationStatusList?.issuerId).toEqual(did)
      expect(revokeRevocationStatusListResponse?.revocationStatusList?.revocationList).toEqual([
        0, 1, 0, 1, 0, 1, 0, 0, 0, 1,
      ])

      // Update revocation status list - Revoke/Issue indexes
      const issueUpdateRevocationStatusListResponse = await agent.modules.anoncreds.updateRevocationStatusList({
        options: {},
        revocationStatusList: {
          revocationRegistryDefinitionId: revocationRegistryDefinitionId,
          issuedCredentialIndexes: [3, 5],
          revokedCredentialIndexes: [4],
        },
      })
      logger.debug('issueUpdateRevocationStatusListResponse', [issueUpdateRevocationStatusListResponse])
      const issueRevocationStatusList =
        issueUpdateRevocationStatusListResponse?.revocationStatusListState.revocationStatusList
      expect(issueRevocationStatusList).toBeDefined()

      // Resolve the revocation status list
      const issueRevocationStatusListResponse = await agent.modules.anoncreds.getRevocationStatusList(
        revocationRegistryDefinitionId,
        Date.now() / 1000
      )
      logger.debug('issueRevocationStatusListResponse', [issueRevocationStatusListResponse])
      expect(issueRevocationStatusListResponse?.revocationStatusList?.revRegDefId).toEqual(
        revocationRegistryDefinitionId
      )
      expect(issueRevocationStatusListResponse?.revocationStatusList?.issuerId).toEqual(did)
      expect(issueRevocationStatusListResponse?.revocationStatusList?.revocationList).toEqual([
        0, 1, 0, 0, 1, 0, 0, 0, 0, 1,
      ])
    })
  })
})
