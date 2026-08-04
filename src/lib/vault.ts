/**
 * Passphrase encryption for everything the planner keeps on a device.
 *
 * The passphrase never leaves the device and is never stored: it is stretched with PBKDF2 into an
 * AES-GCM key, and only the derived key lives in memory for the length of a session. Nothing here
 * protects the app's own code, which is public — it protects the contents.
 */

const KDF_ITERATIONS = 250_000
const SALT_BYTES = 16
const IV_BYTES = 12

export interface Envelope {
  v: 1
  kdf: 'PBKDF2-SHA256'
  iterations: number
  /** Base64 KDF salt; needed to derive the same key again on another device. */
  salt: string
  iv: string
  ct: string
}

export class WrongPassphraseError extends Error {
  constructor(message = 'That passphrase does not match.') {
    super(message)
  }
}

export class CryptoUnavailableError extends Error {
  constructor() {
    super('This browser cannot encrypt data. Open the planner over https.')
  }
}

export interface Vault {
  /** Base64 salt, so a second device can derive the same key from the same passphrase. */
  readonly salt: string
  encrypt(value: unknown): Promise<Envelope>
  decrypt(envelope: Envelope): Promise<unknown>
}

export function isEnvelope(raw: unknown): raw is Envelope {
  if (typeof raw !== 'object' || raw === null) return false
  const candidate = raw as Partial<Envelope>
  return (
    candidate.v === 1 &&
    candidate.kdf === 'PBKDF2-SHA256' &&
    typeof candidate.iterations === 'number' &&
    typeof candidate.salt === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ct === 'string'
  )
}

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new CryptoUnavailableError()
  return crypto.subtle
}

export function randomSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(bytes)
  return toBase64(bytes)
}

/**
 * Derives the key once per session; PBKDF2 is deliberately slow, so re-deriving it on every save
 * would make typing feel broken.
 */
export async function openVault(
  passphrase: string,
  salt: string = randomSalt(),
  iterations: number = KDF_ITERATIONS,
): Promise<Vault> {
  const api = subtle()
  const material = await api.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  const key = await api.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt) as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  return {
    salt,
    async encrypt(value: unknown) {
      const iv = new Uint8Array(IV_BYTES)
      crypto.getRandomValues(iv)
      const plaintext = new TextEncoder().encode(JSON.stringify(value))
      const ct = await api.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource)
      return {
        v: 1,
        kdf: 'PBKDF2-SHA256',
        iterations,
        salt,
        iv: toBase64(iv),
        ct: toBase64(new Uint8Array(ct)),
      }
    },
    async decrypt(envelope: Envelope) {
      let plaintext: ArrayBuffer
      try {
        plaintext = await api.decrypt(
          { name: 'AES-GCM', iv: fromBase64(envelope.iv) as BufferSource },
          key,
          fromBase64(envelope.ct) as BufferSource,
        )
      } catch {
        // AES-GCM authentication fails identically for a wrong passphrase and a tampered file.
        throw new WrongPassphraseError()
      }
      return JSON.parse(new TextDecoder().decode(plaintext)) as unknown
    },
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
