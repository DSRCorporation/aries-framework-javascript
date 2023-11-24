import {
  IsObject,
  IsOptional,
} from 'class-validator'

export class CredentialDefinitionValue {
  @IsObject()
  public primary!: Record<string, unknown>

  @IsObject()
  @IsOptional()
  public revocation?: unknown
}
