import type { KeyValueStore } from './storage'
import { STORAGE_KEY } from './storage'
import { isEnvelope, openVault, WrongPassphraseError } from './vault'
import type { Envelope, Vault } from './vault'

export const VAULT_KEY = 'day-planner/vault/v1'

/**
 * A `KeyValueStore` whose contents are held in memory and written back as a single encrypted
 * blob. Reads stay synchronous, so the planner code above it is unaware of the encryption.
 */
export interface VaultStore extends KeyValueStore {
  /** Resolves once every pending write has been encrypted and persisted. */
  flush(): Promise<void>
}

export function hasVault(backing: KeyValueStore): boolean {
  return readEnvelope(backing) !== null
}

function readEnvelope(backing: KeyValueStore): Envelope | null {
  const raw = backing.getItem(VAULT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isEnvelope(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Opens an existing vault, throwing `WrongPassphraseError` if the passphrase does not fit. */
export async function unlockStore(backing: KeyValueStore, passphrase: string): Promise<VaultStore> {
  const envelope = readEnvelope(backing)
  if (!envelope) throw new WrongPassphraseError('There is no locked planner on this device.')
  const vault = await openVault(passphrase, envelope.salt, envelope.iterations)
  const contents = await vault.decrypt(envelope)
  return createVaultStore(backing, vault, asStringMap(contents))
}

/**
 * Turns the lock on, moving whatever is already stored in plaintext into the vault and deleting
 * the plaintext copy so enabling the lock is not a half-measure.
 */
export async function lockExisting(backing: KeyValueStore, passphrase: string): Promise<VaultStore> {
  const vault = await openVault(passphrase)
  const contents: Record<string, string> = {}
  const existing = backing.getItem(STORAGE_KEY)
  if (existing) contents[STORAGE_KEY] = existing
  const store = createVaultStore(backing, vault, contents)
  await store.flush()
  backing.removeItem?.(STORAGE_KEY)
  return store
}

function asStringMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') result[key] = item
  }
  return result
}

function createVaultStore(
  backing: KeyValueStore,
  vault: Vault,
  contents: Record<string, string>,
): VaultStore {
  let pending: Promise<void> = Promise.resolve()

  function persist() {
    // Writes are chained rather than parallel so the last state written always wins.
    pending = pending.then(async () => {
      const envelope = await vault.encrypt({ ...contents })
      backing.setItem(VAULT_KEY, JSON.stringify(envelope))
    })
    return pending
  }

  // Written once up front so turning the lock on persists the vault even with nothing in it yet.
  void persist()

  return {
    getItem: (key) => contents[key] ?? null,
    setItem: (key, value) => {
      contents[key] = value
      void persist()
    },
    removeItem: (key) => {
      delete contents[key]
      void persist()
    },
    flush: () => pending,
  }
}
