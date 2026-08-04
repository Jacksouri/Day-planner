import { addDays, addMonths } from './dates'
import type { Priority, Recurrence, Subtask, Task, TaskDraft } from './types'

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 }

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createTask(draft: TaskDraft, now: string = new Date().toISOString()): Task {
  return {
    id: createId(),
    title: draft.title.trim(),
    notes: draft.notes?.trim() ?? '',
    due: draft.due ?? null,
    time: draft.time ?? null,
    priority: draft.priority ?? 'normal',
    tags: normalizeTags(draft.tags ?? []),
    subtasks: draft.subtasks ?? [],
    done: false,
    completedAt: null,
    recurrence: draft.recurrence ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  for (const tag of tags) {
    const normalized = tag.trim().replace(/^#/, '').toLowerCase()
    if (normalized) seen.add(normalized)
  }
  return [...seen]
}

export function updateTask(task: Task, patch: Partial<Task>, now: string = new Date().toISOString()): Task {
  const next = { ...task, ...patch, updatedAt: now }
  if (patch.tags) next.tags = normalizeTags(patch.tags)
  if (typeof patch.title === 'string') next.title = patch.title.trim()
  return next
}

export function deleteTask(task: Task, now: string = new Date().toISOString()): Task {
  return { ...task, deletedAt: now, updatedAt: now }
}

export function nextDueDate(due: string, recurrence: Recurrence): string {
  const interval = Math.max(1, Math.round(recurrence.interval))
  switch (recurrence.unit) {
    case 'day':
      return addDays(due, interval)
    case 'week':
      return addDays(due, interval * 7)
    case 'month':
      return addMonths(due, interval)
  }
}

export interface ToggleResult {
  /** The task as it should be stored (rescheduled when recurring). */
  task: Task
  /** A completed copy kept in history, present only for recurring completions. */
  logged: Task | null
}

/**
 * Completing a recurring task rolls it forward to its next occurrence and archives
 * a completed copy so history stays accurate.
 */
export function toggleTask(task: Task, now: string = new Date().toISOString()): ToggleResult {
  if (task.done) {
    return { task: { ...task, done: false, completedAt: null, updatedAt: now }, logged: null }
  }
  if (task.recurrence && task.due) {
    const logged: Task = {
      ...task,
      id: createId(),
      done: true,
      completedAt: now,
      recurrence: null,
      createdAt: now,
      updatedAt: now,
    }
    const rolled: Task = {
      ...task,
      due: nextDueDate(task.due, task.recurrence),
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: false })),
      updatedAt: now,
    }
    return { task: rolled, logged }
  }
  return { task: { ...task, done: true, completedAt: now, updatedAt: now }, logged: null }
}

export function toggleSubtask(task: Task, subtaskId: string, now: string = new Date().toISOString()): Task {
  const subtasks = task.subtasks.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
  )
  return { ...task, subtasks, updatedAt: now }
}

export function createSubtask(title: string): Subtask {
  return { id: createId(), title: title.trim(), done: false }
}

export function isActive(task: Task): boolean {
  return task.deletedAt === null
}

/** Open tasks scheduled before `day` still need attention, so they surface in Today. */
export function isOverdue(task: Task, day: string): boolean {
  return !task.done && task.due !== null && task.due < day
}

export function tasksForDay(tasks: Task[], day: string, options: { includeOverdue?: boolean } = {}): Task[] {
  const includeOverdue = options.includeOverdue ?? false
  return sortTasks(
    tasks.filter(
      (task) => isActive(task) && (task.due === day || (includeOverdue && isOverdue(task, day))),
    ),
    day,
  )
}

export function backlogTasks(tasks: Task[]): Task[] {
  return sortTasks(tasks.filter((task) => isActive(task) && task.due === null && !task.done), '')
}

export function sortTasks(tasks: Task[], today: string): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const aOverdue = isOverdue(a, today)
    const bOverdue = isOverdue(b, today)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    if (a.time !== b.time) {
      if (a.time === null) return 1
      if (b.time === null) return -1
      return a.time < b.time ? -1 : 1
    }
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    return a.createdAt < b.createdAt ? -1 : 1
  })
}

export function allTags(tasks: Task[]): string[] {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (!isActive(task)) continue
    for (const tag of task.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag)
}

export function filterTasks(
  tasks: Task[],
  filters: { query?: string; tag?: string | null; showDone?: boolean },
): Task[] {
  const query = filters.query?.trim().toLowerCase() ?? ''
  return tasks.filter((task) => {
    if (!isActive(task)) return false
    if (!filters.showDone && task.done) return false
    if (filters.tag && !task.tags.includes(filters.tag)) return false
    if (!query) return true
    const haystack = [task.title, task.notes, ...task.tags, ...task.subtasks.map((s) => s.title)]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}

export function progress(tasks: Task[]): { done: number; total: number; percent: number } {
  const active = tasks.filter(isActive)
  const done = active.filter((task) => task.done).length
  const total = active.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}
