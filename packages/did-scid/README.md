# DID SCID Credo Module

:heavy_exclamation_mark: **This package is currently used for demo purposes - do not use for production, issues and
breaking changes are possible**

Credo module that provides support
for [DID SCID Method](https://lf-toip.atlassian.net/wiki/spaces/HOME/pages/88572360/DID+SCID+Method+Specification).

## Features

### DID SCID Method Types

- [x] `vh` - [did:webvh](https://identity.foundation/didwebvh/) verification data format
- [ ] `ke` - [did:webs](https://trustoverip.github.io/tswg-did-method-webs-specification/) verification data format (
  based on [KERI AIDs](https://trustoverip.github.io/tswg-keri-specification/#autonomic-identifier-aid))
- [ ] `jl` - [did:jlinc](https://did-spec.jlinc.org/) verification data format

### Supported DID Hosts

- [Hedera](https://hedera.com/)
    - Initial technical design for hosting DID SCID on Hedera can be
      found [here](https://hashgraph.atlassian.net/wiki/external/Yjg3ZjU0ZjI4MGMyNDUzYWJiZGJmYzUxZDgwMzcyNmY)
    - Significant difference between this implementation and initial design - no shared HCS Topic, HCS Topics per DID
      instead (similar to Hedera DID Method)
        - Works better for long-term read operations performance and helps to avoid additional complexity
        - HCS Topic costs will increase in future so specific approach is a subject for discussions and change

Support for other DID Hosts may be added later, but not planned at the moment.

### AnonCreds support

The module provides generic AnonCreds registry implementation that acts as a proxy for registry that works with specific
DID Host.
This means that VDR that will be used for storing AnonCreds resources for DID SCID Issuer is determined based on DID
Host: Hedera DID Host -> AnonCreds resources are stored on Hedera.

Such approach also introduces a dependency on DID Host Method Module - it seems optimal for use cases of this
implementation, but is a subject for discussion in general.

## Getting started

### Installation

TODO - package is not published to NPM yet

### Adding DID SCID support to Credo Agent

DID SCID module currently depends on integration with Hedera DID Host and Hedera Credo Module.

```typescript
import { Agent, DidsModule } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/react-native'
import { AskarModule } from '@credo-ts/askar'
import { askar } from '@openwallet-foundation/askar-nodejs'

import { DidScidModule, DidScidResolver, DidScidRegistrar, DidScidAnonCredsRegistry } from "@credo-ts/did-scid"
import { HederaModule, HederaAnonCredsRegistry } from "@credo-ts/hedera"

import { AnonCredsModule } from '@credo-ts/anoncreds'
import { anoncreds } from '@hyperledger/anoncreds-react-native'

const agent = new Agent({
    config,
    dependencies: agentDependencies,
    modules: {
        dids: new DidsModule({
            registrars: [new DidScidRegistrar()],
            resolvers: [new DidScidResolver()],
        }),

        // AnonCreds support 
        // Please note that DidScidAnonCredsRegistry requires HederaAnonCredsRegistry to be added as well (as only supported DID Host and VDR)
        anoncreds: new AnonCredsModule({
            registries: [new DidScidAnonCredsRegistry(), new HederaAnonCredsRegistry()],
            anoncreds,
        }),

        // Add did:scid module
        scid: new DidScidModule({
            hostServices: [
                new HederaDidHostService({
                    networks: [
                        {
                            network: 'testnet',
                            operatorId: '<HEDERA_OPERATOR_ID>',
                            operatorKey: '<HEDERA_OPERATOR_KEY>',
                        },
                    ],
                }),
            ],
        }),

        // Add Hedera Module
        hedera: new HederaModule({
            network: 'testnet',
            operatorId: '<HEDERA_OPERATOR_ID>',
            operatorKey: '<HEDERA_OPERATOR_KEY>',
        }),

        askar: new AskarModule({
            askar,
            store: {
                id: '<WALLET_NAME>',
                key: '<WALLET_KEY>',
                database: { type: 'sqlite', config: {} },
            },
            enableStorage: false,
            enableKms: true
        }),
    },
})
```

### Creating DID SCID

```typescript
import { DidScidMethodType, DidScidCreateOptions } from '@credo-ts/did-scid'

await agent.dids.create<DidScidCreateOptions>({
    method: 'scid',
    options: {
        methodType: DidScidMethodType.vh,
        host: 'hedera',
        location: 'testnet',
    },
})
```

### Updating DID SCID

```typescript
import { KeyType, VERIFICATION_METHOD_TYPE_MULTIKEY } from '@credo-ts/core'

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

const { didState } = await agent.dids.update({
    did,
    didDocument: { verificationMethod: [verificationMethodToAdd] },
    options: {
        keys: [{
            kmsKeyId: publicKeyJwk.keyId,
            didDocumentRelativeKeyId: getVhRelativeVerificationMethodId(publicKeyMultibase)
        }]
    },
})
```

### Deactivating DID SCID

```typescript
await agent.dids.deactivate({ did })
```