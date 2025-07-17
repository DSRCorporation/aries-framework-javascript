import type { Config } from '@jest/types'

import base from '../../jest.config.base'

import packageJson from './package.json'

const config: Config.InitialOptions = {
  ...base,
  testTimeout: 100000,
  displayName: packageJson.name,
}

export default config
