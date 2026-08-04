import { useRef, useState } from 'react'
import { InvalidBackupError } from '../lib/merge'
import { backupFileName, createFileHandleAdapter, readBackupFile, serializeBackup, syncWith } from '../lib/sync'
import type { PlannerData } from '../lib/types'
import { openVault, WrongPassphraseError } from '../lib/vault'

interface Props {
  data: PlannerData
  /** Set when the planner is locked; snapshots are then written encrypted. */
  vaultPassphrase: string | null
  onMerge(remote: PlannerData): PlannerData
  onReplace(next: PlannerData): void
}

interface FilePickerWindow {
  showOpenFilePicker?(options?: unknown): Promise<Array<Parameters<typeof createFileHandleAdapter>[0]>>
}

export function SyncPanel({ data, vaultPassphrase, onMerge, onReplace }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const syncFile = useRef<Parameters<typeof createFileHandleAdapter>[0] | null>(null)
  const canUseFileHandles = typeof window !== 'undefined' && 'showOpenFilePicker' in window

  async function download() {
    const body = vaultPassphrase
      ? JSON.stringify(await (await openVault(vaultPassphrase)).encrypt(data), null, 2)
      : serializeBackup(data)
    const blob = new Blob([body], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    link.click()
    URL.revokeObjectURL(url)
    setStatus(
      vaultPassphrase
        ? 'Saved an encrypted snapshot to your downloads.'
        : 'Saved a snapshot to your downloads.',
    )
  }

  async function importFile(file: File, mode: 'merge' | 'replace') {
    try {
      const remote = await readBackupFile(file, vaultPassphrase ?? undefined)
      if (mode === 'merge') {
        const merged = onMerge(remote)
        setStatus(`Merged — ${merged.tasks.length} tasks total.`)
      } else {
        onReplace(remote)
        setStatus(`Replaced local data with ${remote.tasks.length} tasks.`)
      }
    } catch (error) {
      if (error instanceof WrongPassphraseError) {
        return setStatus('That snapshot was encrypted with a different passphrase.')
      }
      setStatus(error instanceof InvalidBackupError ? error.message : 'Could not read that file.')
    }
  }

  async function pickSyncFile() {
    const picker = (window as unknown as FilePickerWindow).showOpenFilePicker
    if (!picker) return
    const [handle] = await picker({
      types: [{ description: 'Day Planner snapshot', accept: { 'application/json': ['.json'] } }],
    })
    syncFile.current = handle
    await runSync()
  }

  async function runSync() {
    if (!syncFile.current) return pickSyncFile()
    try {
      const result = await syncWith(createFileHandleAdapter(syncFile.current), data)
      onReplace(result.data)
      setStatus(result.pulled ? 'Synced with your sync file.' : 'Sync file was empty — wrote your data to it.')
    } catch (error) {
      setStatus(error instanceof InvalidBackupError ? error.message : 'Sync failed. Check the file and try again.')
    }
  }

  return (
    <section className="panel">
      <h2>Sync &amp; backup</h2>
      <p className="hint">
        There is no server. Your tasks live on this device; syncing swaps a snapshot file through a folder both
        devices can see (iCloud Drive, Dropbox, Google Drive, AirDrop). Merging is safe to repeat — the newest
        edit of each task wins.
        {vaultPassphrase
          ? ' Snapshots are encrypted with your passphrase, so the file is unreadable in that folder.'
          : ''}
      </p>

      <div className="row">
        <button type="button" onClick={() => void download()}>
          Export snapshot
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Import &amp; merge
        </button>
        {canUseFileHandles ? (
          <button type="button" onClick={runSync}>
            {syncFile.current ? 'Sync now' : 'Choose sync file…'}
          </button>
        ) : null}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importFile(file, 'merge')
          event.target.value = ''
        }}
      />

      {status ? <p className="status">{status}</p> : null}
      <p className="hint">
        Device id <code>{data.deviceId.slice(0, 8)}</code> · {data.tasks.length} stored records
      </p>
    </section>
  )
}
