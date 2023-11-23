import type { Tags } from '@aries-framework/core'

import { BaseRecord, utils } from '@aries-framework/core'
import { AnonCredsW3CCredential } from '@aries-framework/anoncreds'

export interface AnonCredsW3CCredentialRecordProps {
  id?: string
  createdAt?: Date
  credential: AnonCredsW3CCredential
  credentialId: string
  credentialRevocationId?: string
  linkSecretId: string
  schemaName: string
  schemaVersion: string
  schemaIssuerId: string
  issuerId: string
  methodName: string
}

export type DefaultAnonCredsW3CCredentialTags = {
  credentialId: string
  linkSecretId: string
  credentialDefinitionId: string
  credentialRevocationId?: string
  revocationRegistryId?: string
  schemaId: string
  methodName: string

  // the following keys can be used for every `attribute name` in credential.
  [key: `attr::${string}::marker`]: true | undefined
  [key: `attr::${string}::value`]: string | undefined
}

export type CustomAnonCredsW3CCredentialTags = {
  schemaName: string
  schemaVersion: string
  schemaIssuerId: string
  issuerId: string
}

export class AnonCredsW3CCredentialRecord extends BaseRecord<
  DefaultAnonCredsW3CCredentialTags,
  CustomAnonCredsW3CCredentialTags
> {
  public static readonly type = 'AnonCredsW3CCredentialRecord'
  public readonly type = AnonCredsW3CCredentialRecord.type

  public readonly credentialId!: string
  public readonly credentialRevocationId?: string
  public readonly linkSecretId!: string
  public readonly credential!: AnonCredsW3CCredential

  /**
   * AnonCreds method name. We don't use names explicitly from the registry (there's no identifier for a registry)
   * @see https://hyperledger.github.io/anoncreds-methods-registry/
   */
  public readonly methodName!: string

  public constructor(props: AnonCredsW3CCredentialRecordProps) {
    super()

    if (props) {
      this.id = props.id ?? utils.uuid()
      this.createdAt = props.createdAt ?? new Date()
      this.credentialId = props.credentialId
      this.credential = props.credential
      this.credentialRevocationId = props.credentialRevocationId
      this.linkSecretId = props.linkSecretId
      this.methodName = props.methodName
      this.setTags({
        issuerId: props.issuerId,
        schemaIssuerId: props.schemaIssuerId,
        schemaName: props.schemaName,
        schemaVersion: props.schemaVersion,
      })
    }
  }

  public getTags() {
    const tags: Tags<DefaultAnonCredsW3CCredentialTags, CustomAnonCredsW3CCredentialTags> = {
      ...this._tags,
      credentialDefinitionId: this.credential.credentialSchema.definition,
      schemaId: this.credential.credentialSchema.schema,
      credentialId: this.credentialId,
      credentialRevocationId: this.credentialRevocationId,
      revocationRegistryId: this.credential.credentialStatus?.id,
      linkSecretId: this.linkSecretId,
      methodName: this.methodName,
    }

    for (const [key, value] of Object.entries(this.credential.credentialSubject)) {
      tags[`attr::${key}::value`] = value
      tags[`attr::${key}::marker`] = true
    }

    return tags
  }
}
