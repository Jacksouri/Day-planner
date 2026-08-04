import { fromDayKey } from './dates'
import { DEFAULT_REMINDER_TIME, scheduledAt } from './reminders'
import { isActive } from './tasks'
import type { Recurrence, Task } from './types'

const RRULE_FREQ: Record<Recurrence['unit'], string> = {
  day: 'DAILY',
  week: 'WEEKLY',
  month: 'MONTHLY',
}

/** Default event length for a task that has a time but no explicit duration. */
const EVENT_MINUTES = 30

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local (floating) date-time, so an event stays at 9am wherever the phone is. */
function localStamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

function utcStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
}

/** iCalendar forbids raw commas, semicolons, backslashes and newlines in text values. */
function escapeText(value: string): string {
  return value.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

/** Lines longer than 75 octets must be folded with a leading space on continuations. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const chunks = [line.slice(0, 75)]
  for (let index = 75; index < line.length; index += 74) chunks.push(` ${line.slice(index, index + 74)}`)
  return chunks.join('\r\n')
}

export interface CalendarOptions {
  /** Reminder lead used for tasks that have no reminder of their own. */
  defaultLead?: number
  now?: Date
}

/**
 * Builds an .ics feed of the scheduled tasks. Importing it into the iPhone Calendar is what
 * makes the phone itself fire reminders (and lets the stock Calendar widget show them) without
 * this app needing a push server.
 */
export function buildCalendar(tasks: Task[], options: CalendarOptions = {}): string {
  const now = options.now ?? new Date()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Day Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Day Planner',
  ]

  for (const task of tasks) {
    if (!isActive(task) || task.done || !task.due) continue
    lines.push(...eventLines(task, now, options.defaultLead ?? 0))
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n')
}

function eventLines(task: Task, now: Date, defaultLead: number): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${task.id}@day-planner`, `DTSTAMP:${utcStamp(now)}`]

  if (task.time) {
    const start = scheduledAt(task) as Date
    const end = new Date(start.getTime() + EVENT_MINUTES * 60_000)
    lines.push(`DTSTART:${localStamp(start)}`, `DTEND:${localStamp(end)}`)
  } else {
    // All-day events use inclusive start / exclusive end date values.
    const start = fromDayKey(task.due as string)
    const end = new Date(start.getTime())
    end.setDate(end.getDate() + 1)
    lines.push(`DTSTART;VALUE=DATE:${localStamp(start).slice(0, 8)}`, `DTEND;VALUE=DATE:${localStamp(end).slice(0, 8)}`)
  }

  const marks = task.priority > 0 ? ` ${'!'.repeat(task.priority)}` : ''
  lines.push(`SUMMARY:${escapeText(task.title + marks)}`)

  const description = [task.notes, ...task.subtasks.map((subtask) => `${subtask.done ? '[x]' : '[ ]'} ${subtask.title}`)]
    .filter(Boolean)
    .join('\n')
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
  if (task.tags.length > 0) lines.push(`CATEGORIES:${task.tags.map(escapeText).join(',')}`)
  // iCalendar priority runs 1 (highest) to 9; map !!! → 1, !! → 5, ! → 9.
  if (task.priority > 0) lines.push(`PRIORITY:${[9, 9, 5, 1][task.priority]}`)
  if (task.recurrence) {
    lines.push(`RRULE:FREQ=${RRULE_FREQ[task.recurrence.unit]};INTERVAL=${Math.max(1, task.recurrence.interval)}`)
  }

  const lead = task.reminderLead ?? defaultLead
  // An all-day event starts at midnight, so its alert is offset to the default reminder hour.
  const offset = task.time ? -lead : hourMinutes(DEFAULT_REMINDER_TIME) - lead
  const trigger = offset < 0 ? `-PT${-offset}M` : `PT${offset}M`
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(task.title)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
    'END:VEVENT',
  )
  return lines
}

function hourMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function calendarFileName(now: Date = new Date()): string {
  return `day-planner-${now.toISOString().slice(0, 10)}.ics`
}
