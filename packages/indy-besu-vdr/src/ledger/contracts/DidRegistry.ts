import { AddressLike, BigNumberish } from 'ethers'
import { BaseContract } from './BaseContract'
import path from 'path'

export type VerificationMethod = {
  id: string
  verificationMethodType: string
  controller: string
  publicKeyJwk: string
  publicKeyMultibase: string
}

export type VerificationRelationship = {
  id: string
  verificationMethod: VerificationMethod
}

export type Service = {
  id: string
  serviceType: string
  serviceEndpoint: string
  accept: string[]
  routingKeys: string[]
}

export type DidDocument = {
  context: string[]
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

export type DidDocumentStorage = {
  document: DidDocument
  metadata: DidMetadata
}

export class DidRegistry extends BaseContract {
  public static readonly address = '0x0000000000000000000000000000000000003333'
  public static readonly specPath = path.resolve(__dirname, './abi/DidRegistryInterface.json')

  constructor(ethersContract: any) {
    super(ethersContract)
  }

  public async createDid(didDocument: DidDocument) {
    try {
      const tx = await this.ethersContract.createDid(didDocument)
      return tx.wait()
    } catch (error) {
      throw this.decodeError(error)
    }
  }

  public async updateDid(didDocument: DidDocument) {
    try {
      const tx = await this.ethersContract.updateDid(didDocument)
      return tx.wait()
    } catch (error) {
      throw this.decodeError(error)
    }
  }

  public async deactivateDid(id: string) {
    try {
      const tx = await this.ethersContract.deactivateDid(id)
      return tx.wait()
    } catch (error) {
      throw this.decodeError(error)
    }
  }

  public async resolveDid(id: string): Promise<DidDocumentStorage> {
    try {
      const didDocumentStorage = await this.ethersContract.resolveDid(id)

      return {
        document: {
          context: didDocumentStorage.document.context.map((context: string) => context),
          id: didDocumentStorage.document.id,
          controller: didDocumentStorage.document.controller,
          verificationMethod: didDocumentStorage.document.verificationMethod.map(
            (verificationMethod: VerificationMethod) => DidRegistry.mapVerificationMethod(verificationMethod)
          ),
          authentication: didDocumentStorage.document.authentication.map((relationship: VerificationRelationship) =>
            DidRegistry.mapVerificationRelationship(relationship)
          ),
          assertionMethod: didDocumentStorage.document.assertionMethod.map((relationship: VerificationRelationship) =>
            DidRegistry.mapVerificationRelationship(relationship)
          ),
          capabilityInvocation: didDocumentStorage.document.capabilityInvocation.map(
            (relationship: VerificationRelationship) => DidRegistry.mapVerificationRelationship(relationship)
          ),
          capabilityDelegation: didDocumentStorage.document.capabilityDelegation.map(
            (relationship: VerificationRelationship) => DidRegistry.mapVerificationRelationship(relationship)
          ),
          keyAgreement: didDocumentStorage.document.keyAgreement.map((relationship: VerificationRelationship) =>
            DidRegistry.mapVerificationRelationship(relationship)
          ),
          service: didDocumentStorage.document.service.map((relationship: Service) =>
            DidRegistry.mapService(relationship)
          ),
          alsoKnownAs: didDocumentStorage.document.alsoKnownAs.map((alsoKnownAs: string) => alsoKnownAs),
        },
        metadata: {
          creator: didDocumentStorage.metadata.creator,
          created: didDocumentStorage.metadata.created,
          updated: didDocumentStorage.metadata.updated,
          deactivated: didDocumentStorage.metadata.deactivated,
        },
      } as DidDocumentStorage
    } catch (error) {
      throw this.decodeError(error)
    }
  }

  private static mapVerificationMethod(verificationMethod: VerificationMethod): VerificationMethod {
    return {
      id: verificationMethod.id,
      verificationMethodType: verificationMethod.verificationMethodType,
      controller: verificationMethod.controller,
      publicKeyJwk: verificationMethod.publicKeyJwk,
      publicKeyMultibase: verificationMethod.publicKeyMultibase,
    }
  }

  private static mapVerificationRelationship(relationship: VerificationRelationship): VerificationRelationship {
    return {
      id: relationship.id,
      verificationMethod: DidRegistry.mapVerificationMethod(relationship.verificationMethod),
    }
  }

  private static mapService(service: Service): Service {
    return {
      id: service.id,
      serviceType: service.serviceType,
      serviceEndpoint: service.serviceEndpoint,
      accept: service.accept.map((accept: string) => accept),
      routingKeys: service.routingKeys.map((routingKey: string) => routingKey),
    }
  }
}
