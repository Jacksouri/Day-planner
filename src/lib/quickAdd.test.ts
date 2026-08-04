import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'

// 2025-08-07 is a Thursday.
const TODAY = '2025-08-07'

describe('parseQuickAdd', () => {
  it('keeps plain text as the title', () => {
    expect(parseQuickAdd('Buy milk', TODAY)).toMatchObject({
      title: 'Buy milk',
      due: null,
      time: null,
      priority: 0,
      tags: [],
      recurrence: null,
      reminderLead: null,
    })
  })

  it('reads relative dates', () => {
    expect(parseQuickAdd('Gym today', TODAY).due).toBe(TODAY)
    expect(parseQuickAdd('Gym tomorrow', TODAY).due).toBe('2025-08-08')
    expect(parseQuickAdd('Plan next week', TODAY).due).toBe('2025-08-11')
  })

  it('reads explicit dates', () => {
    expect(parseQuickAdd('Dentist 2025-09-01', TODAY)).toMatchObject({
      title: 'Dentist',
      due: '2025-09-01',
    })
  })

  it('ignores impossible explicit dates', () => {
    const draft = parseQuickAdd('Dentist 2025-02-31', TODAY)
    expect(draft.due).toBeNull()
    expect(draft.title).toBe('Dentist 2025-02-31')
  })

  it('reads the next weekday, never today', () => {
    expect(parseQuickAdd('Laundry sunday', TODAY).due).toBe('2025-08-10')
    expect(parseQuickAdd('Standup thursday', TODAY).due).toBe('2025-08-14')
    expect(parseQuickAdd('Standup next fri', TODAY).due).toBe('2025-08-08')
  })

  it('reads times in 12- and 24-hour form', () => {
    expect(parseQuickAdd('Call mom 9am', TODAY)).toMatchObject({ title: 'Call mom', time: '09:00' })
    expect(parseQuickAdd('Call mom at 7:30pm', TODAY)).toMatchObject({ title: 'Call mom', time: '19:30' })
    expect(parseQuickAdd('Call mom 12am', TODAY).time).toBe('00:00')
    expect(parseQuickAdd('Call mom 12pm', TODAY).time).toBe('12:00')
    expect(parseQuickAdd('Call mom at 14:15', TODAY).time).toBe('14:15')
  })

  it('defaults "tonight" to the evening', () => {
    expect(parseQuickAdd('Dishes tonight', TODAY)).toMatchObject({ due: TODAY, time: '20:00' })
  })

  it('reads tags', () => {
    expect(parseQuickAdd('Essay #school #School', TODAY)).toMatchObject({
      title: 'Essay',
      tags: ['school'],
    })
  })

  it('counts exclamation marks as priority 1 to 3', () => {
    expect(parseQuickAdd('Dusting !', TODAY)).toMatchObject({ title: 'Dusting', priority: 1 })
    expect(parseQuickAdd('Essay !!', TODAY)).toMatchObject({ title: 'Essay', priority: 2 })
    expect(parseQuickAdd('Taxes !!!', TODAY)).toMatchObject({ title: 'Taxes', priority: 3 })
    expect(parseQuickAdd('Taxes !high', TODAY).priority).toBe(3)
    expect(parseQuickAdd('Dusting !low', TODAY).priority).toBe(1)
  })

  it('assigns a person with +name', () => {
    expect(parseQuickAdd('Gym +jack', TODAY)).toMatchObject({ title: 'Gym', owner: 'jack' })
    expect(parseQuickAdd('Nails +Parmiss', TODAY)).toMatchObject({ title: 'Nails', owner: 'parmiss' })
    expect(parseQuickAdd('Rent +both', TODAY).owner).toBe('both')
    expect(parseQuickAdd('Rent +us', TODAY).owner).toBe('both')
  })

  it('leaves the person unset so the open tab decides', () => {
    expect(parseQuickAdd('Dishes', TODAY).owner).toBeUndefined()
  })

  it('reads a reminder lead time', () => {
    expect(parseQuickAdd('Call mom 9am @30m', TODAY)).toMatchObject({ title: 'Call mom', reminderLead: 30 })
    expect(parseQuickAdd('Flight 6am @2h', TODAY).reminderLead).toBe(120)
    expect(parseQuickAdd('Renew passport @1d', TODAY).reminderLead).toBe(1440)
    expect(parseQuickAdd('Standup 9am @15', TODAY).reminderLead).toBe(15)
  })

  it('reads recurrence', () => {
    expect(parseQuickAdd('Trash *weekly', TODAY).recurrence).toEqual({ unit: 'week', interval: 1 })
    expect(parseQuickAdd('Vitamins *daily', TODAY).recurrence).toEqual({ unit: 'day', interval: 1 })
    expect(parseQuickAdd('Rent *monthly', TODAY).recurrence).toEqual({ unit: 'month', interval: 1 })
    expect(parseQuickAdd('Sheets *every 2 weeks', TODAY).recurrence).toEqual({ unit: 'week', interval: 2 })
  })

  it('parses everything at once', () => {
    expect(parseQuickAdd('Email advisor tomorrow 9am #school !!! *weekly @30m +jack', TODAY)).toEqual({
      title: 'Email advisor',
      due: '2025-08-08',
      time: '09:00',
      priority: 3,
      owner: 'jack',
      tags: ['school'],
      recurrence: { unit: 'week', interval: 1 },
      reminderLead: 30,
    })
  })

  it('does not eat words that merely contain keywords', () => {
    expect(parseQuickAdd('Satisfy monday morning ritual', TODAY).title).toBe('Satisfy morning ritual')
    expect(parseQuickAdd('Todays plan', TODAY)).toMatchObject({ title: 'Todays plan', due: null })
  })

  it('handles empty input', () => {
    expect(parseQuickAdd('   ', TODAY).title).toBe('')
  })
})
