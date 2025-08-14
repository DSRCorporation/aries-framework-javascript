import {
  Agent,
  ConsoleLogger,
  DidDocument,
  DidDocumentKey,
  DidDocumentService,
  LogLevel,
  VerificationMethod,
} from '@credo-ts/core'
import { HederaDidCreateOptions, HederaDidUpdateOptions } from '../../src/ledger/HederaLedgerService'
import { getMultibasePublicKey } from '../../src/ledger/utils'
import { getHederaAgent } from './utils'

describe('Hedera DID registrar', () => {
  const logger = new ConsoleLogger(LogLevel.error)
  let agent: Agent

  const validDid = 'did:hedera:testnet:44eesExqdsUvLZ35FpnBPErqRGRnYbzzyG3wgCCYxkmq_0.0.6226170'

  function validVerificationMethod(publicKeyMultibase?: string) {
    return new VerificationMethod({
      id: '#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: validDid,
      publicKeyMultibase: publicKeyMultibase ?? 'z44eesExqdsUvLZ35FpnBPErqRGRnYbzzyG3wgCCYxkmq',
    })
  }

  function validService() {
    return new DidDocumentService({
      id: '#service-1',
      type: 'CustomType',
      serviceEndpoint: ['https://rand.io'],
    })
  }

  function validDidDoc(publicKeyMultibase?: string) {
    const service = [validService()]
    const verificationMethod = [validVerificationMethod(publicKeyMultibase)]

    return new DidDocument({
      id: validDid,
      verificationMethod,
      service,
    })
  }

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

  it('should create a did:hedera did document', async () => {
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

  it('should create a did:hedera did document with document presets', async () => {
    const { keyId, publicJwk } = await agent.kms.createKey({
      type: {
        crv: 'Ed25519',
        kty: 'OKP',
      },
    })
    const multibasePublicKey = getMultibasePublicKey(publicJwk)
    const keys: DidDocumentKey[] = [
      {
        kmsKeyId: keyId,
        didDocumentRelativeKeyId: '#key-1',
      },
    ]

    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      didDocument: validDidDoc(multibasePublicKey),
      options: { network: 'testnet' },
      secret: { keys },
    })
    expect(didResult.didState.state).toEqual('finished')

    const verificationMethod = validVerificationMethod(multibasePublicKey)
    expect(didResult.didState.didDocument?.verificationMethod).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining('#did-root-key'),
          type: expect.any(String),
          controller: didResult.didState.didDocument?.id,
          publicKeyMultibase: expect.any(String),
        }),
        expect.objectContaining({
          id: expect.stringContaining(verificationMethod.id),
          type: verificationMethod.type,
          controller: verificationMethod.controller,
          publicKeyMultibase: verificationMethod.publicKeyMultibase,
        }),
      ])
    )

    const service = validService()
    expect(didResult.didState.didDocument?.service).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining(service.id),
          type: service.type,
          serviceEndpoint: service.serviceEndpoint,
        }),
      ])
    )
  })

  it('should create a did:hedera did document, add and remove service', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: {
        network: 'testnet',
      },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did ?? ''
    const didDocument = didResult.didState.didDocument as DidDocument
    didDocument.service = [validService()]

    const addUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })

    expect(addUpdateResult.didState.state).toEqual('finished')
    expect(addUpdateResult.didState.didDocument?.id).toEqual(did)

    const resolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })
    expect(resolvedDocument.didDocument?.id).toEqual(did)

    const service = validService()
    expect(resolvedDocument.didDocument?.service).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining(service.id),
          type: service.type,
          serviceEndpoint: service.serviceEndpoint,
        }),
      ])
    )

    const removeUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument: {
        ...didDocument,
        verificationMethod: undefined,
      },
      didDocumentOperation: 'removeFromDidDocument',
    })

    expect(removeUpdateResult.didState.state).toEqual('finished')
    expect(removeUpdateResult.didState.didDocument?.id).toEqual(did)

    const removeResolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })
    expect(removeResolvedDocument.didDocument?.id).toEqual(did)
    expect(removeResolvedDocument.didDocument?.service ?? []).toHaveLength(0)
  })

  it('should create a did:hedera did document, add and remove verification method', async () => {
    const { keyId, publicJwk } = await agent.kms.createKey({
      type: {
        crv: 'Ed25519',
        kty: 'OKP',
      },
    })
    const multibasePublicKey = getMultibasePublicKey(publicJwk)
    const keys: DidDocumentKey[] = [
      {
        kmsKeyId: keyId,
        didDocumentRelativeKeyId: '#key-1',
      },
    ]

    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: { network: 'testnet' },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did ?? ''
    const didDocument = didResult.didState.didDocument as DidDocument

    const validVerification = validVerificationMethod(multibasePublicKey)
    didDocument.verificationMethod = [validVerification]

    const addUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
      secret: {
        keys,
      },
    })
    expect(addUpdateResult.didState.didDocument?.id).toEqual(did)
    expect(addUpdateResult.didState.state).toEqual('finished')

    const addResolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })

    expect(addResolvedDocument.didDocument?.id).toEqual(did)
    expect(addResolvedDocument.didDocument?.verificationMethod).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining(validVerification.id),
          type: validVerification.type,
          controller: validVerification.controller,
          publicKeyMultibase: validVerification.publicKeyMultibase,
        }),
      ])
    )

    const removeUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'removeFromDidDocument',
      secret: {
        keys,
      },
    })
    expect(removeUpdateResult.didState.didDocument?.id).toEqual(did)
    expect(removeUpdateResult.didState.state).toEqual('finished')

    const removeResolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })

    expect(removeResolvedDocument.didDocument?.id).toEqual(did)
    expect(removeResolvedDocument.didDocument?.service ?? []).toHaveLength(0)
  })

  it('should create a did:hedera did document, but should not add verification method without required keys', async () => {
    const { publicJwk } = await agent.kms.createKey({
      type: {
        crv: 'Ed25519',
        kty: 'OKP',
      },
    })
    const multibasePublicKey = getMultibasePublicKey(publicJwk)

    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: { network: 'testnet' },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did ?? ''
    const didDocument = didResult.didState.didDocument as DidDocument

    const validVerification = validVerificationMethod(multibasePublicKey)
    didDocument.verificationMethod = [validVerification]

    let updateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })
    expect(updateResult.didState.state).toEqual('failed')
    if (updateResult.didState.state === 'failed')
      expect(updateResult.didState.reason).toEqual(
        'Unable update DID: Key #key-1 from verificationMethod not found in keys'
      )

    didDocument.verificationMethod = undefined
    didDocument.assertionMethod = [validVerification]

    updateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })
    expect(updateResult.didState.state).toEqual('failed')
    if (updateResult.didState.state === 'failed')
      expect(updateResult.didState.reason).toEqual(
        'Unable update DID: Key #key-1 from assertionMethod not found in keys'
      )

    didDocument.assertionMethod = undefined
    didDocument.authentication = [validVerification]

    updateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })
    expect(updateResult.didState.state).toEqual('failed')
    if (updateResult.didState.state === 'failed')
      expect(updateResult.didState.reason).toEqual(
        'Unable update DID: Key #key-1 from authentication not found in keys'
      )

    didDocument.authentication = undefined
    didDocument.capabilityDelegation = [validVerification]

    updateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })
    expect(updateResult.didState.state).toEqual('failed')
    if (updateResult.didState.state === 'failed')
      expect(updateResult.didState.reason).toEqual(
        'Unable update DID: Key #key-1 from capabilityDelegation not found in keys'
      )

    didDocument.capabilityDelegation = undefined
    didDocument.capabilityInvocation = [validVerification]

    updateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })
    expect(updateResult.didState.state).toEqual('failed')
    if (updateResult.didState.state === 'failed')
      expect(updateResult.didState.reason).toEqual(
        'Unable update DID: Key #key-1 from capabilityInvocation not found in keys'
      )

    didDocument.capabilityInvocation = undefined
    didDocument.keyAgreement = [validVerification]

    updateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
    })
    expect(updateResult.didState.state).toEqual('failed')
    if (updateResult.didState.state === 'failed')
      expect(updateResult.didState.reason).toEqual('Unable update DID: Key #key-1 from keyAgreement not found in keys')
  })

  it('should create and deactivate a did:hedera did', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: {
        network: 'testnet',
      },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did ?? ''

    const deactivateResult = await agent.dids.deactivate({
      did,
    })

    expect(deactivateResult.didState.didDocument?.id).toEqual(did)
    expect(deactivateResult.didState.state).toEqual('finished')

    const resolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })
    expect(resolvedDocument.didDocumentMetadata.deactivated).toBe(true)
  })
})
