import { AskarWallet } from '@aries-framework/askar'
import { AriesFrameworkError, Key, TypedArrayEncoder, Wallet, WalletError } from '@aries-framework/core'
import { BytesLike, Signature, SigningKey, computeAddress, concat, getBytes } from 'ethers'
import { Transaction } from 'indy2-vdr'

export async function signTransaction(transaction: Transaction, accountKey: Key, wallet: Wallet) {
  const bytesToSign = transaction.getSigningBytes()

  const signature = await sign(bytesToSign, accountKey, wallet)

  transaction.setSignature({
    recovery_id: signature.yParity,
    signature: getBytes(concat([signature.r, signature.s])),
  })
}

export function getAccountAddress(key: Key) {
  return computeAddress(`0x${TypedArrayEncoder.toHex(key.publicKey)}`)
}

async function sign(data: BytesLike, accountKey: Key, wallet: Wallet): Promise<Signature> {
  if (!(wallet instanceof AskarWallet)) {
    throw new AriesFrameworkError('Incorrect wallete type: Indy-Besu VDR currently only support the Askar wallet')
  }

  const keyEntry = await wallet.session.fetchKey({ name: accountKey.publicKeyBase58 })

  if (!keyEntry) {
    throw new WalletError('Key entry not found')
  }

  /**
   * For unforeseen reasons, we are unable to recovery the key from signatures that Askar makes. These are required for Ethereum transactions.
   * Because if this, for our demo, we have decided to sign with k256 using the ethers library.
   */
  const key = new SigningKey(keyEntry.key.secretBytes)
  const signature = key.sign(data)

  keyEntry.key.handle.free()

  return signature
}
