import { parseBackup } from './merge'
import { createId } from './tasks'
import { DATA_VERSION } from './types'
import type { PlannerData, Task } from './types'

export const STORAGE_KEY = 'day-planner/data/v1'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function emptyData(deviceId: string = createId()): PlannerData {
  return { version: DATA_VERSION, deviceId, updatedAt: new Date().toISOString(), tasks: [] }
}

export function loadData(store: KeyValueStore): PlannerData {
  const raw = store.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    return parseBackup(raw)
  } catch {
    // Corrupt local state must not brick the app; start clean and keep the bad copy aside.
    try {
      store.setItem(`${STORAGE_KEY}/corrupt/${Date.now()}`, raw)
    } catch {
      // Ignore quota failures while quarantining.
    }
    return emptyData()
  }
}

export function saveData(store: KeyValueStore, data: PlannerData): void {
  store.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** Drops tombstones older than `days` so snapshots do not grow without bound. */
export function pruneTombstones(tasks: Task[], days = 30, now: Date = new Date()): Task[] {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return tasks.filter((task) => task.deletedAt === null || task.deletedAt > cutoff)
}
