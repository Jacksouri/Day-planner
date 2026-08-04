import { DATA_VERSION } from './types'
import type { Owner, PlannerData, Priority, Subtask, Task } from './types'

/**
 * Last-write-wins merge keyed by task id, so two devices can exchange snapshot files
 * in any order and any number of times and still converge on the same result.
 * Tombstoned tasks stay tombstoned unless the other side has a strictly newer edit.
 */
export function mergeTasks(local: Task[], remote: Task[]): Task[] {
  const merged = new Map<string, Task>()
  for (const task of local) merged.set(task.id, task)
  for (const task of remote) {
    const existing = merged.get(task.id)
    if (!existing) {
      merged.set(task.id, task)
      continue
    }
    merged.set(task.id, pickNewer(existing, task))
  }
  return [...merged.values()]
}

function pickNewer(a: Task, b: Task): Task {
  if (a.updatedAt > b.updatedAt) return a
  if (b.updatedAt > a.updatedAt) return b
  // Identical timestamps: prefer the deletion so a delete is never silently undone.
  if (a.deletedAt && !b.deletedAt) return a
  if (b.deletedAt && !a.deletedAt) return b
  return a
}

export function mergeData(local: PlannerData, remote: PlannerData): PlannerData {
  return {
    version: DATA_VERSION,
    deviceId: local.deviceId,
    updatedAt: new Date().toISOString(),
    tasks: mergeTasks(local.tasks, remote.tasks),
  }
}

export class InvalidBackupError extends Error {}

/** Validates and normalizes a snapshot parsed from an untrusted file. */
export function parseBackup(raw: unknown): PlannerData {
  if (typeof raw === 'string') {
    try {
      return parseBackup(JSON.parse(raw) as unknown)
    } catch (error) {
      if (error instanceof InvalidBackupError) throw error
      throw new InvalidBackupError('File is not valid JSON.')
    }
  }
  if (!isRecord(raw)) throw new InvalidBackupError('Backup must be a JSON object.')
  if (!Array.isArray(raw.tasks)) throw new InvalidBackupError('Backup is missing a "tasks" list.')
  const version = typeof raw.version === 'number' ? raw.version : DATA_VERSION
  if (version > DATA_VERSION) {
    throw new InvalidBackupError(`Backup was written by a newer version (${version}). Update the app first.`)
  }
  return {
    version: DATA_VERSION,
    deviceId: typeof raw.deviceId === 'string' ? raw.deviceId : 'unknown',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    tasks: raw.tasks.map(normalizeTask),
  }
}

/** Snapshots written before priorities became 0–3 used these names. */
const LEGACY_PRIORITIES: Record<string, Priority> = { low: 1, normal: 0, high: 3 }

function normalizePriority(raw: unknown): Priority {
  if (typeof raw === 'string' && raw in LEGACY_PRIORITIES) return LEGACY_PRIORITIES[raw]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.min(3, Math.max(0, Math.round(raw))) as Priority
}

function normalizeOwner(raw: unknown): Owner {
  return raw === 'jack' || raw === 'parmiss' ? raw : 'both'
}

function normalizeTask(raw: unknown): Task {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    throw new InvalidBackupError('Every task needs an "id" and a "title".')
  }
  const now = new Date().toISOString()
  return {
    id: raw.id,
    title: raw.title,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    due: typeof raw.due === 'string' ? raw.due : null,
    time: typeof raw.time === 'string' ? raw.time : null,
    priority: normalizePriority(raw.priority),
    owner: normalizeOwner(raw.owner),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map(normalizeSubtask) : [],
    done: raw.done === true,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    reminderLead:
      typeof raw.reminderLead === 'number' && raw.reminderLead >= 0 ? Math.round(raw.reminderLead) : null,
    recurrence: normalizeRecurrence(raw.recurrence),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : null,
  }
}

function normalizeSubtask(raw: unknown): Subtask {
  if (!isRecord(raw) || typeof raw.title !== 'string') {
    throw new InvalidBackupError('Every subtask needs a "title".')
  }
  return {
    id: typeof raw.id === 'string' ? raw.id : `${Math.random().toString(36).slice(2)}`,
    title: raw.title,
    done: raw.done === true,
  }
}

function normalizeRecurrence(raw: unknown): Task['recurrence'] {
  if (!isRecord(raw)) return null
  if (raw.unit !== 'day' && raw.unit !== 'week' && raw.unit !== 'month') return null
  const interval = typeof raw.interval === 'number' && raw.interval >= 1 ? Math.round(raw.interval) : 1
  return { unit: raw.unit, interval }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
