import { describe, expect, it } from 'vitest'
import { InvalidBackupError, mergeData, mergeTasks, parseBackup } from './merge'
import { createTask } from './tasks'
import { DATA_VERSION } from './types'
import type { PlannerData, Task } from './types'

function task(id: string, overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: id }, '2025-08-01T00:00:00.000Z'), id, ...overrides }
}

function data(tasks: Task[], deviceId = 'device-a'): PlannerData {
  return { version: DATA_VERSION, deviceId, updatedAt: '2025-08-01T00:00:00.000Z', tasks }
}

describe('mergeTasks', () => {
  it('unions tasks that exist on only one side', () => {
    const merged = mergeTasks([task('a')], [task('b')])
    expect(merged.map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps the newer edit of a shared task', () => {
    const local = task('a', { title: 'local', updatedAt: '2025-08-02T00:00:00.000Z' })
    const remote = task('a', { title: 'remote', updatedAt: '2025-08-03T00:00:00.000Z' })
    expect(mergeTasks([local], [remote])[0].title).toBe('remote')
    expect(mergeTasks([remote], [local])[0].title).toBe('remote')
  })

  it('does not resurrect a task deleted more recently', () => {
    const deleted = task('a', { deletedAt: '2025-08-03T00:00:00.000Z', updatedAt: '2025-08-03T00:00:00.000Z' })
    const edited = task('a', { title: 'edited', updatedAt: '2025-08-02T00:00:00.000Z' })
    expect(mergeTasks([edited], [deleted])[0].deletedAt).not.toBeNull()
  })

  it('lets a newer edit win over an older deletion', () => {
    const deleted = task('a', { deletedAt: '2025-08-02T00:00:00.000Z', updatedAt: '2025-08-02T00:00:00.000Z' })
    const edited = task('a', { title: 'edited', updatedAt: '2025-08-04T00:00:00.000Z' })
    expect(mergeTasks([deleted], [edited])[0]).toMatchObject({ title: 'edited', deletedAt: null })
  })

  it('prefers the deletion when timestamps tie', () => {
    const stamp = '2025-08-02T00:00:00.000Z'
    const deleted = task('a', { deletedAt: stamp, updatedAt: stamp })
    const edited = task('a', { title: 'edited', updatedAt: stamp })
    expect(mergeTasks([edited], [deleted])[0].deletedAt).toBe(stamp)
    expect(mergeTasks([deleted], [edited])[0].deletedAt).toBe(stamp)
  })

  it('is idempotent and order-independent', () => {
    const local = [task('a', { updatedAt: '2025-08-02T00:00:00.000Z' }), task('b')]
    const remote = [task('a', { title: 'newer', updatedAt: '2025-08-05T00:00:00.000Z' }), task('c')]
    const once = mergeTasks(local, remote)
    const twice = mergeTasks(once, remote)
    const reversed = mergeTasks(remote, local)
    const key = (tasks: Task[]) =>
      [...tasks].sort((x, y) => x.id.localeCompare(y.id)).map((t) => `${t.id}:${t.title}`)
    expect(key(twice)).toEqual(key(once))
    expect(key(reversed)).toEqual(key(once))
  })
})

describe('mergeData', () => {
  it('keeps the local device id and refreshes the timestamp', () => {
    const merged = mergeData(data([task('a')], 'device-a'), data([task('b')], 'device-b'))
    expect(merged.deviceId).toBe('device-a')
    expect(merged.version).toBe(DATA_VERSION)
    expect(merged.tasks).toHaveLength(2)
    expect(merged.updatedAt > '2025-08-01T00:00:00.000Z').toBe(true)
  })
})

describe('parseBackup', () => {
  it('accepts a snapshot this app wrote', () => {
    const original = data([task('a', { tags: ['home'], subtasks: [{ id: 's', title: 'step', done: true }] })])
    const parsed = parseBackup(JSON.stringify(original))
    expect(parsed.tasks[0]).toMatchObject({ id: 'a', tags: ['home'] })
    expect(parsed.tasks[0].subtasks[0]).toMatchObject({ title: 'step', done: true })
  })

  it('fills in missing optional fields', () => {
    const parsed = parseBackup({ tasks: [{ id: 'a', title: 'Bare' }] })
    expect(parsed.tasks[0]).toMatchObject({
      notes: '',
      due: null,
      time: null,
      priority: 0,
      owner: 'both',
      reminderLead: null,
      tags: [],
      subtasks: [],
      done: false,
      recurrence: null,
      deletedAt: null,
    })
  })

  it('drops values it cannot trust', () => {
    const parsed = parseBackup({
      tasks: [
        {
          id: 'a',
          title: 'Odd',
          priority: 'urgent',
          reminderLead: -5,
          tags: ['ok', 7],
          recurrence: { unit: 'fortnight', interval: 3 },
          due: 42,
        },
      ],
    })
    expect(parsed.tasks[0]).toMatchObject({
      priority: 0,
      reminderLead: null,
      tags: ['ok'],
      recurrence: null,
      due: null,
    })
  })

  it('keeps known owners and treats anything else as shared', () => {
    const parsed = parseBackup({
      tasks: [
        { id: 'a', title: 'a', owner: 'jack' },
        { id: 'b', title: 'b', owner: 'parmiss' },
        { id: 'c', title: 'c', owner: 'someone-else' },
      ],
    })
    expect(parsed.tasks.map((t) => t.owner)).toEqual(['jack', 'parmiss', 'both'])
  })

  it('migrates the old named priorities and clamps numeric ones', () => {
    const parsed = parseBackup({
      tasks: [
        { id: 'a', title: 'a', priority: 'high' },
        { id: 'b', title: 'b', priority: 'low' },
        { id: 'c', title: 'c', priority: 'normal' },
        { id: 'd', title: 'd', priority: 9 },
        { id: 'e', title: 'e', priority: -2 },
      ],
    })
    expect(parsed.tasks.map((t) => t.priority)).toEqual([3, 1, 0, 3, 0])
  })

  it('normalizes bad recurrence intervals', () => {
    const parsed = parseBackup({ tasks: [{ id: 'a', title: 'x', recurrence: { unit: 'week', interval: 0 } }] })
    expect(parsed.tasks[0].recurrence).toEqual({ unit: 'week', interval: 1 })
  })

  it('rejects malformed input', () => {
    expect(() => parseBackup('not json')).toThrow(InvalidBackupError)
    expect(() => parseBackup('[]')).toThrow(/JSON object/)
    expect(() => parseBackup({ version: DATA_VERSION })).toThrow(/tasks/)
    expect(() => parseBackup({ tasks: [{ title: 'no id' }] })).toThrow(/id/)
    expect(() => parseBackup({ tasks: [{ id: 'a', title: 'x', subtasks: [{ done: true }] }] })).toThrow(/subtask/)
  })

  it('refuses snapshots from a newer app version', () => {
    expect(() => parseBackup({ version: DATA_VERSION + 1, tasks: [] })).toThrow(/newer version/)
  })
})
