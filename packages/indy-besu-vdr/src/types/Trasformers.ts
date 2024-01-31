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
  
  export class Schema {
    public constructor(options: AnonCredsSchema) {
      if (options) {
        this.name = options.name
        this.issuerId
        this.attrNames = options.attrNames
        this.version = options.version
      }
    }
  
    @IsString()
    public name!: string

    @IsString()
    public issuerId!: string
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    public attrNames!: string[]
  
    @IsString()
    public version!: string
  }
  
  export class CredentialDefinitionValue {
    @IsObject()
    public primary!: Record<string, unknown>
  
    @IsObject()
    @IsOptional()
    public revocation?: unknown
  }
  
  export class CredentialDefinition {
    public constructor(options: AnonCredsCredentialDefinition) {
      if (options) {
        this.schemaId = options.schemaId
        this.issuerId = options.issuerId
        this.type = options.type
        this.tag = options.tag
        this.value = options.value
      }
    }
  
    @IsString()
    public schemaId!: string

    @IsString()
    public issuerId!: string
  
    @Contains('CL')
    public type!: 'CL'
  
    @IsString()
    public tag!: string
  
    @ValidateNested()
    @IsInstance(CredentialDefinitionValue)
    @Type(() => CredentialDefinitionValue)
    public value!: CredentialDefinitionValue
  }
  
  export class AccumKey {
    @IsString()
    public z!: string
  }
  
  export class PublicKeys {
    @ValidateNested()
    @IsInstance(AccumKey)
    @Type(() => AccumKey)
    public accumKey!: AccumKey
  }
  
  export class RevocationRegistryDefinitionValue {
    @ValidateNested()
    @IsInstance(PublicKeys)
    @Type(() => PublicKeys)
    public publicKeys!: PublicKeys
  
    @IsNumber()
    public maxCredNum!: number
  
    @IsString()
    public tailsLocation!: string
  
    @IsString()
    public tailsHash!: string
  }
  
  export class CheqdRevocationRegistryDefinition {
    public constructor(options: Omit<AnonCredsRevocationRegistryDefinition, 'issuerId'>) {
      if (options) {
        this.revocDefType = options.revocDefType
        this.credDefId = options.credDefId
        this.tag = options.tag
        this.value = options.value
      }
    }
  
    @Contains('CL_ACCUM')
    public revocDefType!: 'CL_ACCUM'
  
    @IsString()
    public credDefId!: string
  
    @IsString()
    public tag!: string
  
    @ValidateNested()
    @IsInstance(RevocationRegistryDefinitionValue)
    @Type(() => RevocationRegistryDefinitionValue)
    public value!: RevocationRegistryDefinitionValue
  }
  
  export class RevocationStatusList {
    public constructor(options: Omit<AnonCredsRevocationStatusList, 'issuerId'>) {
      if (options) {
        this.revRegDefId = options.revRegDefId
        this.revocationList = options.revocationList
        this.currentAccumulator = options.currentAccumulator
      }
    }
  
    @IsString()
    public revRegDefId!: string
  
    @IsNumber({}, { each: true })
    public revocationList!: number[]
  
    @IsString()
    public currentAccumulator!: string
  }
  