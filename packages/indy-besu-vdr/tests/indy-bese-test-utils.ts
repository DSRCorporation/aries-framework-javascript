import { AskarModule } from '@aries-framework/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { Buffer, DidsModule, TypedArrayEncoder } from '@aries-framework/core'
import { IndyBesuDidRegistrar } from '../src/dids/IndyBesuDidRegistrar'
import { IndyBesuDidResolver } from '../src/dids/IndyBesuDidResolver'
import { IndyBesuModule } from '../src/IndyBesuModule'
import { computeAddress } from 'ethers'

export const getBesuIndyModules = () => ({
  indyBesuVdr: new IndyBesuModule({ chainId: 1337, nodeAddress: 'http://localhost:8545' }),
  dids: new DidsModule({
    registrars: [new IndyBesuDidRegistrar()],
    resolvers: [new IndyBesuDidResolver()],
  }),
  askar: new AskarModule({
    ariesAskar,
  }),
})

export const trusteePrivateKey = TypedArrayEncoder.fromHex(
  'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3'
)

export function buildDid(method: string, network: string, key: Buffer): string {
  const namespaceIdentifier = computeAddress(`0x${TypedArrayEncoder.toHex(key)}`)

  return `did:${method}:${network}:${namespaceIdentifier}`
}
