import { Agent, type DidDocument, Kms, VERIFICATION_METHOD_TYPE_MULTIKEY } from '@credo-ts/core'
import { type DidScidCreateOptions, DidScidMethodType, type DidScidUpdateOptions } from '../src'
import { parseDidScid } from '../src/dids/identifiers'
import { getDidScidModules } from './helpers'

import { sleep } from '../../core/src/utils/sleep'
import { getAgentOptions } from '../../core/tests/helpers'
import { getVhRelativeVerificationMethodId } from "../src/dids/utils"

const agentOptions = getAgentOptions('DID SCID Test', {}, {}, getDidScidModules())

async function createDidScid(agent: Agent): Promise<{ did: string; didDocument: DidDocument }> {
  const creationResult = await agent.dids.create<DidScidCreateOptions>({
    method: 'scid',
    options: {
      methodType: DidScidMethodType.vh,
      host: 'hedera',
      location: 'testnet',
    },
  })

  const { state, did, didDocument } = creationResult.didState

  if (state !== 'finished' || !did || !didDocument) {
    throw new Error('Failed to create DID SCID')
  }

  return { did, didDocument }
}

describe('DID SCID', () => {
  let agent: Agent<ReturnType<typeof getDidScidModules>>

  beforeAll(async () => {
    agent = new Agent(agentOptions)
    await agent.initialize()
  })

  afterAll(async () => {
    await agent.shutdown()
  })

  it('should create did:scid DID', async () => {
    const { did } = await createDidScid(agent)

    const parsedDidScid = parseDidScid(did)
    expect(parsedDidScid.method).toBe('scid')
    expect(parsedDidScid.methodType).toBe(DidScidMethodType.vh)
    expect(parsedDidScid.host).toContain('hedera:testnet:')
  })

  it('should resolve did:scid DID', async () => {
    const { did, didDocument } = await createDidScid(agent)

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    const resolutionResult = await agent.dids.resolve(did)

    const { didDocument: resolvedDidDocument } = resolutionResult
    expect(resolvedDidDocument).toEqual(didDocument)
  })

  it('should update did:scid DID', async () => {
    const { did, didDocument } = await createDidScid(agent)

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    const key = await agent.kms.createKey({
      type: {
        crv: 'Ed25519',
        kty: 'OKP',
      },
    })
    const publicKeyJwk = Kms.PublicJwk.fromPublicJwk(key.publicJwk)
    const publicKeyMultibase = publicKeyJwk.fingerprint

    const verificationMethodToAdd = {
      id: publicKeyMultibase,
      controller: didDocument.id,
      type: VERIFICATION_METHOD_TYPE_MULTIKEY,
      publicKeyMultibase,
    }

    const { didState } = await agent.dids.update<DidScidUpdateOptions>({
      did,
      didDocument: { verificationMethod: [verificationMethodToAdd] },
      options: {
        keys: [{kmsKeyId: publicKeyJwk.keyId, didDocumentRelativeKeyId: getVhRelativeVerificationMethodId(publicKeyMultibase)}]
      },
    })

    const { state, didDocument: updatedDidDocument } = didState
    expect(state).toBe('finished')

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    const resolutionResult = await agent.dids.resolve(did)

    const { didDocument: resolvedDidDocument } = resolutionResult
    expect(resolvedDidDocument).toEqual(updatedDidDocument)
  })

  it('should deactivate did:scid DID', async () => {
    const { did, didDocument } = await createDidScid(agent)

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    const { didState } = await agent.dids.deactivate({ did })
    expect(didState.state).toBe('finished')
    expect(didState.didDocument).toEqual(didDocument)

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    const resolutionResult = await agent.dids.resolve(did, { useLocalCreatedDidRecord: false })

    const { didDocument: resolvedDidDocument, didDocumentMetadata } = resolutionResult
    expect(resolvedDidDocument).toEqual(didDocument)
    expect(didDocumentMetadata.deactivated).toEqual(true)
  })
})
