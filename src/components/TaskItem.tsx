import { useState } from 'react'
import { formatTime } from '../lib/dates'
import { REMINDER_LEADS } from '../lib/reminders'
import { createSubtask, isOverdue } from '../lib/tasks'
import { PRIORITIES, priorityMarks } from '../lib/types'
import type { Priority, Task } from '../lib/types'

interface Props {
  task: Task
  today: string
  onToggle(id: string): void
  onToggleSub(id: string, subtaskId: string): void
  onEdit(id: string, patch: Partial<Task>): void
  onRemove(id: string): void
}

const PRIORITY_LABELS = ['none', '! low', '!! medium', '!!! urgent']

export function TaskItem({ task, today, onToggle, onToggleSub, onEdit, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const overdue = isOverdue(task, today)
  const doneSubtasks = task.subtasks.filter((subtask) => subtask.done).length

  function addSubtask(event: React.FormEvent) {
    event.preventDefault()
    if (!subtaskTitle.trim()) return
    onEdit(task.id, { subtasks: [...task.subtasks, createSubtask(subtaskTitle)] })
    setSubtaskTitle('')
  }

  return (
    <li className={`task priority-${task.priority}${task.done ? ' done' : ''}${overdue ? ' overdue' : ''}`}>
      <div className="task-row">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => onToggle(task.id)}
          aria-label={`Mark "${task.title}" ${task.done ? 'not done' : 'done'}`}
        />
        <button type="button" className="task-title" onClick={() => setOpen((value) => !value)}>
          <span>{task.title}</span>
          <span className="task-meta">
            {task.priority > 0 ? (
              <span className="marks" aria-label={`Priority ${task.priority} of 3`}>
                {priorityMarks(task.priority)}
              </span>
            ) : null}
            {task.time ? <span className="chip">{formatTime(task.time)}</span> : null}
            {task.reminderLead !== null ? (
              <span className="chip" title="Reminder set">
                🔔
              </span>
            ) : null}
            {overdue ? <span className="chip warn">overdue</span> : null}
            {task.recurrence ? (
              <span className="chip" title={`Repeats every ${task.recurrence.interval} ${task.recurrence.unit}`}>
                ↻
              </span>
            ) : null}
            {task.subtasks.length > 0 ? (
              <span className="chip">
                {doneSubtasks}/{task.subtasks.length}
              </span>
            ) : null}
            {task.tags.map((tag) => (
              <span className="chip tag" key={tag}>
                #{tag}
              </span>
            ))}
          </span>
        </button>
      </div>

      {open ? (
        <div className="task-detail">
          <label>
            Title
            <input value={task.title} onChange={(event) => onEdit(task.id, { title: event.target.value })} />
          </label>
          <label>
            Notes
            <textarea
              rows={2}
              value={task.notes}
              onChange={(event) => onEdit(task.id, { notes: event.target.value })}
            />
          </label>
          <div className="task-detail-grid">
            <label>
              Date
              <input
                type="date"
                value={task.due ?? ''}
                onChange={(event) => onEdit(task.id, { due: event.target.value || null })}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={task.time ?? ''}
                onChange={(event) => onEdit(task.id, { time: event.target.value || null })}
              />
            </label>
            <label>
              Priority
              <select
                value={task.priority}
                onChange={(event) => onEdit(task.id, { priority: Number(event.target.value) as Priority })}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reminder
              <select
                value={task.reminderLead ?? ''}
                onChange={(event) =>
                  onEdit(task.id, {
                    reminderLead: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              >
                <option value="">none</option>
                {REMINDER_LEADS.map((lead) => (
                  <option key={lead.minutes} value={lead.minutes}>
                    {lead.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Repeat
              <select
                value={task.recurrence ? `${task.recurrence.interval}-${task.recurrence.unit}` : ''}
                onChange={(event) => {
                  const value = event.target.value
                  if (!value) return onEdit(task.id, { recurrence: null })
                  const [interval, unit] = value.split('-')
                  onEdit(task.id, {
                    recurrence: { interval: Number(interval), unit: unit as 'day' | 'week' | 'month' },
                  })
                }}
              >
                <option value="">never</option>
                <option value="1-day">daily</option>
                <option value="1-week">weekly</option>
                <option value="2-week">every 2 weeks</option>
                <option value="1-month">monthly</option>
              </select>
            </label>
          </div>
          <label>
            Tags (comma separated)
            <input
              value={task.tags.join(', ')}
              onChange={(event) => onEdit(task.id, { tags: event.target.value.split(',') })}
            />
          </label>

          <ul className="subtasks">
            {task.subtasks.map((subtask) => (
              <li key={subtask.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={() => onToggleSub(task.id, subtask.id)}
                  />
                  <span className={subtask.done ? 'done' : undefined}>{subtask.title}</span>
                </label>
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    onEdit(task.id, { subtasks: task.subtasks.filter((item) => item.id !== subtask.id) })
                  }
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
          <form className="subtask-add" onSubmit={addSubtask}>
            <input
              aria-label="Add a step"
              placeholder="Add a step…"
              value={subtaskTitle}
              onChange={(event) => setSubtaskTitle(event.target.value)}
            />
            <button type="submit">Add step</button>
          </form>

          <button type="button" className="danger" onClick={() => onRemove(task.id)}>
            Delete task
          </button>
        </div>
      ) : null}
    </li>
  )
}
