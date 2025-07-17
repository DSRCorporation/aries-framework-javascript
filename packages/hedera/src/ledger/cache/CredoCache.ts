import { AgentContext, CacheModuleConfig, CredoError } from '@credo-ts/core'
import { Cache } from '@hiero-did-sdk/core'

export interface ICredoCache {
  get<CacheValue>(agentContext: AgentContext, key: string): Promise<CacheValue | null>
  set<CacheValue>(agentContext: AgentContext, key: string, value: CacheValue, expiresInSeconds?: number): Promise<void>
  remove(agentContext: AgentContext, key: string): Promise<void>
}

export class CredoCache implements Cache {
  private readonly credoCache: ICredoCache

  constructor(private readonly agentContext: AgentContext) {
    this.credoCache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache
    if (!this.credoCache) {
      throw new CredoError('Error initializing cache')
    }
  }

  async get<CacheValue>(key: string): Promise<CacheValue | null> {
    return await this.credoCache.get(this.agentContext, key)
  }

  async set<CacheValue>(key: string, value: CacheValue, _expiresInSeconds?: number): Promise<void> {
    await this.credoCache.set(this.agentContext, key, value)
  }

  async remove(key: string): Promise<void> {
    await this.credoCache.remove(this.agentContext, key)
  }

  cleanup(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  cleanupExpired(): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
