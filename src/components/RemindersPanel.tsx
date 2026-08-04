import { useState } from 'react'
import { buildCalendar, calendarFileName } from '../lib/calendar'
import type { Reminders } from '../lib/useReminders'
import type { Task } from '../lib/types'

interface Props {
  tasks: Task[]
  reminders: Reminders
}

export function RemindersPanel({ tasks, reminders }: Props) {
  const [status, setStatus] = useState<string | null>(null)

  function downloadCalendar() {
    const blob = new Blob([buildCalendar(tasks)], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = calendarFileName()
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Calendar file created — open it to add the events, alerts included.')
  }

  async function enable() {
    const result = await reminders.request()
    setStatus(
      result === 'granted'
        ? 'Notifications on. They fire while the planner is open.'
        : result === 'unsupported'
          ? 'This browser cannot show notifications.'
          : 'Notifications are blocked — allow them in your browser or system settings.',
    )
  }

  return (
    <section className="panel">
      <h2>Reminders</h2>

      <p className="hint">
        Set a reminder on any task in its details. While the planner is open it notifies you directly. For
        alerts when the app is closed — and to see tasks in the iPhone Calendar widget — add them to your
        phone&apos;s calendar; each event carries its own alarm.
      </p>

      <div className="row">
        {reminders.permission === 'granted' ? (
          <span className="status">Notifications enabled</span>
        ) : (
          <button type="button" onClick={enable} disabled={reminders.permission === 'unsupported'}>
            Enable notifications
          </button>
        )}
        <button type="button" onClick={downloadCalendar}>
          Add to phone calendar (.ics)
        </button>
      </div>

      {status ? <p className="status">{status}</p> : null}

      <h3>Next up</h3>
      {reminders.upcoming.length === 0 ? (
        <p className="empty">No reminders set yet.</p>
      ) : (
        <ul className="reminder-list">
          {reminders.upcoming.slice(0, 5).map((entry) => (
            <li key={entry.id}>
              <span>{entry.title}</span>
              <span className="chip">
                {entry.at.toLocaleString(undefined, {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        On iPhone, notifications only work once the planner is installed to your home screen (Share → Add to
        Home Screen), and iOS never fires them for a closed web app — that is what the calendar export is for.
      </p>
    </section>
  )
}
