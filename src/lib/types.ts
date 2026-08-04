/** 0 = none, then one, two or three exclamation marks. */
export type Priority = 0 | 1 | 2 | 3

export const PRIORITIES: Priority[] = [0, 1, 2, 3]

export function priorityMarks(priority: Priority): string {
  return '!'.repeat(priority)
}

/** Whose task it is; `both` is shared and shows up for either person. */
export type Owner = 'jack' | 'parmiss' | 'both'

export const OWNERS: Owner[] = ['both', 'jack', 'parmiss']

export const OWNER_LABELS: Record<Owner, string> = {
  both: 'Both',
  jack: 'Jack',
  parmiss: 'Parmiss',
}

export type RecurrenceUnit = 'day' | 'week' | 'month'

export interface Recurrence {
  unit: RecurrenceUnit
  interval: number
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  notes: string
  /** Calendar day the task is scheduled for, as `YYYY-MM-DD`, or null for the backlog. */
  due: string | null
  /** Optional time of day as `HH:MM`. */
  time: string | null
  priority: Priority
  owner: Owner
  tags: string[]
  subtasks: Subtask[]
  done: boolean
  completedAt: string | null
  /** Minutes before the scheduled time to remind, or null for no reminder. */
  reminderLead: number | null
  recurrence: Recurrence | null
  createdAt: string
  updatedAt: string
  /** Tombstone timestamp; deleted tasks are kept so merges cannot resurrect them. */
  deletedAt: string | null
}

export const DATA_VERSION = 1

export interface PlannerData {
  version: number
  deviceId: string
  updatedAt: string
  tasks: Task[]
}

export interface TaskDraft {
  title: string
  notes?: string
  due?: string | null
  time?: string | null
  priority?: Priority
  owner?: Owner
  tags?: string[]
  subtasks?: Subtask[]
  recurrence?: Recurrence | null
  reminderLead?: number | null
}
