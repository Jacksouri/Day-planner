import { fromDayKey } from './dates'
import { isActive } from './tasks'
import type { Task } from './types'

/** Tasks with a reminder but no time of day are reminded relative to this hour. */
export const DEFAULT_REMINDER_TIME = '09:00'

export const REMINDER_LEADS: Array<{ minutes: number; label: string }> = [
  { minutes: 0, label: 'at the time' },
  { minutes: 5, label: '5 minutes before' },
  { minutes: 15, label: '15 minutes before' },
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
]

/** The moment a task is scheduled for, or null when it has no date. */
export function scheduledAt(task: Task): Date | null {
  if (!task.due) return null
  const date = fromDayKey(task.due)
  const [hours, minutes] = (task.time ?? DEFAULT_REMINDER_TIME).split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function reminderAt(task: Task): Date | null {
  if (task.reminderLead === null || task.done) return null
  const scheduled = scheduledAt(task)
  if (!scheduled) return null
  return new Date(scheduled.getTime() - task.reminderLead * 60_000)
}

export interface ScheduledReminder {
  task: Task
  at: Date
  /** Milliseconds from `now` until the reminder fires. */
  delay: number
}

/**
 * Reminders that should fire between `now` and `now + windowMs`. Timers only survive while
 * the page is alive, so the app re-derives this list on every load rather than storing timers.
 */
export function dueReminders(tasks: Task[], now: Date, windowMs: number): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = []
  for (const task of tasks) {
    if (!isActive(task)) continue
    const at = reminderAt(task)
    if (!at) continue
    const delay = at.getTime() - now.getTime()
    if (delay < 0 || delay > windowMs) continue
    reminders.push({ task, at, delay })
  }
  return reminders.sort((a, b) => a.delay - b.delay)
}

export function notificationBody(task: Task): string {
  const parts: string[] = []
  if (task.time) parts.push(task.time)
  if (task.priority > 0) parts.push('!'.repeat(task.priority))
  if (task.notes) parts.push(task.notes)
  return parts.join(' · ')
}

export type NotificationPermissionState = 'unsupported' | NotificationPermission

export function notificationSupport(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}
