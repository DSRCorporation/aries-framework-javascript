import { AnonCredsModule } from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import { Agent, Cache, CacheModule, DidsModule, Logger, utils, ModulesMap } from '@credo-ts/core'
import {
  HederaAnonCredsRegistry,
  HederaDidRegistrar,
  HederaDidResolver,
  HederaModule,
  HederaModuleConfigOptions,
} from '@credo-ts/hedera'
import { agentDependencies } from '@credo-ts/node'
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { askar } from '@openwallet-foundation/askar-nodejs'
import { InMemoryTailsFileService } from '../../../../anoncreds/tests/InMemoryTailsFileService'

export const getHederaModuleConfig = (props: { operatorId?: string; operatorKey?: string }) => {
  const operatorId = props.operatorId ?? process.env.HEDERA_OPERATOR_ID ?? ''
  const operatorKey = props.operatorKey ?? process.env.HEDERA_OPERATOR_KEY ?? ''
  const config: HederaModuleConfigOptions = {
    networks: [
      {
        network: 'testnet',
        operatorId,
        operatorKey,
      },
    ],
  }
  return config
}

export const getHederaAgent = (props: {
  operatorId?: string
  operatorKey?: string
  label?: string
  logger?: Logger
  cache?: Cache
}) => {
  const label = props.label ?? utils.uuid()
  const logger = props.logger
  const cache = props.cache

  let modules: ModulesMap = {
    askar: new AskarModule({ askar, store: { id: label, key: label } }),
    anoncreds: new AnonCredsModule({
      anoncreds,
      registries: [new HederaAnonCredsRegistry()],
      tailsFileService: new InMemoryTailsFileService(),
    }),
    dids: new DidsModule({
      resolvers: [new HederaDidResolver()],
      registrars: [new HederaDidRegistrar()],
    }),
    hedera: new HederaModule(getHederaModuleConfig(props)),
  }
  if (cache) {
    modules = { ...modules, cache: new CacheModule({ cache }) }
  }

  return new Agent({
    config: { label, logger },
    dependencies: agentDependencies,
    modules,
  })
}
