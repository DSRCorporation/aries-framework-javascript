import type { DependencyManager, Module } from '@credo-ts/core'
import { DidScidModuleConfig, type DidScidModuleConfigOptions } from './DidScidModuleConfig'

export class DidScidModule implements Module {
  public readonly config: DidScidModuleConfig

  public constructor(configOptions: DidScidModuleConfigOptions) {
    this.config = new DidScidModuleConfig(configOptions)
  }

  public register(dependencyManager: DependencyManager) {
    // Register config
    dependencyManager.registerInstance(DidScidModuleConfig, this.config)
  }
}
