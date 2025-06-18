import { type AgentContext, injectable } from '@credo-ts/core'
import { HederaAnoncredsRegistry } from '@hiero-did-sdk-js/anoncreds'
import { HederaDidService } from '@hiero-did-sdk-js/did'
import { HederaModuleConfig } from '../HederaModuleConfig'
import { HederaLedgerServiceCache } from './HederaLedgerServiceCache'

@injectable()
export class HederaLedgerService {
  public constructor(private readonly hederaModuleConfig: HederaModuleConfig) {}

  public getHederaAnonCredsSdk(agentContext: AgentContext): HederaAnoncredsRegistry {
    const cache = this.hederaModuleConfig.options.cache ?? new HederaLedgerServiceCache(agentContext)
    return new HederaAnoncredsRegistry({ ...this.hederaModuleConfig.options, cache })
  }

  public getHederaDidSdk(_agentContext: AgentContext): HederaDidService {
    return new HederaDidService({ ...this.hederaModuleConfig.options })
  }
}
