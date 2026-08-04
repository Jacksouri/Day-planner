import { describe, expect, it } from 'vitest'
import { dueReminders, notificationBody, reminderAt, scheduledAt } from './reminders'
import { createTask } from './tasks'
import type { Task } from './types'

function task(overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: 'Task' }, '2025-08-07T00:00:00.000Z'), ...overrides }
}

describe('scheduledAt', () => {
  it('combines the day and time in local time', () => {
    const at = scheduledAt(task({ due: '2025-08-07', time: '09:30' })) as Date
    expect(at.getFullYear()).toBe(2025)
    expect(at.getHours()).toBe(9)
    expect(at.getMinutes()).toBe(30)
  })

  it('defaults an all-day task to the morning', () => {
    expect((scheduledAt(task({ due: '2025-08-07' })) as Date).getHours()).toBe(9)
  })

  it('has no time without a date', () => {
    expect(scheduledAt(task())).toBeNull()
  })
})

describe('reminderAt', () => {
  it('subtracts the lead time from the scheduled moment', () => {
    const at = reminderAt(task({ due: '2025-08-07', time: '09:00', reminderLead: 30 })) as Date
    expect(at.getHours()).toBe(8)
    expect(at.getMinutes()).toBe(30)
  })

  it('is null without a reminder, without a date, or once done', () => {
    expect(reminderAt(task({ due: '2025-08-07', time: '09:00' }))).toBeNull()
    expect(reminderAt(task({ reminderLead: 15 }))).toBeNull()
    expect(reminderAt(task({ due: '2025-08-07', reminderLead: 15, done: true }))).toBeNull()
  })
})

describe('dueReminders', () => {
  const now = new Date(2025, 7, 7, 8, 0, 0)
  const hour = 60 * 60 * 1000

  it('returns reminders inside the window, soonest first', () => {
    const soon = task({ id: 'soon', due: '2025-08-07', time: '08:30', reminderLead: 0 })
    const later = task({ id: 'later', due: '2025-08-07', time: '09:00', reminderLead: 0 })
    const outside = task({ id: 'outside', due: '2025-08-07', time: '23:00', reminderLead: 0 })

    const result = dueReminders([later, soon, outside], now, 2 * hour)

    expect(result.map((entry) => entry.task.id)).toEqual(['soon', 'later'])
    expect(result[0].delay).toBe(30 * 60 * 1000)
  })

  it('skips reminders already in the past and deleted tasks', () => {
    const past = task({ id: 'past', due: '2025-08-07', time: '07:00', reminderLead: 0 })
    const deleted = task({
      id: 'deleted',
      due: '2025-08-07',
      time: '08:30',
      reminderLead: 0,
      deletedAt: '2025-08-07T00:00:00.000Z',
    })

    expect(dueReminders([past, deleted], now, 12 * hour)).toEqual([])
  })
})

describe('notificationBody', () => {
  it('summarizes time, priority and notes', () => {
    expect(notificationBody(task({ time: '09:00', priority: 3, notes: 'bring notes' }))).toBe(
      '09:00 · !!! · bring notes',
    )
    expect(notificationBody(task())).toBe('')
  })
})
