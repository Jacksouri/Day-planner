import { describe, expect, it } from 'vitest'
import { fromBase64, isEnvelope, openVault, randomSalt, toBase64, WrongPassphraseError } from './vault'

// Tests use a low iteration count; production stretching would make the suite crawl.
const ITERATIONS = 1000

describe('vault', () => {
  it('round-trips data through a passphrase', async () => {
    const vault = await openVault('correct horse', randomSalt(), ITERATIONS)
    const envelope = await vault.encrypt({ tasks: ['secret plan'] })

    expect(isEnvelope(envelope)).toBe(true)
    expect(JSON.stringify(envelope)).not.toContain('secret plan')
    expect(await vault.decrypt(envelope)).toEqual({ tasks: ['secret plan'] })
  })

  it('refuses a different passphrase', async () => {
    const salt = randomSalt()
    const envelope = await (await openVault('right', salt, ITERATIONS)).encrypt({ a: 1 })
    const wrong = await openVault('wrong', salt, ITERATIONS)

    await expect(wrong.decrypt(envelope)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('derives the same key from the same passphrase and salt on another device', async () => {
    const salt = randomSalt()
    const envelope = await (await openVault('shared', salt, ITERATIONS)).encrypt('hello')
    const other = await openVault('shared', envelope.salt, envelope.iterations)

    expect(await other.decrypt(envelope)).toBe('hello')
  })

  it('rejects tampered ciphertext', async () => {
    const vault = await openVault('pass', randomSalt(), ITERATIONS)
    const envelope = await vault.encrypt('hello')
    const bytes = fromBase64(envelope.ct)
    bytes[0] ^= 0xff

    await expect(vault.decrypt({ ...envelope, ct: toBase64(bytes) })).rejects.toBeInstanceOf(
      WrongPassphraseError,
    )
  })

  it('uses a fresh iv for every write, so identical data looks different', async () => {
    const vault = await openVault('pass', randomSalt(), ITERATIONS)
    const first = await vault.encrypt('same')
    const second = await vault.encrypt('same')

    expect(first.iv).not.toBe(second.iv)
    expect(first.ct).not.toBe(second.ct)
  })

  it('recognizes only well-formed envelopes', () => {
    expect(isEnvelope({ version: 1, tasks: [] })).toBe(false)
    expect(isEnvelope(null)).toBe(false)
    expect(isEnvelope('nope')).toBe(false)
  })
})
