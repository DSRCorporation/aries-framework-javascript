import { Agent, ConsoleLogger, DidDocument, DidDocumentService, LogLevel, VerificationMethod } from '@credo-ts/core'
import {
  HederaDidCreateOptions,
  HederaDidDeactivateOptions,
  HederaDidUpdateOptions,
} from '../src/ledger/HederaLedgerService'
import { getHederaAgent } from './utils'

describe('Hedera DID registrar', () => {
  const privateKey = process.env.HEDERA_TEST_OPERATOR_KEY ?? ''
  const logger = new ConsoleLogger(LogLevel.error)
  let agent: Agent

  const validDid = 'did:hedera:testnet:44eesExqdsUvLZ35FpnBPErqRGRnYbzzyG3wgCCYxkmq_0.0.6226170'

  function validVerificationMethod() {
    return new VerificationMethod({
      id: '#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: validDid,
      publicKeyMultibase: 'z44eesExqdsUvLZ35FpnBPErqRGRnYbzzyG3wgCCYxkmq',
    })
  }

  function validService() {
    return new DidDocumentService({
      id: '#service-1',
      type: 'CustomType',
      serviceEndpoint: ['https://rand.io'],
    })
  }

  function validDidDoc() {
    const service = [validService()]
    const verificationMethod = [validVerificationMethod()]

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
      secret: { privateKey },
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
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      didDocument: validDidDoc(),
      options: { network: 'testnet' },
      secret: { privateKey },
    })
    expect(didResult.didState.state).toEqual('finished')

    const verificationMethod = validVerificationMethod()
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
    // create document
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: {
        network: 'testnet',
      },
      secret: {
        privateKey,
      },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did!
    const didDocument = didResult.didState.didDocument as DidDocument
    didDocument.service = [validService()]

    // add service to the document
    const addUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
      secret: {
        privateKey,
      },
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

    // remove service from the document
    const removeUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument: {
        ...didDocument,
        verificationMethod: undefined,
      },
      didDocumentOperation: 'removeFromDidDocument',
      secret: {
        privateKey,
      },
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
    // create did document
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: { network: 'testnet' },
      secret: { privateKey },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did!
    const didDocument = didResult.didState.didDocument as DidDocument

    const validVerification = validVerificationMethod()
    didDocument.verificationMethod = [validVerification]

    // add verification method to the document
    const addUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'addToDidDocument',
      secret: {
        privateKey,
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

    // remove verification method from the document
    const removeUpdateResult = await agent.dids.update<HederaDidUpdateOptions>({
      did,
      didDocument,
      didDocumentOperation: 'removeFromDidDocument',
      secret: {
        privateKey,
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

  it('should create and deactivate a did:hedera did', async () => {
    const didResult = await agent.dids.create<HederaDidCreateOptions>({
      method: 'hedera',
      options: {
        network: 'testnet',
      },
      secret: {
        privateKey,
      },
    })
    expect(didResult).toMatchObject({ didState: { state: 'finished' } })

    const did = didResult.didState.did!

    const deactivateResult = await agent.dids.deactivate<HederaDidDeactivateOptions>({
      did,
      secret: {
        privateKey,
      },
    })

    expect(deactivateResult.didState.didDocument?.id).toEqual(did)
    expect(deactivateResult.didState.state).toEqual('finished')

    const resolvedDocument = await agent.dids.resolve(did, {
      useLocalCreatedDidRecord: false,
    })
    expect(resolvedDocument.didDocumentMetadata.deactivated).toBe(true)
  })
})
