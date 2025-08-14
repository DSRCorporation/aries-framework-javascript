import type { AgentContext, Cache } from '@credo-ts/core'

export class testCache implements Cache {
  // biome-ignore lint/suspicious/noExplicitAny:
  private _cache: Map<string, any> = new Map<string, any>()

  get<CacheValue>(_agentContext: AgentContext, key: string): Promise<CacheValue | null> {
    return Promise.resolve(this._cache.get(key))
  }

  set<CacheValue>(
    _agentContext: AgentContext,
    key: string,
    value: CacheValue,
    _expiresInSeconds?: number | undefined
  ): Promise<void> {
    this._cache.set(key, value)
    return Promise.resolve()
  }

  async remove(_agentContext: AgentContext, key: string): Promise<void> {
    this._cache.delete(key)
    return Promise.resolve()
  }

  clear() {
    this._cache.clear()
  }
}
