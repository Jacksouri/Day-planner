import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTask } from './tasks'
import { useReminders } from './useReminders'
import type { Task } from './types'

function task(overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: 'Standup' }, '2025-08-07T00:00:00.000Z'), ...overrides }
}

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(async () => FakeNotification.permission)
  static shown: Array<{ title: string; body?: string }> = []

  constructor(title: string, options?: NotificationOptions) {
    FakeNotification.shown.push({ title, body: options?.body })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2025, 7, 7, 8, 0, 0))
  FakeNotification.permission = 'default'
  FakeNotification.shown = []
  FakeNotification.requestPermission = vi.fn(async () => FakeNotification.permission)
  vi.stubGlobal('Notification', FakeNotification)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useReminders', () => {
  it('lists upcoming reminders soonest first', () => {
    const { result } = renderHook(() =>
      useReminders([
        task({ id: 'later', title: 'Later', due: '2025-08-07', time: '17:00', reminderLead: 0 }),
        task({ id: 'soon', title: 'Soon', due: '2025-08-07', time: '09:00', reminderLead: 0 }),
        task({ id: 'none', title: 'No reminder', due: '2025-08-07', time: '10:00' }),
      ]),
    )

    expect(result.current.upcoming.map((entry) => entry.title)).toEqual(['Soon', 'Later'])
  })

  it('does not notify until permission is granted', () => {
    renderHook(() => useReminders([task({ due: '2025-08-07', time: '08:30', reminderLead: 0 })]))

    act(() => void vi.advanceTimersByTime(60 * 60 * 1000))

    expect(FakeNotification.shown).toEqual([])
  })

  it('asks the browser for permission', async () => {
    FakeNotification.permission = 'granted'
    const { result } = renderHook(() => useReminders([]))

    await act(async () => {
      expect(await result.current.request()).toBe('granted')
    })

    expect(FakeNotification.requestPermission).toHaveBeenCalledOnce()
    expect(result.current.permission).toBe('granted')
  })

  it('fires a granted reminder at its time', () => {
    FakeNotification.permission = 'granted'
    renderHook(() =>
      useReminders([task({ title: 'Standup', due: '2025-08-07', time: '08:30', reminderLead: 0, notes: 'daily' })]),
    )

    act(() => void vi.advanceTimersByTime(29 * 60 * 1000))
    expect(FakeNotification.shown).toEqual([])

    act(() => void vi.advanceTimersByTime(2 * 60 * 1000))
    expect(FakeNotification.shown).toEqual([{ title: 'Standup', body: '08:30 · daily' }])
  })

  it('reports unsupported environments', async () => {
    vi.stubGlobal('Notification', undefined)
    const { result } = renderHook(() => useReminders([]))

    expect(result.current.permission).toBe('unsupported')
    await act(async () => {
      expect(await result.current.request()).toBe('unsupported')
    })
  })
})
