import { useState } from 'react'
import { parseQuickAdd } from '../lib/quickAdd'
import { OWNER_LABELS, priorityMarks } from '../lib/types'
import type { Owner, TaskDraft } from '../lib/types'

interface Props {
  today: string
  defaultDue: string | null
  defaultOwner: Owner
  onAdd(draft: TaskDraft): void
}

export function QuickAdd({ today, defaultDue, defaultOwner, onAdd }: Props) {
  const [value, setValue] = useState('')
  const preview = value.trim() ? parseQuickAdd(value, today) : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const draft = parseQuickAdd(value, today)
    if (!draft.title) return
    onAdd({ ...draft, due: draft.due ?? defaultDue, owner: draft.owner ?? defaultOwner })
    setValue('')
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <input
        aria-label="Add a task"
        placeholder="Add a task…  try: Email advisor tomorrow 9am #school !!! *weekly @30m +jack"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" disabled={!preview?.title}>
        Add
      </button>
      {preview?.title ? (
        <p className="quick-add-preview">
          <strong>{preview.title}</strong>
          <span className={`chip owner-${preview.owner ?? defaultOwner}`}>
            {OWNER_LABELS[preview.owner ?? defaultOwner]}
          </span>
          {preview.due ? <span className="chip">{preview.due}</span> : null}
          {preview.time ? <span className="chip">{preview.time}</span> : null}
          {preview.priority ? <span className="marks">{priorityMarks(preview.priority)}</span> : null}
          {preview.reminderLead !== null && preview.reminderLead !== undefined ? (
            <span className="chip">🔔 {preview.reminderLead}m before</span>
          ) : null}
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
