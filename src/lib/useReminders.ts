import { useCallback, useEffect, useMemo, useState } from 'react'
import { dueReminders, notificationBody, reminderAt } from './reminders'
import type { NotificationPermissionState } from './reminders'
import type { Task } from './types'

/** Timers are only armed for reminders inside this window; the effect re-runs to pick up the rest. */
export const SCHEDULE_WINDOW_MS = 6 * 60 * 60 * 1000

export interface UpcomingReminder {
  id: string
  title: string
  at: Date
}

export interface Reminders {
  permission: NotificationPermissionState
  /** Reminders still ahead of now, soonest first. */
  upcoming: UpcomingReminder[]
  request(): Promise<NotificationPermissionState>
}

/**
 * Fires notifications for reminders that come due while the app is open. iOS never delivers
 * scheduled alerts to a closed web app, so the calendar export is the reliable path for those.
 */
export function useReminders(tasks: Task[]): Reminders {
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  const request = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported' as const
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return tasks
      .map((task) => ({ task, at: reminderAt(task) }))
      .filter((entry): entry is { task: Task; at: Date } => entry.at !== null && entry.at.getTime() > now)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map(({ task, at }) => ({ id: task.id, title: task.title, at }))
  }, [tasks])

  useEffect(() => {
    if (permission !== 'granted') return
    const timers = dueReminders(tasks, new Date(), SCHEDULE_WINDOW_MS).map(({ task, delay }) =>
      setTimeout(() => {
        new Notification(task.title, { body: notificationBody(task), tag: task.id })
      }, delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [permission, tasks])

  return { permission, upcoming, request }
}
