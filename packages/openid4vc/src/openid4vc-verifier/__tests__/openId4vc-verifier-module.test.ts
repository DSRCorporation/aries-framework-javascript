/* eslint-disable @typescript-eslint/unbound-method */
import type { DependencyManager } from '@aries-framework/core'

import { OpenId4VcVerifierApi } from '../OpenId4VcVerifierApi'
import { OpenId4VcVerifierModule } from '../OpenId4VcVerifierModule'
import { OpenId4VcVerifierService } from '../OpenId4VcVerifierService'

const dependencyManager = {
  registerInstance: jest.fn(),
  registerSingleton: jest.fn(),
  registerContextScoped: jest.fn(),
  resolve: jest.fn().mockReturnValue({ logger: { warn: jest.fn() } }),
} as unknown as DependencyManager

describe('OpenId4VcVerifierModule', () => {
  test('registers dependencies on the dependency manager', () => {
    const verifierMetadata = {
      verifierBaseUrl: 'http://redirect-uri',
      verificationEndpointPath: '',
    }
    const openId4VcClientModule = new OpenId4VcVerifierModule({ verifierMetadata })

    openId4VcClientModule.register(dependencyManager)

    expect(dependencyManager.registerInstance).toHaveBeenCalledTimes(1)

    expect(dependencyManager.registerContextScoped).toHaveBeenCalledTimes(1)
    expect(dependencyManager.registerContextScoped).toHaveBeenCalledWith(OpenId4VcVerifierApi)

    expect(dependencyManager.registerSingleton).toHaveBeenCalledTimes(1)
    expect(dependencyManager.registerSingleton).toHaveBeenCalledWith(OpenId4VcVerifierService)
  })
})
