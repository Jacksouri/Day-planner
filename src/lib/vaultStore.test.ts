import { describe, expect, it } from 'vitest'
import { STORAGE_KEY } from './storage'
import type { KeyValueStore } from './storage'
import { WrongPassphraseError } from './vault'
import { hasVault, lockExisting, unlockStore, VAULT_KEY } from './vaultStore'

function backing(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

describe('vault store', () => {
  it('moves existing plaintext data into the vault and deletes the plaintext copy', async () => {
    const store = backing()
    store.setItem(STORAGE_KEY, '{"tasks":["dinner with Parmiss"]}')

    const locked = await lockExisting(store, 'our passphrase')

    expect(locked.getItem(STORAGE_KEY)).toBe('{"tasks":["dinner with Parmiss"]}')
    expect(store.getItem(STORAGE_KEY)).toBeNull()
    expect(hasVault(store)).toBe(true)
    expect(store.getItem(VAULT_KEY)).not.toContain('Parmiss')
  })

  it('reopens the vault on the same device', async () => {
    const store = backing()
    const locked = await lockExisting(store, 'our passphrase')
    locked.setItem(STORAGE_KEY, 'later edit')
    await locked.flush()

    const reopened = await unlockStore(store, 'our passphrase')
    expect(reopened.getItem(STORAGE_KEY)).toBe('later edit')
  })

  it('rejects the wrong passphrase', async () => {
    const store = backing()
    await lockExisting(store, 'our passphrase')

    await expect(unlockStore(store, 'guessing')).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('complains when there is nothing locked to open', async () => {
    await expect(unlockStore(backing(), 'anything')).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('keeps the last write when several land at once', async () => {
    const store = backing()
    const locked = await lockExisting(store, 'pass')

    locked.setItem(STORAGE_KEY, 'one')
    locked.setItem(STORAGE_KEY, 'two')
    locked.setItem(STORAGE_KEY, 'three')
    await locked.flush()

    expect((await unlockStore(store, 'pass')).getItem(STORAGE_KEY)).toBe('three')
  })

  it('removes keys from the vault too', async () => {
    const store = backing()
    store.setItem(STORAGE_KEY, 'data')
    const locked = await lockExisting(store, 'pass')
    locked.removeItem?.(STORAGE_KEY)
    await locked.flush()

    expect((await unlockStore(store, 'pass')).getItem(STORAGE_KEY)).toBeNull()
  })

  it('treats a damaged vault blob as no vault at all', () => {
    const store = backing()
    store.setItem(VAULT_KEY, 'not json')
    expect(hasVault(store)).toBe(false)
  })
})
