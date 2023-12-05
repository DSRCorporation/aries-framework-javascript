import type { AgentContext } from '@aries-framework/core'

import { Repository, InjectionSymbols, StorageService, EventEmitter, injectable, inject } from '@aries-framework/core'

import { AnonCredsW3CCredentialRecord } from './AnonCredsW3CCredentialRecord'

@injectable()
export class AnonCredsW3CCredentialRepository extends Repository<AnonCredsW3CCredentialRecord> {
  public constructor(
    @inject(InjectionSymbols.StorageService) storageService: StorageService<AnonCredsW3CCredentialRecord>,
    eventEmitter: EventEmitter
  ) {
    super(AnonCredsW3CCredentialRecord, storageService, eventEmitter)
  }

  public async getByCredentialDefinitionId(agentContext: AgentContext, credentialDefinitionId: string) {
    return this.getSingleByQuery(agentContext, { credentialDefinitionId })
  }

  public async findByCredentialDefinitionId(agentContext: AgentContext, credentialDefinitionId: string) {
    return this.findSingleByQuery(agentContext, { credentialDefinitionId })
  }

  public async getByCredentialId(agentContext: AgentContext, credentialId: string) {
    return this.getSingleByQuery(agentContext, { credentialId })
  }

  public async findByCredentialId(agentContext: AgentContext, credentialId: string) {
    return this.findSingleByQuery(agentContext, { credentialId })
  }
}
