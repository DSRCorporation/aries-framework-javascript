import type { AskarKeyManagementService } from '@credo-ts/askar'
import {
  type AgentContext,
  type DidCreateOptions,
  type DidCreateResult,
  type DidDeactivateOptions,
  type DidDeactivateResult,
  DidDocument,
  DidDocumentRole,
  DidRecord,
  type DidRegistrar,
  DidRepository,
  type DidUpdateOptions,
  type DidUpdateResult,
  JsonTransformer,
  Kms,
  VERIFICATION_METHOD_TYPE_MULTIKEY,
  getKmsKeyIdForVerifiacationMethod,
  getPublicJwkFromVerificationMethod,
  type DidDocumentKey,
} from '@credo-ts/core'
import {
  type CreateDIDInterface as CreateVhDidOptions,
  type DeactivateDIDInterface as DeactivateVhDidOptions,
  type UpdateDIDInterface as UpdateVhDidOptions,
  createDID,
  deactivateDID,
  updateDID,
} from 'didwebvh-ts'
import { DidScidModuleConfig } from '../DidScidModuleConfig'
import { buildDidScid, parseDidScid } from './identifiers'
import { DidScidMethodType } from './types'
import { getVhRelativeVerificationMethodId, getVhSigner, getVhRelativeVerificationMethodId, getVhVerifier } from './utils'

const SCID_PLACEHOLDER = '{SCID}'

export interface DidScidCreateOptions extends DidCreateOptions {
  method: 'scid'
  options: {
    methodType: DidScidMethodType
    host: string
    location: string
  }
}

export interface DidScidUpdateOptions extends DidUpdateOptions {
  options: {
    keys?: DidDocumentKey[]
  }
}

export class DidScidRegistrar implements DidRegistrar {
  public readonly supportedMethods = ['scid']

  async create(agentContext: AgentContext, options: DidScidCreateOptions): Promise<DidCreateResult> {
    const config = agentContext.dependencyManager.resolve(DidScidModuleConfig)
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const keyManagementApi = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    try {
      const { methodType, host, location } = options.options

      if (methodType !== DidScidMethodType.vh) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: `Unable to create DID SCID: Method Type ${methodType} is not supported`,
          },
        }
      }

      const hostService = config.hostServices.find((service) => service.isHostSupported(host))

      if (!hostService) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: `DID Host ${host} is not supported`,
          },
        }
      }

      const key = await keyManagementApi.createKey({
        type: {
          crv: 'Ed25519',
          kty: 'OKP',
        },
      })
      const publicKeyJwk = Kms.PublicJwk.fromPublicJwk(key.publicJwk)
      const publicKeyMultibase = publicKeyJwk.fingerprint

      const didWithPlaceholder = buildDidScid(methodType, SCID_PLACEHOLDER)
      const vhDidCreateOptions: CreateVhDidOptions = {
        context: ['https://www.w3.org/ns/did/v1'],
        domain: 'placeholder',
        controller: didWithPlaceholder,
        updateKeys: [publicKeyMultibase],
        verificationMethods: [
          {
            id: publicKeyMultibase,
            controller: didWithPlaceholder,
            type: VERIFICATION_METHOD_TYPE_MULTIKEY,
            publicKeyMultibase,
          },
        ],
        signer: getVhSigner(keyManagementApi, publicKeyJwk.keyId, publicKeyJwk.fingerprint),
        verifier: getVhVerifier(keyManagementApi),
      }

      const { did, log: initialLog, doc: initialDidDocObject, meta } = await createDID(vhDidCreateOptions)

      // @ts-ignore
      const keyManagementService = keyManagementApi.getKms(agentContext) as AskarKeyManagementService
      // @ts-ignore
      const keyInfo = await keyManagementService.getKeyAsserted(agentContext, key.keyId)

      const didHost = await hostService.registerVerificationMetadata(
        meta.scid,
        location,
        keyInfo.key.secretBytes,
        initialLog
      )

      const didWithHost = buildDidScid(methodType, meta.scid, didHost)

      const vhDidUpdateOptions: UpdateVhDidOptions = {
        ...initialLog[0].parameters,
        ...initialDidDocObject,
        log: initialLog,
        verificationMethods: initialDidDocObject.verificationMethod,
        alsoKnownAs: [didWithHost],
        signer: getVhSigner(keyManagementApi, publicKeyJwk.keyId, publicKeyJwk.fingerprint),
        verifier: getVhVerifier(keyManagementApi),
      }

      // FIXME: Try to find a better way to properly store "alsoKnownAs" in DID Doc state (host resource <-> SCID generation ordering)
      // Specifically, we might want to avoid second write operation here at cost of creating resource beforehand
      const { log, doc: didDocObject } = await updateDID(vhDidUpdateOptions)
      const didDocument = JsonTransformer.fromJSON(didDocObject, DidDocument)

      await hostService.addVerificationMetadataEntry(meta.scid, didHost, keyInfo.key.secretBytes, log[log.length - 1])

      const didRecord = new DidRecord({
        did,
        role: DidDocumentRole.Created,
        didDocument,
        keys: [
          {
            kmsKeyId: publicKeyJwk.keyId,
            didDocumentRelativeKeyId: getVhRelativeVerificationMethodId(publicKeyMultibase),
          },
        ],
      })
      await didRepository.save(agentContext, didRecord)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didWithHost,
          didDocument,
        },
      }
    } catch (error) {
      agentContext.config.logger.error(`Error registering DID SCID: ${error}`)
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `unknownError: ${error}`,
        },
      }
    }
  }

  async update(agentContext: AgentContext, options: DidScidUpdateOptions): Promise<DidUpdateResult> {
    const config = agentContext.dependencyManager.resolve(DidScidModuleConfig)
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const keyManagementApi = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    try {
      const { did, didDocument } = options
      const { did: didWithoutHost } = parseDidScid(did)

      const didRecord = await didRepository.findCreatedDid(agentContext, didWithoutHost)
      if (!didRecord || !didRecord.didDocument) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Unable to update DID SCID: DID record is not found',
          },
        }
      }

      const { methodType, id: scid, host } = parseDidScid(did)

      if (methodType !== DidScidMethodType.vh) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: `Unable to update DID SCID: Method Type ${methodType} is not supported`,
          },
        }
      }

      const hostService = config.hostServices.find((service) => service.isHostSupported(host))

      if (!hostService) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: `DID Host ${host} is not supported`,
          },
        }
      }

      const existingVerificationMethods = didRecord.didDocument.verificationMethod
      if (!existingVerificationMethods?.length) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Unable to update DID SCID: Update key verification method is not found',
          },
        }
      }

      const updateKeyJwk = getPublicJwkFromVerificationMethod(existingVerificationMethods[0])
      const updateKeyId =
        getKmsKeyIdForVerifiacationMethod(existingVerificationMethods[0], didRecord.keys) ?? updateKeyJwk.legacyKeyId

      const didLog = await hostService.resolveVerificationMetadata(scid, host)

      const updatedVerificationMethods = didDocument.verificationMethod
        ? existingVerificationMethods.concat(didDocument.verificationMethod)
        : existingVerificationMethods

      const vhDidUpdateOptions: UpdateVhDidOptions = {
        ...didLog[didLog.length - 1].parameters,
        ...didRecord.didDocument,
        ...didDocument,
        authentication: didDocument.authentication as string[] | undefined,
        assertionMethod: didDocument.assertionMethod as string[] | undefined,
        keyAgreement: didDocument.keyAgreement as string[] | undefined,
        verificationMethods: updatedVerificationMethods.map((method) => ({
          ...method,
          publicKeyMultibase: method.publicKeyMultibase!,
        })),
        controller: didDocument.controller?.length ? didDocument.controller[0] : (didDocument.controller as string),
        log: didLog,
        signer: getVhSigner(keyManagementApi, updateKeyId, updateKeyJwk.fingerprint),
        verifier: getVhVerifier(keyManagementApi),
      }

      const { doc: didDocObject, log } = await updateDID(vhDidUpdateOptions)
      const updatedDidDocument = JsonTransformer.fromJSON(didDocObject, DidDocument)

      // @ts-ignore
      const keyManagementService = keyManagementApi.getKms(agentContext) as AskarKeyManagementService
      // @ts-ignore
      const keyInfo = await keyManagementService.getKeyAsserted(agentContext, updateKeyId)

      await hostService.addVerificationMetadataEntry(scid, host, keyInfo.key.secretBytes, log[log.length - 1])

      didRecord.didDocument = updatedDidDocument

      if(options.options.keys) {
        didRecord.keys = didRecord.keys ? didRecord.keys.concat(options.options.keys) : options.options.keys
      }

      await didRepository.update(agentContext, didRecord)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did,
          didDocument: updatedDidDocument,
        },
      }
    } catch (error) {
      agentContext.config.logger.error(`Error updating DID SCID: ${error}`)
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `unknownError: ${error}`,
        },
      }
    }
  }

  async deactivate(agentContext: AgentContext, options: DidDeactivateOptions): Promise<DidDeactivateResult> {
    const config = agentContext.dependencyManager.resolve(DidScidModuleConfig)
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const keyManagementApi = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    try {
      const { did } = options
      const { did: didWithoutHost } = parseDidScid(did)

      const didRecord = await didRepository.findCreatedDid(agentContext, didWithoutHost)
      if (!didRecord || !didRecord.didDocument) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Unable to deactivate DID SCID: DID record is not found',
          },
        }
      }

      const { methodType, id: scid, host } = parseDidScid(did)

      if (methodType !== DidScidMethodType.vh) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: `Unable to deactivate DID SCID: Method Type ${methodType} is not supported`,
          },
        }
      }

      const hostService = config.hostServices.find((service) => service.isHostSupported(host))

      if (!hostService) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: `DID Host ${host} is not supported`,
          },
        }
      }

      const existingVerificationMethods = didRecord.didDocument.verificationMethod
      if (!existingVerificationMethods?.length) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'Unable to deactivate DID SCID: Update key is not found',
          },
        }
      }

      const updateKeyJwk = getPublicJwkFromVerificationMethod(existingVerificationMethods[0])
      const updateKeyId =
        getKmsKeyIdForVerifiacationMethod(existingVerificationMethods[0], didRecord.keys) ?? updateKeyJwk.legacyKeyId

      const didLog = await hostService.resolveVerificationMetadata(scid, host)

      const vhDidDeactivateOptions: DeactivateVhDidOptions = {
        log: didLog,
        signer: getVhSigner(keyManagementApi, updateKeyId, updateKeyJwk.fingerprint),
        verifier: getVhVerifier(keyManagementApi),
      }

      const { doc: didDocObject, log } = await deactivateDID(vhDidDeactivateOptions)
      const didDocument = JsonTransformer.fromJSON(didDocObject, DidDocument)

      // @ts-ignore
      const keyManagementService = keyManagementApi.getKms(agentContext) as AskarKeyManagementService
      // @ts-ignore
      const keyInfo = await keyManagementService.getKeyAsserted(agentContext, updateKeyId)

      await hostService.addVerificationMetadataEntry(scid, host, keyInfo.key.secretBytes, log[log.length - 1])

      didRecord.didDocument = didDocument
      await didRepository.update(agentContext, didRecord)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did,
          didDocument,
        },
      }
    } catch (error) {
      agentContext.config.logger.error(`Error deactivating DID SCID: ${error}`)
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: `unknownError: ${error}`,
        },
      }
    }
  }
}
