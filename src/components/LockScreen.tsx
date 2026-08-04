import { useState } from 'react'
import type { Lock } from '../lib/useLock'

interface Props {
  lock: Lock
}

export function LockScreen({ lock }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!passphrase) return
    setBusy(true)
    await lock.unlock(passphrase)
    setBusy(false)
  }

  return (
    <div className="app">
      <form className="panel lock" onSubmit={submit}>
        <h1>Locked</h1>
        <p className="hint">Enter the passphrase to open this planner.</p>
        <label>
          Passphrase
          <input
            type="password"
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
          />
        </label>
        <button type="submit" className="active" disabled={busy || !passphrase}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
        {lock.error ? <p className="status">{lock.error}</p> : null}
        <p className="hint">
          Forgotten it? Nobody can recover it — the tasks are encrypted with it. Import a snapshot into a
          fresh planner instead.
        </p>
      </form>
    </div>
  )
}
