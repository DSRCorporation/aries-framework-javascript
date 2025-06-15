import {
  type AgentContext,
  DidDocument,
  type DidResolutionOptions,
  type DidResolutionResult,
  type DidResolver,
  JsonTransformer,
  Kms,
  type ParsedDid,
} from '@credo-ts/core'
import { resolveDIDFromLog } from 'didwebvh-ts'
import { DidScidModuleConfig } from '../DidScidModuleConfig'
import { parseDidScid } from './identifiers'
import { DidScidMethodType } from './types'
import { getVhVerifier } from './utils'

export class DidScidResolver implements DidResolver {
  public readonly supportedMethods = ['scid']

  public readonly allowsCaching: boolean = true
  public readonly allowsLocalDidRecord = true

  async resolve(
    agentContext: AgentContext,
    _did: string,
    parsed: ParsedDid,
    _didResolutionOptions: DidResolutionOptions
  ): Promise<DidResolutionResult> {
    const config = agentContext.dependencyManager.resolve(DidScidModuleConfig)
    const keyManagementApi = agentContext.dependencyManager.resolve(Kms.KeyManagementApi)

    try {
      const { didUrl } = parsed
      const parsedIdentifier = parseDidScid(didUrl)

      if (parsedIdentifier.methodType !== DidScidMethodType.vh) {
        return {
          didDocument: null,
          didDocumentMetadata: {},
          didResolutionMetadata: {
            error: 'notFound',
            message: `resolver_error: Unable to resolve did '${didUrl}': Method Type ${parsedIdentifier.methodType} is not supported`,
          },
        }
      }

      const hostService = config.hostServices.find((service) => service.isHostSupported(parsedIdentifier.host))

      if (!hostService) {
        return {
          didDocument: null,
          didDocumentMetadata: {},
          didResolutionMetadata: {
            error: 'notFound',
            message: `resolver_error: Unable to resolve did '${didUrl}': DID Host ${parsedIdentifier.host} is not supported`,
          },
        }
      }

      const verificationMetadata = await hostService.resolveVerificationMetadata(
        parsedIdentifier.id,
        parsedIdentifier.host
      )
      const { doc: resolvedDidDoc, meta: didDocumentMetadata } = await resolveDIDFromLog(verificationMetadata, {
        verifier: getVhVerifier(keyManagementApi),
      })

      return {
        didDocument: JsonTransformer.fromJSON(resolvedDidDoc, DidDocument),
        didDocumentMetadata,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
      }
    } catch (error) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: `resolver_error: Unable to resolve did '${parsed.didUrl}': ${error}`,
        },
      }
    }
  }
}
