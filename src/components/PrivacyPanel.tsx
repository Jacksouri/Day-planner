import { useState } from 'react'
import type { Lock } from '../lib/useLock'

interface Props {
  lock: Lock
}

export function PrivacyPanel({ lock }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)

  async function enable(event: React.FormEvent) {
    event.preventDefault()
    if (passphrase.length < 6) return setStatus('Use at least 6 characters.')
    if (passphrase !== confirmation) return setStatus('The two passphrases do not match.')
    setBusy(true)
    const locked = await lock.enable(passphrase)
    setBusy(false)
    setConfirmation('')
    if (locked) setStatus('Locked. Save the secret link below on both phones.')
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setStatus('Secret link copied.')
    } catch {
      setStatus('Could not copy — select the link and copy it by hand.')
    }
  }

  if (lock.state === 'unlocked') {
    const link = lock.passphrase ? lock.secretLink(lock.passphrase) : null
    return (
      <section className="panel">
        <h2>Privacy</h2>
        <p className="hint">
          This planner is encrypted on this device. Anyone opening it without the passphrase sees nothing but
          a lock screen, and exported snapshots are encrypted too.
        </p>
        {link ? (
          <>
            <div className="row">
              <button type="button" onClick={() => void copyLink(link)}>
                Copy secret link
              </button>
              <button type="button" onClick={() => setRevealed((value) => !value)}>
                {revealed ? 'Hide link' : 'Show link'}
              </button>
            </div>
            {revealed ? <p className="secret-link">{link}</p> : null}
            <p className="hint">
              Open that link once on each phone and add it to the home screen — it carries the passphrase, so
              the planner opens unlocked. Send it only to each other, and never post it anywhere public.
            </p>
          </>
        ) : null}
        {status ? <p className="status">{status}</p> : null}
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Privacy</h2>
      <p className="hint">
        Your tasks are stored on this device only — they are never uploaded, and nothing in the public code
        repository contains them. Add a passphrase to encrypt them, so someone holding your unlocked phone
        still cannot read the planner.
      </p>
      <form onSubmit={enable}>
        <label>
          Passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
          />
        </label>
        <label>
          Repeat it
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <button type="submit" className="active" disabled={busy}>
          {busy ? 'Locking…' : 'Turn on the lock'}
        </button>
      </form>
      {status ? <p className="status">{status}</p> : null}
      <p className="hint">
        There is no reset: forget the passphrase and the tasks cannot be recovered by anyone, including you.
      </p>
    </section>
  )
}
