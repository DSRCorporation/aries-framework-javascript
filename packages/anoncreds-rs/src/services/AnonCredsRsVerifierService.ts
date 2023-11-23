import type { AnonCredsVerifierService, VerifyProofOptions } from '@aries-framework/anoncreds'
import type { AgentContext } from '@aries-framework/core'
import type { JsonObject } from '@hyperledger/anoncreds-shared'

import { injectable } from '@aries-framework/core'
import { Presentation, W3CPresentation } from '@hyperledger/anoncreds-shared'
import console from 'console'

@injectable()
export class AnonCredsRsVerifierService implements AnonCredsVerifierService {
  public async verifyProof(agentContext: AgentContext, options: VerifyProofOptions): Promise<boolean> {
    const { proofRequest } = options

    if (proofRequest.isW3C) {
      return this.verifyProofW3C(agentContext, options)
    } else {
      return this.verifyProofLegacy(agentContext, options)
    }
  }
  public async verifyProofW3C(agentContext: AgentContext, options: VerifyProofOptions): Promise<boolean> {
    const { credentialDefinitions, proof, proofRequest, revocationRegistries, schemas } = options

    let presentation: W3CPresentation | undefined
    try {
      presentation = W3CPresentation.fromJson(proof as unknown as JsonObject)

      const rsCredentialDefinitions: Record<string, JsonObject> = {}
      for (const credDefId in credentialDefinitions) {
        rsCredentialDefinitions[credDefId] = credentialDefinitions[credDefId] as unknown as JsonObject
      }

      const rsSchemas: Record<string, JsonObject> = {}
      for (const schemaId in schemas) {
        rsSchemas[schemaId] = schemas[schemaId] as unknown as JsonObject
      }

      const revocationRegistryDefinitions: Record<string, JsonObject> = {}
      const lists: JsonObject[] = []

      for (const revocationRegistryDefinitionId in revocationRegistries) {
        const { definition, revocationStatusLists } = options.revocationRegistries[revocationRegistryDefinitionId]

        revocationRegistryDefinitions[revocationRegistryDefinitionId] = definition as unknown as JsonObject

        lists.push(...(Object.values(revocationStatusLists) as unknown as Array<JsonObject>))
      }

      const result = presentation.verify({
        presentationRequest: proofRequest as unknown as JsonObject,
        credentialDefinitions: rsCredentialDefinitions,
        schemas: rsSchemas,
        revocationRegistryDefinitions,
        revocationStatusLists: lists,
      })
      console.log('\n------------Verified presentation in W3C format------------')
      console.dir(presentation.toJson(), { depth: null })
      console.log('------------------------------------------------------\n')

      return result
    } finally {
      presentation?.handle.clear()
    }
  }

  public async verifyProofLegacy(agentContext: AgentContext, options: VerifyProofOptions): Promise<boolean> {
    const { credentialDefinitions, proof, proofRequest, revocationRegistries, schemas } = options

    let presentation: Presentation | undefined
    try {
      presentation = Presentation.fromJson(proof as unknown as JsonObject)

      const rsCredentialDefinitions: Record<string, JsonObject> = {}
      for (const credDefId in credentialDefinitions) {
        rsCredentialDefinitions[credDefId] = credentialDefinitions[credDefId] as unknown as JsonObject
      }

      const rsSchemas: Record<string, JsonObject> = {}
      for (const schemaId in schemas) {
        rsSchemas[schemaId] = schemas[schemaId] as unknown as JsonObject
      }

      const revocationRegistryDefinitions: Record<string, JsonObject> = {}
      const lists: JsonObject[] = []

      for (const revocationRegistryDefinitionId in revocationRegistries) {
        const { definition, revocationStatusLists } = options.revocationRegistries[revocationRegistryDefinitionId]

        revocationRegistryDefinitions[revocationRegistryDefinitionId] = definition as unknown as JsonObject

        lists.push(...(Object.values(revocationStatusLists) as unknown as Array<JsonObject>))
      }

      const result = presentation.verify({
        presentationRequest: proofRequest as unknown as JsonObject,
        credentialDefinitions: rsCredentialDefinitions,
        schemas: rsSchemas,
        revocationRegistryDefinitions,
        revocationStatusLists: lists,
      })
      console.log('\n------------Verified presentation in Old format------------')
      console.dir(presentation.toJson(), { depth: null })
      console.log('------------------------------------------------------\n')

      return result
    } finally {
      presentation?.handle.clear()
    }
  }
}
