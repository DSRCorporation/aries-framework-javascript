import type { DidHostService } from './dids'

export interface DidScidModuleConfigOptions {
  hostServices: DidHostService[]
}

export class DidScidModuleConfig {
  public readonly hostServices: DidHostService[]

  public constructor(options: DidScidModuleConfigOptions) {
    this.hostServices = options.hostServices
  }
}
