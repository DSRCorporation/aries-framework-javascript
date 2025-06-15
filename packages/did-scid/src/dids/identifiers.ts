import type { ParsedDid } from '@credo-ts/core'
import { DidScidMethodType } from './types'

const ID_CHAR = '([a-z,A-Z,0-9,-])'
const IDENTIFIER = `((?:${ID_CHAR}*:)*(${ID_CHAR}+))`
const METHOD_TYPE = `(${Object.values(DidScidMethodType).join('|')})`
const HOST_QUERY = '[?]src=(.*)'
const VERSION_ID = '(0|[1-9]\\d*)'

export const didScidRegex = new RegExp(`^did:scid:${METHOD_TYPE}:${VERSION_ID}:${IDENTIFIER}${HOST_QUERY}$`)

export type ParsedDidScid = ParsedDid & {
  methodType: DidScidMethodType
  host: string
}

export function parseDidScid(didUrl: string): ParsedDidScid {
  const sections = didUrl.match(didScidRegex)

  if (!sections) {
    throw new Error('DID string does not match the regex')
  }

  return {
    did: `did:scid:${sections[1]}:${sections[2]}:${sections[3]}`,
    method: 'scid',
    id: sections[3],
    methodType: DidScidMethodType[sections[1] as keyof typeof DidScidMethodType],
    host: sections[7],
    didUrl,
  }
}

export function buildDidScid(methodType: DidScidMethodType, scid: string, host: string | null = null): string {
  const didBase = `did:scid:${methodType}:1:${scid}`

  return host ? `${didBase}?src=${host}` : didBase
}
