export interface IndyBesuModuleConfigOptions {
    rpcUrl: string
  }

export class IndyBesuModuleConfig {
    public readonly rpcUrl!: string

    constructor(options: IndyBesuModuleConfigOptions) {
        this.rpcUrl = options.rpcUrl
    }
}