import { describe, expect, it } from 'vitest'
import {
  allTags,
  backlogTasks,
  createTask,
  deleteTask,
  filterTasks,
  isOverdue,
  nextDueDate,
  normalizeTags,
  progress,
  sortTasks,
  tasksForDay,
  toggleSubtask,
  toggleTask,
  updateTask,
} from './tasks'
import type { Task } from './types'

const NOW = '2025-08-07T12:00:00.000Z'

function task(overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: 'Task' }, NOW), ...overrides }
}

describe('createTask', () => {
  it('trims input and applies defaults', () => {
    const created = createTask({ title: '  Water plants  ', notes: '  in the den ' }, NOW)
    expect(created.title).toBe('Water plants')
    expect(created.notes).toBe('in the den')
    expect(created).toMatchObject({ priority: 0, due: null, done: false, deletedAt: null, reminderLead: null })
    expect(created.createdAt).toBe(NOW)
  })

  it('gives every task a distinct id', () => {
    expect(createTask({ title: 'a' }).id).not.toBe(createTask({ title: 'b' }).id)
  })
})

describe('normalizeTags', () => {
  it('lowercases, strips hashes and de-duplicates', () => {
    expect(normalizeTags([' #School ', 'school', 'Work', '', '  '])).toEqual(['school', 'work'])
  })
})

describe('updateTask / deleteTask', () => {
  it('bumps updatedAt and normalizes patched fields', () => {
    const updated = updateTask(task(), { title: '  New  ', tags: ['#Home', 'home'] }, '2025-08-08T00:00:00.000Z')
    expect(updated.title).toBe('New')
    expect(updated.tags).toEqual(['home'])
    expect(updated.updatedAt).toBe('2025-08-08T00:00:00.000Z')
  })

  it('tombstones instead of dropping data', () => {
    const removed = deleteTask(task(), NOW)
    expect(removed.deletedAt).toBe(NOW)
    expect(removed.updatedAt).toBe(NOW)
  })
})

describe('nextDueDate', () => {
  it('advances by the recurrence unit', () => {
    expect(nextDueDate('2025-08-07', { unit: 'day', interval: 1 })).toBe('2025-08-08')
    expect(nextDueDate('2025-08-07', { unit: 'week', interval: 2 })).toBe('2025-08-21')
    expect(nextDueDate('2025-01-31', { unit: 'month', interval: 1 })).toBe('2025-02-28')
  })

  it('treats intervals below one as one', () => {
    expect(nextDueDate('2025-08-07', { unit: 'day', interval: 0 })).toBe('2025-08-08')
  })
})

describe('toggleTask', () => {
  it('completes a one-off task', () => {
    const result = toggleTask(task({ due: '2025-08-07' }), NOW)
    expect(result.task.done).toBe(true)
    expect(result.task.completedAt).toBe(NOW)
    expect(result.logged).toBeNull()
  })

  it('reopens a completed task', () => {
    const result = toggleTask(task({ done: true, completedAt: NOW }), NOW)
    expect(result.task.done).toBe(false)
    expect(result.task.completedAt).toBeNull()
  })

  it('rolls a recurring task forward and archives the completion', () => {
    const recurring = task({
      due: '2025-08-07',
      recurrence: { unit: 'week', interval: 1 },
      subtasks: [{ id: 's1', title: 'step', done: true }],
    })
    const result = toggleTask(recurring, NOW)

    expect(result.task.done).toBe(false)
    expect(result.task.due).toBe('2025-08-14')
    expect(result.task.subtasks[0].done).toBe(false)
    expect(result.logged).not.toBeNull()
    expect(result.logged).toMatchObject({ done: true, due: '2025-08-07', recurrence: null })
    expect(result.logged?.id).not.toBe(recurring.id)
  })

  it('completes a recurring task with no due date like a one-off', () => {
    const result = toggleTask(task({ recurrence: { unit: 'day', interval: 1 } }), NOW)
    expect(result.task.done).toBe(true)
    expect(result.logged).toBeNull()
  })
})

describe('toggleSubtask', () => {
  it('flips only the requested subtask', () => {
    const withSteps = task({
      subtasks: [
        { id: 'a', title: 'a', done: false },
        { id: 'b', title: 'b', done: false },
      ],
    })
    const next = toggleSubtask(withSteps, 'b', NOW)
    expect(next.subtasks.map((s) => s.done)).toEqual([false, true])
    expect(next.updatedAt).toBe(NOW)
  })
})

describe('scheduling queries', () => {
  const today = '2025-08-07'
  const dueToday = task({ id: '1', due: today, title: 'today' })
  const late = task({ id: '2', due: '2025-08-01', title: 'late' })
  const lateButDone = task({ id: '3', due: '2025-08-01', title: 'late done', done: true })
  const later = task({ id: '4', due: '2025-08-09', title: 'later' })
  const someday = task({ id: '5', due: null, title: 'someday' })
  const removed = task({ id: '6', due: today, title: 'gone', deletedAt: NOW })
  const all = [dueToday, late, lateButDone, later, someday, removed]

  it('flags only open past-due tasks as overdue', () => {
    expect(isOverdue(late, today)).toBe(true)
    expect(isOverdue(lateButDone, today)).toBe(false)
    expect(isOverdue(later, today)).toBe(false)
    expect(isOverdue(someday, today)).toBe(false)
  })

  it('lists a single day and excludes deleted tasks', () => {
    expect(tasksForDay(all, today).map((t) => t.id)).toEqual(['1'])
  })

  it('optionally pulls overdue tasks into the day', () => {
    expect(tasksForDay(all, today, { includeOverdue: true }).map((t) => t.id)).toEqual(['2', '1'])
  })

  it('lists unscheduled open tasks as the backlog', () => {
    expect(backlogTasks(all).map((t) => t.id)).toEqual(['5'])
  })
})

describe('sortTasks', () => {
  it('orders overdue, then by time, then priority, then age', () => {
    const today = '2025-08-07'
    const sorted = sortTasks(
      [
        task({ id: 'done', due: today, done: true }),
        task({ id: 'noon', due: today, time: '12:00' }),
        task({ id: 'overdue', due: '2025-08-01' }),
        task({ id: 'untimed-high', due: today, priority: 3 }),
        task({ id: 'morning', due: today, time: '08:00' }),
        task({ id: 'untimed-low', due: today, priority: 1 }),
      ],
      today,
    )
    expect(sorted.map((t) => t.id)).toEqual([
      'overdue',
      'morning',
      'noon',
      'untimed-high',
      'untimed-low',
      'done',
    ])
  })
})

describe('filterTasks', () => {
  const tasks = [
    task({ id: '1', title: 'Call dentist', tags: ['health'] }),
    task({ id: '2', title: 'Read chapter 4', notes: 'biology', tags: ['school'] }),
    task({ id: '3', title: 'Finished thing', done: true, tags: ['school'] }),
    task({ id: '4', title: 'Deleted thing', deletedAt: NOW }),
  ]

  it('hides done and deleted tasks by default', () => {
    expect(filterTasks(tasks, {}).map((t) => t.id)).toEqual(['1', '2'])
  })

  it('can include done tasks', () => {
    expect(filterTasks(tasks, { showDone: true }).map((t) => t.id)).toEqual(['1', '2', '3'])
  })

  it('filters by tag and searches title, notes and steps', () => {
    expect(filterTasks(tasks, { tag: 'school' }).map((t) => t.id)).toEqual(['2'])
    expect(filterTasks(tasks, { query: 'BIOLOGY' }).map((t) => t.id)).toEqual(['2'])
    expect(filterTasks(tasks, { query: 'nothing here' })).toEqual([])
  })
})

describe('allTags / progress', () => {
  it('ranks tags by use', () => {
    const tasks = [
      task({ tags: ['school'] }),
      task({ tags: ['school', 'home'] }),
      task({ tags: ['work'], deletedAt: NOW }),
    ]
    expect(allTags(tasks)).toEqual(['school', 'home'])
  })

  it('reports completion for active tasks only', () => {
    expect(progress([task({ done: true }), task(), task({ deletedAt: NOW })])).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    })
    expect(progress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })
})
