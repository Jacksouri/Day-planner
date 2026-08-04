import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskItem } from './TaskItem'
import { createTask } from '../lib/tasks'
import type { Task } from '../lib/types'

const TODAY = '2025-08-07'

function setup(overrides: Partial<Task> = {}) {
  const task: Task = { ...createTask({ title: 'Draft essay' }, '2025-08-07T09:00:00.000Z'), ...overrides }
  const handlers = {
    onToggle: vi.fn(),
    onToggleSub: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
  }
  render(<TaskItem task={task} today={TODAY} {...handlers} />)
  return { task, handlers, user: userEvent.setup() }
}

async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Draft essay/ }))
}

describe('TaskItem', () => {
  it('marks an overdue task and shows its metadata', () => {
    setup({
      due: '2025-08-01',
      time: '09:30',
      tags: ['school'],
      recurrence: { unit: 'week', interval: 1 },
      subtasks: [
        { id: 'a', title: 'outline', done: true },
        { id: 'b', title: 'sources', done: false },
      ],
    })

    expect(screen.getByText('overdue')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('#school')).toBeInTheDocument()
    expect(screen.getByTitle(/Repeats every 1 week/)).toBeInTheDocument()
  })

  it('does not flag a completed past-due task as overdue', () => {
    setup({ due: '2025-08-01', done: true, completedAt: '2025-08-02T00:00:00.000Z' })
    expect(screen.queryByText('overdue')).not.toBeInTheDocument()
  })

  it('toggles through the checkbox', async () => {
    const { task, handlers, user } = setup()
    await user.click(screen.getByLabelText('Mark "Draft essay" done'))
    expect(handlers.onToggle).toHaveBeenCalledWith(task.id)
  })

  it('edits date, time, priority and recurrence from the detail panel', async () => {
    const { task, handlers, user } = setup()
    await openDetails(user)

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-08-09' } })
    await user.selectOptions(screen.getByLabelText('Priority'), 'high')
    await user.selectOptions(screen.getByLabelText('Repeat'), '2-week')

    expect(handlers.onEdit).toHaveBeenCalledWith(task.id, { due: '2025-08-09' })
    expect(handlers.onEdit).toHaveBeenCalledWith(task.id, { priority: 'high' })
    expect(handlers.onEdit).toHaveBeenCalledWith(task.id, { recurrence: { interval: 2, unit: 'week' } })
  })

  it('clears recurrence when set back to never', async () => {
    const { task, handlers, user } = setup({ recurrence: { unit: 'week', interval: 1 } })
    await openDetails(user)

    await user.selectOptions(screen.getByLabelText('Repeat'), '')
    expect(handlers.onEdit).toHaveBeenCalledWith(task.id, { recurrence: null })
  })

  it('splits comma separated tags', async () => {
    const { task, handlers, user } = setup()
    await openDetails(user)

    fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: 'home, errands' } })
    expect(handlers.onEdit).toHaveBeenLastCalledWith(task.id, { tags: ['home', ' errands'] })
  })

  it('adds and removes steps', async () => {
    const { task, handlers, user } = setup({ subtasks: [{ id: 'a', title: 'outline', done: false }] })
    await openDetails(user)

    await user.type(screen.getByLabelText('Add a step'), 'sources')
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(handlers.onEdit).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ subtasks: expect.arrayContaining([expect.objectContaining({ title: 'sources' })]) }),
    )

    await user.click(screen.getByRole('button', { name: 'remove' }))
    expect(handlers.onEdit).toHaveBeenLastCalledWith(task.id, { subtasks: [] })
  })

  it('ignores an empty step', async () => {
    const { handlers, user } = setup()
    await openDetails(user)

    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(handlers.onEdit).not.toHaveBeenCalled()
  })

  it('deletes the task', async () => {
    const { task, handlers, user } = setup()
    await openDetails(user)

    await user.click(screen.getByRole('button', { name: 'Delete task' }))
    expect(handlers.onRemove).toHaveBeenCalledWith(task.id)
  })
})
