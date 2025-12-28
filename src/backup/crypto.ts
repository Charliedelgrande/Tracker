import { base64ToBytes, bytesToBase64 } from '@/backup/base64'

type EncryptedPayload = {
  algo: 'AES-GCM'
  kdf: 'PBKDF2'
  hash: 'SHA-256'
  iterations: number
  saltB64: string
  ivB64: string
  ciphertextB64: string
}

const enc = new TextEncoder()
const dec = new TextDecoder()

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptString(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const iterations = 200_000
  const key = await deriveKey(passphrase, salt, iterations)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  return {
    algo: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations,
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptString(payload: EncryptedPayload, passphrase: string) {
  const salt = base64ToBytes(payload.saltB64)
  const iv = base64ToBytes(payload.ivB64)
  const ciphertext = base64ToBytes(payload.ciphertextB64)
  const key = await deriveKey(passphrase, salt, payload.iterations)
  const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return dec.decode(plaintextBuf)
}

export type { EncryptedPayload }


