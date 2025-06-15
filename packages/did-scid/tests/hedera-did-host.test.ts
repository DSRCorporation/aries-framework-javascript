import { sleep } from '../../core/src/utils/sleep'
import { HederaDidHostService } from '../src/dids/hosts'
import { HEDERA_DID_HOST_CONFIG, OPERATOR_KEY_BYTES } from './helpers'

const MOCK_SCID = 'mock-scid'

const MOCK_DID_LOG = {
  versionId: `1-${MOCK_SCID}`,
  versionTime: '2024-09-26T23:22:26Z',
  parameters: {
    updateKeys: ['z6MkhbNRN2Q9BaY9TvTc2K3izkhfVwgHiXL7VWZnTqxEvc3R'],
    nextKeyHashes: ['QmXC3vvStVVzCBHRHGUsksGxn6BNmkdETXJGDBXwNSTL33'],
    method: 'did:webvh:0.5',
    scid: MOCK_SCID,
  },
  state: {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: `did:webvh:${MOCK_SCID}:domain.example`,
  },
  proof: [
    {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-jcs-2022',
      verificationMethod:
        'did:key:z6MkhbNRN2Q9BaY9TvTc2K3izkhfVwgHiXL7VWZnTqxEvc3R#z6MkhbNRN2Q9BaY9TvTc2K3izkhfVwgHiXL7VWZnTqxEvc3R',
      created: '2024-09-26T23:22:26Z',
      proofPurpose: 'authentication',
      proofValue: 'z2fPF6fMewtV15kji2N432R7RjmmFs8p7MiSHSTM9FoVmJPtc3JUuZ472pZKoWgZDuT75EDwkGmZbK8ZKVF55pXvx',
    },
  ],
}

const MOCK_DID_LOG_UPDATED = {
  versionId: `2-${MOCK_SCID}`,
  versionTime: '2024-09-28T23:22:26Z',
  parameters: {
    updateKeys: ['z6MkhbNRN2Q9BaY9TvTc2K3izkhfVwgHiXL7VWZnTqxEvc3R'],
    nextKeyHashes: ['QmXC3vvStVVzCBHRHGUsksGxn6BNmkdETXJGDBXwNSTL33'],
    method: 'did:webvh:0.5',
    scid: MOCK_SCID,
  },
  state: {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: `did:webvh:${MOCK_SCID}:domain.example`,
    service: [
      {
        id: 'did:tdw:QmfGEUAcMpzo25kF2Rhn8L5FAXysfGnkzjwdKoNPi615XQ:domain.example#domain',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://domain.example',
      },
      {
        id: 'did:tdw:QmfGEUAcMpzo25kF2Rhn8L5FAXysfGnkzjwdKoNPi615XQ:domain.example#whois',
        type: 'LinkedVerifiablePresentation',
        serviceEndpoint: 'https://domain.example/.well-known/whois.vc',
      },
    ],
  },
  proof: [
    {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-jcs-2022',
      verificationMethod:
        'did:key:z6MkhbNRN2Q9BaY9TvTc2K3izkhfVwgHiXL7VWZnTqxEvc3R#z6MkhbNRN2Q9BaY9TvTc2K3izkhfVwgHiXL7VWZnTqxEvc3R',
      created: '2024-09-28T23:22:26Z',
      proofPurpose: 'authentication',
      proofValue: 'z2nkLj9rYAMG7TStpvihuo4HTovpC7uvWcDoYiGhoN8cqQuiwW2EnPZdWtid2FZAQDQPoaNkTooKVftGKDTh9p3Fy',
    },
  ],
}

describe('Hedera DID Host', () => {
  it.each([
    'invalid_host_str',
    'another_host:testnet:0.0.1',
    'hedera:invalid_network:0.0.1',
    'hedera:testnet:invalid_topic_0.0.0.0.1',
  ])('should throw on invalid host', async (invalidHost: string) => {
    const hostService = new HederaDidHostService(HEDERA_DID_HOST_CONFIG)
    await expect(hostService.resolveVerificationMetadata(MOCK_SCID, invalidHost)).rejects.toThrow()
  })

  it('should create and resolve verification metadata', async () => {
    const hostService = new HederaDidHostService(HEDERA_DID_HOST_CONFIG)

    const hostString = await hostService.registerVerificationMetadata(MOCK_SCID, 'testnet', OPERATOR_KEY_BYTES, [
      MOCK_DID_LOG,
    ])
    expect(hostString).toContain('hedera:testnet:')

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    let resolutionResult = await hostService.resolveVerificationMetadata(MOCK_SCID, hostString)
    expect(resolutionResult).toEqual([MOCK_DID_LOG])

    await hostService.addVerificationMetadataEntry(MOCK_SCID, hostString, OPERATOR_KEY_BYTES, MOCK_DID_LOG_UPDATED)

    // Wait until changes are propagated to Hedera Mirror node
    await sleep(5000)

    resolutionResult = await hostService.resolveVerificationMetadata(MOCK_SCID, hostString)
    expect(resolutionResult).toEqual([MOCK_DID_LOG, MOCK_DID_LOG_UPDATED])
  })
})
