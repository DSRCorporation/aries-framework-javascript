import { AgentContext, DependencyManager, Module } from '@aries-framework/core'
import { IndyBesuModuleConfig, IndyBesuModuleConfigOptions } from './IndyBesuModuleConfig'
import { CredentialDefinitionRegistry, DidRegistry, SchemaRegistry } from './ledger'
import { LedgerClient } from 'indy2-vdr'

export class IndyBesuModule implements Module {
  public readonly config: IndyBesuModuleConfig

  public constructor(options: IndyBesuModuleConfigOptions) {
    this.config = new IndyBesuModuleConfig(options)
  }

  public register(dependencyManager: DependencyManager) {
    const client = new LedgerClient(
      this.config.chainId,
      this.config.nodeAddress,
      [DidRegistry.config, SchemaRegistry.config, CredentialDefinitionRegistry.config],
      null
    )

    dependencyManager.registerInstance(LedgerClient, client)
    dependencyManager.registerSingleton(DidRegistry)
    dependencyManager.registerSingleton(SchemaRegistry)
    dependencyManager.registerSingleton(CredentialDefinitionRegistry)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const client = agentContext.dependencyManager.resolve(LedgerClient)
    await client.ping()
  }
}
