import { AgentContext, DependencyManager, Module } from "@aries-framework/core"
import { IndyBesuModuleConfig, IndyBesuModuleConfigOptions } from "./IndyBesuModuleConfig"
import { IndyBesuLedgerService } from "./ledger/IndyBesuLedgerService"

export class IndyBesuModule implements Module {
    public readonly config: IndyBesuModuleConfig
  
    public constructor(options: IndyBesuModuleConfigOptions) {
      this.config = new IndyBesuModuleConfig(options)
    }
  
    public register(dependencyManager: DependencyManager) {
      // Register config
      dependencyManager.registerInstance(IndyBesuModuleConfig, this.config)
  
      dependencyManager.registerSingleton(IndyBesuLedgerService)

    }
  
    public async initialize(agentContext: AgentContext): Promise<void> {
      const ledgerService = agentContext.dependencyManager.resolve(IndyBesuLedgerService)
      await ledgerService.initContracts()
    }
  }