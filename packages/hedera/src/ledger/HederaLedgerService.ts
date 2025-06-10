import { type AgentContext, injectable } from '@credo-ts/core'
import { HederaAnoncredsRegistry } from '@hiero-did-sdk-js/anoncreds'
import { HederaDidService } from '@hiero-did-sdk-js/did'
import { HederaLedgerServiceCache, HederaModuleConfig } from '../.'

@injectable()
export class HederaLedgerService {
  private readonly config: HederaModuleConfig

  public constructor(config: HederaModuleConfig) {
    this.config = config
  }

  public getHederaAnonCredsSdk(agentContext: AgentContext): HederaAnoncredsRegistry {
    const cache = this.config.options.cache ?? new HederaLedgerServiceCache(agentContext)
    return new HederaAnoncredsRegistry({ ...this.config.options, cache })
  }

  public getHederaDidSdk(_agentContext: AgentContext): HederaDidService {
    return new HederaDidService({ ...this.config.options })
  }
}
