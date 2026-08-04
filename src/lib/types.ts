export type Priority = 'low' | 'normal' | 'high'

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
  tags: string[]
  subtasks: Subtask[]
  done: boolean
  completedAt: string | null
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
  tags?: string[]
  subtasks?: Subtask[]
  recurrence?: Recurrence | null
}
