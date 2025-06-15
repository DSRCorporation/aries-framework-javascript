export enum DidScidMethodType {
  vh = 'vh',
  ke = 'ke',
  jl = 'jl',
}

export interface DidHostService {
  isHostSupported(host: string): boolean
  resolveVerificationMetadata(scid: string, host: string): Promise<any[]>
  registerVerificationMetadata(
    scid: string,
    location: string,
    updateKeyBytes: Uint8Array,
    entries: any[]
  ): Promise<string>
  addVerificationMetadataEntry(scid: string, host: string, updateKeyBytes: Uint8Array, entry: any): Promise<void>
}
