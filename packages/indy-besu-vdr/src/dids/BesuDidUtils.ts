import { type Buffer, DidDocument } from '@aries-framework/core'
import { DidDocument as BesuDidDocument, Multibase } from '../fake-vdr-wrapper/DidDoc'

export function toBesuDidDocument(didDocument: DidDocument): BesuDidDocument {
  throw new Error('Method not implemented.')
}

export function fromBesuDidDocument(didDocument: BesuDidDocument): DidDocument {
  throw new Error('Method not implemented.')
}

export function buildDid(method: string, network: string, key: Buffer): string {
  throw new Error('Method not implemented.')
}

export function toMultibase(key: Buffer): Multibase {
  throw new Error('Method not implemented.')
}

export function deriveAddress(key: Buffer): string {
  throw new Error('Method not implemented.')
}

export function validateDidDcoument(didDocument: BesuDidDocument): boolean {
  throw new Error('Method not implemented.')
}
