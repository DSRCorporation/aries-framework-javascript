import { AskarModule } from '@aries-framework/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { DidsModule } from '@aries-framework/core'
import { IndyBesuDidRegistrar } from '../src/dids/IndyBesuDidRegistrar'
import { IndyBesuDidResolver } from '../src/dids/IndyBesuDidResolver'
import { IndyBesuModule } from '../src/IndyBesuModule'

export const getBesuIndyModules = (rpcUrl?: string) => ({
  indyBesuVdr: new IndyBesuModule({ rpcUrl: 'http://localhost:8545' }),
  dids: new DidsModule({
    registrars: [new IndyBesuDidRegistrar()],
    resolvers: [new IndyBesuDidResolver()],
  }),
  askar: new AskarModule({
    ariesAskar,
  }),
})
