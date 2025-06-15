import { TypedArrayEncoder } from '@credo-ts/core'

interface ZstdModule {
  compress(data: Uint8Array): Uint8Array
  decompress(data: Uint8Array): Uint8Array
}

export function zstdCompress(data: Uint8Array): Uint8Array {
  const zstdModule = getAvailableZstdModule()
  return zstdModule.compress(data)
}

export function zstdDecompress(data: Uint8Array): Uint8Array {
  const zstdModule = getAvailableZstdModule()
  return zstdModule.decompress(data)
}

function getAvailableZstdModule(): ZstdModule {
  // 1. Try to use react-native-zstd (React Native ZSTD)
  try {
    const rnZstd = require('react-native-zstd')
    if (rnZstd.compress)
      return {
        compress: (data: Uint8Array): Uint8Array => rnZstd.compress(TypedArrayEncoder.toUtf8String(data)),
        decompress: (data: Uint8Array): Uint8Array => TypedArrayEncoder.fromString(rnZstd.decompress([...data])),
      }
  } catch {}

  // 2. Try to use Node.js zstd-napi
  try {
    const nodeZstd = require('zstd-napi')
    if (nodeZstd.compress) return nodeZstd
  } catch {}

  throw new Error(
    "No available zstd module found. Please install 'zstd-napi' or 'react-native-zstd' depending on a platform"
  )
}
