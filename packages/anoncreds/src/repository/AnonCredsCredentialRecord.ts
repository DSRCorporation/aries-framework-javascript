import type { Tags } from '@aries-framework/core'

import { BaseRecord, utils } from '@aries-framework/core'
import { JsonObject, W3CCredential } from '@hyperledger/anoncreds-shared'

export interface AnonCredsCredentialRecordProps {
  id?: string
  createdAt?: Date
  credential: JsonObject
  credentialId: string
  credentialRevocationId?: string
  linkSecretId: string
  schemaName: string
  schemaVersion: string
  schemaIssuerId: string
  issuerId: string
  methodName: string
}

export type DefaultAnonCredsCredentialTags = {
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

export type CustomAnonCredsCredentialTags = {
  schemaName: string
  schemaVersion: string
  schemaIssuerId: string
  issuerId: string
}

export class AnonCredsCredentialRecord extends BaseRecord<
  DefaultAnonCredsCredentialTags,
  CustomAnonCredsCredentialTags
> {
  public static readonly type = 'AnonCredsCredentialRecord'
  public readonly type = AnonCredsCredentialRecord.type

  public readonly credentialId!: string
  public readonly credentialRevocationId?: string
  public readonly linkSecretId!: string
  public readonly credential!: JsonObject

  /**
   * AnonCreds method name. We don't use names explicitly from the registry (there's no identifier for a registry)
   * @see https://hyperledger.github.io/anoncreds-methods-registry/
   */
  public readonly methodName!: string

  public constructor(props: AnonCredsCredentialRecordProps) {
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
    const w3cCred = W3CCredential.fromJson(this.credential)
    const tags: Tags<DefaultAnonCredsCredentialTags, CustomAnonCredsCredentialTags> = {
      ...this._tags,
      credentialDefinitionId: w3cCred.credentialDefinitionId,
      schemaId: w3cCred.schemaId,
      credentialId: this.credentialId,
      credentialRevocationId: this.credentialRevocationId,
      revocationRegistryId: w3cCred.revocationRegistryId,
      linkSecretId: this.linkSecretId,
      methodName: this.methodName,
    }
    const cred = w3cCred.toLegacy().toJson()

    // @ts-ignore
    for (const [key, value] of Object.entries(cred.values)) {
      // @ts-ignore
      tags[`attr::${key}::value`] = value.raw
      tags[`attr::${key}::marker`] = true
    }

    return tags
  }
}
