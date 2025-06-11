import { HederaAnoncredsRegistryConfiguration } from '@hiero-did-sdk-js/anoncreds'

export interface HederaModuleConfigOptions extends HederaAnoncredsRegistryConfiguration {}

export class HederaModuleConfig {
  public readonly options: HederaModuleConfigOptions

  public constructor(options: HederaModuleConfigOptions) {
    this.options = options
  }
}
