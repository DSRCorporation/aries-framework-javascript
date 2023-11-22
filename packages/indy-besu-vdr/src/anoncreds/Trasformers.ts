import type {
  AnonCredsCredentialDefinition,
  AnonCredsRevocationRegistryDefinition,
  AnonCredsRevocationStatusList,
  AnonCredsSchema,
} from '@aries-framework/anoncreds'

import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  Contains,
  IsArray,
  IsInstance,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class CredentialDefinitionValue {
  @IsObject()
  public primary!: Record<string, unknown>

  @IsObject()
  @IsOptional()
  public revocation?: unknown
}

export class CredentialDefinition {
  public constructor(options: Omit<AnonCredsCredentialDefinition, 'type'>) {
    if (options) {
      this.issuerId = options.issuerId
      this.schemaId = options.schemaId
      this.type = 'CL'
      this.tag = options.tag
      this.value = options.value
    }
  }

  @IsString()
  public issuerId!: string

  @IsString()
  public schemaId!: string

  @Contains('CL')
  public type!: 'CL'

  @IsString()
  public tag!: string

  @ValidateNested()
  @IsInstance(CredentialDefinitionValue)
  @Type(() => CredentialDefinitionValue)
  public value!: CredentialDefinitionValue
}
