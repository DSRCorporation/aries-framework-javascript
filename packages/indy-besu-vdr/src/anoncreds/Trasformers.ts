import { IsObject, IsOptional } from 'class-validator'

export class CredentialDefinitionValue {
  @IsObject()
  public primary!: Record<string, unknown>

  @IsObject()
  @IsOptional()
  public revocation?: unknown

  constructor(primary: Record<string, unknown>, revocation: unknown) {
    this.primary = primary
    this.revocation = revocation
  }
}
