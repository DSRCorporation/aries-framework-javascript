import { AskarModule } from "@credo-ts/askar"
import { DidsModule } from '@credo-ts/core'
import { DidScidModule, DidScidRegistrar, DidScidResolver } from '@credo-ts/did-scid'
import { PrivateKey } from '@hashgraph/sdk'
import { askar } from "@openwallet-foundation/askar-nodejs"
import { getAskarStoreConfig } from "../../core/tests"
import { type HederaDidHostConfig, HederaDidHostService } from '../src/dids/hosts'

const OPERATOR_ID = process.env.OPERATOR_ID
const OPERATOR_KEY = process.env.OPERATOR_KEY

if (!OPERATOR_ID || !OPERATOR_KEY) {
  throw new Error('OPERATOR_ID and OPERATOR_KEY env variables are required')
}

export const OPERATOR_KEY_BYTES = PrivateKey.fromStringDer(OPERATOR_KEY).toBytes()

export const HEDERA_DID_HOST_CONFIG: HederaDidHostConfig = {
  networks: [{ network: 'testnet', operatorId: OPERATOR_ID, operatorKey: OPERATOR_KEY }],
}

export function getDidScidModules() {
  return {
    scid: new DidScidModule({ hostServices: [new HederaDidHostService(HEDERA_DID_HOST_CONFIG)] }),
    dids: new DidsModule({
      registrars: [new DidScidRegistrar()],
      resolvers: [new DidScidResolver()],
    }),
    askar: new AskarModule({
      askar,
      store: getAskarStoreConfig('DID SCID'),
      enableStorage: false,
      enableKms: true
    }),
  }
}
