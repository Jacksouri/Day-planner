import { describe, expect, it } from 'vitest'
import { buildCalendar, calendarFileName } from './calendar'
import { createTask } from './tasks'
import type { Task } from './types'

const NOW = new Date(2025, 7, 7, 8, 0, 0)

function task(overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: 'Task' }, '2025-08-07T00:00:00.000Z'), ...overrides }
}

function lines(tasks: Task[]): string[] {
  return buildCalendar(tasks, { now: NOW }).split('\r\n')
}

describe('buildCalendar', () => {
  it('wraps events in a valid calendar envelope', () => {
    const output = lines([])
    expect(output[0]).toBe('BEGIN:VCALENDAR')
    expect(output).toContain('VERSION:2.0')
    expect(output.at(-1)).toBe('END:VCALENDAR')
  })

  it('writes a timed event with a floating start and an alarm', () => {
    const output = lines([task({ title: 'Standup', due: '2025-08-07', time: '09:15', reminderLead: 10 })])

    expect(output).toContain('DTSTART:20250807T091500')
    expect(output).toContain('DTEND:20250807T094500')
    expect(output).toContain('SUMMARY:Standup')
    expect(output).toContain('TRIGGER:-PT10M')
    expect(output).toContain('BEGIN:VALARM')
  })

  it('writes an all-day event and moves its alarm to the morning', () => {
    const output = lines([task({ title: 'Renew passport', due: '2025-08-07', reminderLead: 0 })])

    expect(output).toContain('DTSTART;VALUE=DATE:20250807')
    expect(output).toContain('DTEND;VALUE=DATE:20250808')
    // Event starts at midnight, alarm at the 09:00 default reminder hour.
    expect(output).toContain('TRIGGER:PT540M')
  })

  it('marks priority with exclamation marks and an iCalendar PRIORITY', () => {
    const output = lines([task({ title: 'Taxes', due: '2025-08-07', priority: 3 })])
    expect(output).toContain('SUMMARY:Taxes !!!')
    expect(output).toContain('PRIORITY:1')
  })

  it('translates recurrence into an RRULE', () => {
    expect(lines([task({ due: '2025-08-07', recurrence: { unit: 'week', interval: 2 } })])).toContain(
      'RRULE:FREQ=WEEKLY;INTERVAL=2',
    )
    expect(lines([task({ due: '2025-08-07', recurrence: { unit: 'month', interval: 1 } })])).toContain(
      'RRULE:FREQ=MONTHLY;INTERVAL=1',
    )
  })

  it('puts notes and steps in the description and tags in categories', () => {
    const output = lines([
      task({
        due: '2025-08-07',
        notes: 'chapter 4',
        tags: ['school', 'reading'],
        subtasks: [
          { id: 'a', title: 'read', done: true },
          { id: 'b', title: 'summarize', done: false },
        ],
      }),
    ])
    expect(output).toContain('DESCRIPTION:chapter 4\\n[x] read\\n[ ] summarize')
    expect(output).toContain('CATEGORIES:school,reading')
  })

  it('escapes characters that would break the format', () => {
    const output = lines([task({ title: 'Buy milk, eggs; and bread', due: '2025-08-07' })])
    expect(output).toContain('SUMMARY:Buy milk\\, eggs\\; and bread')
  })

  it('folds long lines with a leading space', () => {
    const output = lines([task({ title: 'x'.repeat(120), due: '2025-08-07' })])
    const folded = output.filter((line) => line.startsWith(' '))
    expect(folded.length).toBeGreaterThan(0)
    expect(output.every((line) => line.length <= 76)).toBe(true)
  })

  it('skips done, deleted and undated tasks', () => {
    const output = lines([
      task({ title: 'Done', due: '2025-08-07', done: true }),
      task({ title: 'Deleted', due: '2025-08-07', deletedAt: '2025-08-07T00:00:00.000Z' }),
      task({ title: 'Someday' }),
    ])
    expect(output.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(0)
  })

  it('applies a default lead to tasks without their own reminder', () => {
    const output = buildCalendar([task({ due: '2025-08-07', time: '09:00' })], { now: NOW, defaultLead: 15 })
    expect(output).toContain('TRIGGER:-PT15M')
  })
})

describe('calendarFileName', () => {
  it('is dated and ends in .ics', () => {
    expect(calendarFileName(new Date('2025-08-07T09:00:00.000Z'))).toBe('day-planner-2025-08-07.ics')
  })
})
