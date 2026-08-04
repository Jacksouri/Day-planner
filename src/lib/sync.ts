import { mergeData, parseBackup } from './merge'
import type { PlannerData } from './types'

/**
 * Sync is deliberately just "read a snapshot, merge, write it back", so any place both
 * devices can see the same file (iCloud Drive, Dropbox, AirDrop, a USB stick) works as a
 * transport and no server is involved.
 */
export interface SyncAdapter {
  id: string
  label: string
  pull(): Promise<PlannerData | null>
  push(data: PlannerData): Promise<void>
}

export interface SyncResult {
  data: PlannerData
  pulled: boolean
}

export async function syncWith(adapter: SyncAdapter, local: PlannerData): Promise<SyncResult> {
  const remote = await adapter.pull()
  const data = remote ? mergeData(local, remote) : { ...local, updatedAt: new Date().toISOString() }
  await adapter.push(data)
  return { data, pulled: remote !== null }
}

export function backupFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `day-planner-${stamp}.json`
}

export function serializeBackup(data: PlannerData): string {
  return JSON.stringify(data, null, 2)
}

export async function readBackupFile(file: Blob): Promise<PlannerData> {
  return parseBackup(await blobText(file))
}

/** `Blob.text()` is missing on older iOS Safari, so fall back to FileReader. */
async function blobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'))
    reader.readAsText(blob)
  })
}

/** In-memory adapter used by tests and as the shape reference for real transports. */
export function createMemoryAdapter(initial: PlannerData | null = null): SyncAdapter & { snapshot: PlannerData | null } {
  const adapter = {
    id: 'memory',
    label: 'In-memory',
    snapshot: initial,
    async pull() {
      return adapter.snapshot
    },
    async push(data: PlannerData) {
      adapter.snapshot = JSON.parse(JSON.stringify(data)) as PlannerData
    },
  }
  return adapter
}

interface FileHandleLike {
  getFile(): Promise<Blob>
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
}

/**
 * Syncs through a single JSON file the user picks once — put it in an iCloud Drive or
 * Dropbox folder and every device that opens the same file stays in step.
 * Available in browsers with the File System Access API (desktop Chrome/Edge).
 */
export function createFileHandleAdapter(handle: FileHandleLike, label = 'Sync file'): SyncAdapter {
  return {
    id: 'file-handle',
    label,
    async pull() {
      const file = await handle.getFile()
      const text = await blobText(file)
      if (!text.trim()) return null
      return parseBackup(text)
    },
    async push(data: PlannerData) {
      const writable = await handle.createWritable()
      await writable.write(serializeBackup(data))
      await writable.close()
    },
  }
}
