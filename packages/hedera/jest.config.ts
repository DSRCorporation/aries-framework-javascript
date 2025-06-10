import type { Config } from '@jest/types'

import base from '../../jest.config.base'

import packageJson from './package.json'

const config: Config.InitialOptions = {
  ...base,
  testTimeout: 1200000,
  displayName: packageJson.name,
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.(t|j)s?$': 'babel-jest',
  },
  transformIgnorePatterns: ['../../node_modules/.pnpm/(?!(cbor2)/)'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  globals: {
    Uint8Array: Uint8Array,
    ArrayBuffer: ArrayBuffer,
  }
}

export default config
