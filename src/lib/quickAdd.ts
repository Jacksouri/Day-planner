import { addDays, isDayKey, startOfWeek, toDayKey } from './dates'
import { normalizeTags } from './tasks'
import type { Priority, Recurrence, TaskDraft } from './types'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** `!` … `!!!` set priority 1–3; the words are kept as friendly aliases. */
const PRIORITY_WORDS: Record<string, Priority> = {
  '': 1,
  '!': 2,
  '!!': 3,
  low: 1,
  high: 3,
}

/**
 * Parses shorthand typed into the quick-add box, e.g.
 * `Email advisor tomorrow 9am #school !high *weekly`.
 */
export function parseQuickAdd(input: string, today: string = toDayKey(new Date())): TaskDraft {
  let text = ` ${input.trim()} `
  const tags: string[] = []
  let due: string | null = null
  let time: string | null = null
  let priority: Priority = 0
  let recurrence: Recurrence | null = null
  let reminderLead: number | null = null

  text = text.replace(/\s#([\w-]+)/g, (_match, tag: string) => {
    tags.push(tag)
    return ' '
  })

  text = text.replace(/\s!(!?!?|high|low)(?=\s)/gi, (_match, word: string) => {
    priority = PRIORITY_WORDS[word.toLowerCase()] ?? 1
    return ' '
  })

  text = text.replace(/\s@(\d+)\s*(m|min|mins|h|hr|hrs|d)?(?=\s)/gi, (_match, amount: string, unit = 'm') => {
    const multiplier = /^d/i.test(unit) ? 1440 : /^h/i.test(unit) ? 60 : 1
    reminderLead = Number(amount) * multiplier
    return ' '
  })

  text = text.replace(/\s\*(daily|weekly|monthly|every\s+(\d+)\s*(day|week|month)s?)\b/gi, (match) => {
    recurrence = parseRecurrence(match.trim().slice(1))
    return ' '
  })

  text = text.replace(/\s(\d{4}-\d{2}-\d{2})\b/, (match, key: string) => {
    if (!isDayKey(key)) return match
    due = key
    return ' '
  })

  text = text.replace(/\s(today|tonight|tomorrow|next\s+week)\b/i, (_match, word: string) => {
    const normalized = word.toLowerCase().replace(/\s+/g, ' ')
    if (normalized === 'tomorrow') due = addDays(today, 1)
    else if (normalized === 'next week') due = addDays(startOfWeek(today), 7)
    else due = today
    if (normalized === 'tonight' && time === null) time = '20:00'
    return ' '
  })

  text = text.replace(/\s(?:next\s+)?(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat)(?:day)?\b/i, (match, word: string) => {
    const index = weekdayIndex(word)
    if (index === -1) return match
    due = nextWeekday(today, index)
    return ' '
  })

  text = text.replace(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (_match, hour: string, minute: string | undefined, meridiem: string) => {
    let hours = Number(hour) % 12
    if (meridiem.toLowerCase() === 'pm') hours += 12
    time = `${String(hours).padStart(2, '0')}:${minute ?? '00'}`
    return ' '
  })

  text = text.replace(/\sat\s+(\d{1,2}):(\d{2})\b/, (_match, hour: string, minute: string) => {
    time = `${hour.padStart(2, '0')}:${minute}`
    return ' '
  })

  return {
    title: text.replace(/\s+/g, ' ').trim(),
    due,
    time,
    priority,
    tags: normalizeTags(tags),
    recurrence,
    reminderLead,
  }
}

function parseRecurrence(token: string): Recurrence | null {
  const simple: Record<string, Recurrence> = {
    daily: { unit: 'day', interval: 1 },
    weekly: { unit: 'week', interval: 1 },
    monthly: { unit: 'month', interval: 1 },
  }
  const lower = token.toLowerCase()
  if (lower in simple) return simple[lower]
  const match = /^every\s+(\d+)\s*(day|week|month)s?$/.exec(lower)
  if (!match) return null
  return { unit: match[2] as Recurrence['unit'], interval: Number(match[1]) }
}

function weekdayIndex(word: string): number {
  const lower = word.toLowerCase()
  return WEEKDAYS.findIndex((day) => day.startsWith(lower) || lower.startsWith(day.slice(0, 3)))
}

/** The next occurrence of `weekday` strictly after `today`. */
function nextWeekday(today: string, weekday: number): string {
  const current = new Date(`${today}T00:00:00`).getDay()
  const delta = ((weekday - current + 7) % 7) || 7
  return addDays(today, delta)
}
