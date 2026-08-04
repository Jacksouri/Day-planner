import { useState } from 'react'
import { parseQuickAdd } from '../lib/quickAdd'
import type { TaskDraft } from '../lib/types'

interface Props {
  today: string
  defaultDue: string | null
  onAdd(draft: TaskDraft): void
}

export function QuickAdd({ today, defaultDue, onAdd }: Props) {
  const [value, setValue] = useState('')
  const preview = value.trim() ? parseQuickAdd(value, today) : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const draft = parseQuickAdd(value, today)
    if (!draft.title) return
    onAdd({ ...draft, due: draft.due ?? defaultDue })
    setValue('')
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <input
        aria-label="Add a task"
        placeholder="Add a task…  try: Email advisor tomorrow 9am #school !high *weekly"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" disabled={!preview?.title}>
        Add
      </button>
      {preview?.title ? (
        <p className="quick-add-preview">
          <strong>{preview.title}</strong>
          {preview.due ? <span className="chip">{preview.due}</span> : null}
          {preview.time ? <span className="chip">{preview.time}</span> : null}
          {preview.priority !== 'normal' ? <span className="chip">{preview.priority}</span> : null}
          {preview.recurrence ? (
            <span className="chip">
              every {preview.recurrence.interval} {preview.recurrence.unit}
              {preview.recurrence.interval > 1 ? 's' : ''}
            </span>
          ) : null}
          {preview.tags?.map((tag) => (
            <span className="chip tag" key={tag}>
              #{tag}
            </span>
          ))}
        </p>
      ) : null}
    </form>
  )
}
