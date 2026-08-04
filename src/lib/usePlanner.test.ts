import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEY } from './storage'
import type { KeyValueStore } from './storage'
import { usePlanner } from './usePlanner'
import { createTask } from './tasks'
import { emptyData } from './storage'

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

function setup() {
  const store = memoryStore()
  const view = renderHook(() => usePlanner(store))
  return { store, view }
}

function stored(store: ReturnType<typeof memoryStore>) {
  return JSON.parse(store.map.get(STORAGE_KEY) as string) as { tasks: Array<{ title: string }> }
}

describe('usePlanner', () => {
  it('adds tasks and writes them to the store', () => {
    const { store, view } = setup()

    act(() => void view.result.current.addTask({ title: 'Walk dog' }))

    expect(view.result.current.tasks.map((t) => t.title)).toEqual(['Walk dog'])
    expect(stored(store).tasks).toHaveLength(1)
  })

  it('edits a task', () => {
    const { view } = setup()
    let id = ''
    act(() => {
      id = view.result.current.addTask({ title: 'Old' }).id
    })

    act(() => view.result.current.edit(id, { title: 'New', priority: 3 }))

    expect(view.result.current.tasks[0]).toMatchObject({ title: 'New', priority: 3 })
  })

  it('completes a one-off task in place', () => {
    const { view } = setup()
    let id = ''
    act(() => {
      id = view.result.current.addTask({ title: 'Pay rent' }).id
    })

    act(() => view.result.current.toggle(id))

    expect(view.result.current.tasks).toHaveLength(1)
    expect(view.result.current.tasks[0].done).toBe(true)
  })

  it('rolls a recurring task forward and keeps a completed copy', () => {
    const { view } = setup()
    let id = ''
    act(() => {
      id = view.result.current.addTask({
        title: 'Trash',
        due: '2025-08-07',
        recurrence: { unit: 'week', interval: 1 },
      }).id
    })

    act(() => view.result.current.toggle(id))

    const tasks = view.result.current.tasks
    expect(tasks).toHaveLength(2)
    expect(tasks.find((t) => t.id === id)).toMatchObject({ done: false, due: '2025-08-14' })
    expect(tasks.find((t) => t.id !== id)).toMatchObject({ done: true, due: '2025-08-07' })
  })

  it('toggles a step without touching the others', () => {
    const { view } = setup()
    let id = ''
    act(() => {
      id = view.result.current.addTask({
        title: 'Pack',
        subtasks: [
          { id: 'a', title: 'socks', done: false },
          { id: 'b', title: 'charger', done: false },
        ],
      }).id
    })

    act(() => view.result.current.toggleSub(id, 'b'))

    expect(view.result.current.tasks[0].subtasks.map((s) => s.done)).toEqual([false, true])
  })

  it('tombstones removed tasks so a later sync cannot resurrect them', () => {
    const { view } = setup()
    let id = ''
    act(() => {
      id = view.result.current.addTask({ title: 'Oops' }).id
    })

    act(() => view.result.current.remove(id))

    expect(view.result.current.tasks[0].deletedAt).not.toBeNull()
  })

  it('merges a remote snapshot into local state', () => {
    const { view } = setup()
    act(() => void view.result.current.addTask({ title: 'Local' }))

    act(() => {
      view.result.current.mergeIn({ ...emptyData('device-b'), tasks: [createTask({ title: 'Remote' })] })
    })

    expect(view.result.current.tasks.map((t) => t.title).sort()).toEqual(['Local', 'Remote'])
  })

  it('replaces local state wholesale and drops stale tombstones', () => {
    const { view } = setup()
    const stale = { ...createTask({ title: 'Ancient' }), deletedAt: '2000-01-01T00:00:00.000Z' }

    act(() => {
      view.result.current.replaceData({
        ...emptyData('device-b'),
        tasks: [stale, createTask({ title: 'Kept' })],
      })
    })

    expect(view.result.current.tasks.map((t) => t.title)).toEqual(['Kept'])
    expect(view.result.current.data.deviceId).toBe('device-b')
  })

  it('recovers stored data on remount', () => {
    const { store, view } = setup()
    act(() => void view.result.current.addTask({ title: 'Persisted' }))

    const remounted = renderHook(() => usePlanner(store))
    expect(remounted.result.current.tasks.map((t) => t.title)).toEqual(['Persisted'])
  })
})
