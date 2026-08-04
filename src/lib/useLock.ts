import { useCallback, useEffect, useState } from 'react'
import type { KeyValueStore } from './storage'
import { WrongPassphraseError } from './vault'
import { hasVault, lockExisting, unlockStore } from './vaultStore'
import type { VaultStore } from './vaultStore'

/** The passphrase travels in the URL fragment, which browsers never send to the server. */
export const LINK_PREFIX = '#k='

export type LockState = 'off' | 'locked' | 'unlocked'

export interface Lock {
  state: LockState
  /** The unlocked store, or null while the planner is locked or unencrypted. */
  store: VaultStore | null
  /** Held in memory only, so the secret link can be shown again during this session. */
  passphrase: string | null
  error: string | null
  unlock(passphrase: string): Promise<boolean>
  enable(passphrase: string): Promise<boolean>
  /** The bookmarkable link that unlocks the planner without typing the passphrase. */
  secretLink(passphrase: string): string
}

export function passphraseFromLink(hash: string): string | null {
  if (!hash.startsWith(LINK_PREFIX)) return null
  const value = decodeURIComponent(hash.slice(LINK_PREFIX.length))
  return value || null
}

export function useLock(backing: KeyValueStore): Lock {
  const [state, setState] = useState<LockState>(() => (hasVault(backing) ? 'locked' : 'off'))
  const [store, setStore] = useState<VaultStore | null>(null)
  const [passphrase, setPassphrase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unlock = useCallback(
    async (secret: string) => {
      try {
        setStore(await unlockStore(backing, secret))
        setPassphrase(secret)
        setState('unlocked')
        setError(null)
        return true
      } catch (caught) {
        setError(caught instanceof WrongPassphraseError ? caught.message : 'Could not unlock the planner.')
        return false
      }
    },
    [backing],
  )

  const enable = useCallback(
    async (secret: string) => {
      try {
        setStore(await lockExisting(backing, secret))
        setPassphrase(secret)
        setState('unlocked')
        setError(null)
        return true
      } catch {
        setError('Could not turn the lock on.')
        return false
      }
    },
    [backing],
  )

  // A saved secret link unlocks on open, so the phone never shows a passphrase prompt.
  useEffect(() => {
    if (state !== 'locked') return
    const fromLink = passphraseFromLink(typeof location === 'undefined' ? '' : location.hash)
    if (fromLink) void unlock(fromLink)
  }, [state, unlock])

  const secretLink = useCallback((secret: string) => {
    const base = typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`
    return `${base}${LINK_PREFIX}${encodeURIComponent(secret)}`
  }, [])

  return { state, store, passphrase, error, unlock, enable, secretLink }
}
