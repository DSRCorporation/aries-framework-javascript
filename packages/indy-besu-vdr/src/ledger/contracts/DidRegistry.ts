import { injectable } from '@aries-framework/core'
import { AddressLike, BigNumberish } from 'ethers'
import { BaseContract } from './BaseContract'
import fs from 'fs'
import path from 'path'
import { IndyDidRegistry, LedgerClient } from 'indy2-vdr'
import { IndyBesuSigner } from '../IndyBesuSigner'
export type VerificationMethod = {
  id: string
  type: string
  controller: string
  publicKeyJwk?: string
  publicKeyMultibase?: string
}

export type VerificationRelationship = string | VerificationMethod

export type Service = {
  id: string
  type: string
  serviceEndpoint: { uri: string } | string
}

export type DidDocument = {
  '@context': string[]
  id: string
  controller: string[]
  verificationMethod: VerificationMethod[]
  authentication: VerificationRelationship[]
  assertionMethod: VerificationRelationship[]
  capabilityInvocation: VerificationRelationship[]
  capabilityDelegation: VerificationRelationship[]
  keyAgreement: VerificationRelationship[]
  service: Service[]
  alsoKnownAs: string[]
}

export type DidMetadata = {
  creator: AddressLike
  created: BigNumberish
  updated: BigNumberish
  deactivated: boolean
}

@injectable()
export class DidRegistry extends BaseContract {
  public static readonly config = {
    address: '0x0000000000000000000000000000000000003333',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/IndyDidRegistry.json'), 'utf8')),
  }

  constructor(client: LedgerClient) {
    super(client)
  }

  public async createDid(didDocument: DidDocument, signer: IndyBesuSigner) {
    let transaction = await IndyDidRegistry.buildCreateDidTransaction(this.client, signer.address, didDocument)
    return await this.signAndSubmit(transaction, signer)
  }

  public async updateDid(didDocument: DidDocument, signer: IndyBesuSigner) {
    let transaction = await IndyDidRegistry.buildUpdateDidTransaction(this.client, signer.address, didDocument)
    return await this.signAndSubmit(transaction, signer)
  }

  public async deactivateDid(id: string, signer: IndyBesuSigner) {
    let transaction = await IndyDidRegistry.buildDeactivateDidTransaction(this.client, signer.address, id)
    return await this.signAndSubmit(transaction, signer)
  }

  public async resolveDid(id: string): Promise<DidDocument> {
    let transaction = await IndyDidRegistry.buildResolveDidTransaction(this.client, id)
    const response = await this.client.submitTransaction(transaction)
    return IndyDidRegistry.parseResolveDidResult(this.client, response)
  }
}
