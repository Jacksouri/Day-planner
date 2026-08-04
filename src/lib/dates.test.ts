import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  daysBetween,
  formatDayLabel,
  fromDayKey,
  isDayKey,
  startOfWeek,
  toDayKey,
  weekDays,
} from './dates'

describe('day keys', () => {
  it('round-trips local dates', () => {
    expect(toDayKey(new Date(2025, 0, 5))).toBe('2025-01-05')
    expect(toDayKey(fromDayKey('2025-11-30'))).toBe('2025-11-30')
  })

  it('validates real calendar days only', () => {
    expect(isDayKey('2025-02-28')).toBe(true)
    expect(isDayKey('2025-02-30')).toBe(false)
    expect(isDayKey('2025-2-8')).toBe(false)
    expect(isDayKey('nope')).toBe(false)
  })
})

describe('arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01')
    expect(addDays('2025-01-01', -1)).toBe('2024-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('clamps month arithmetic to the last valid day', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2025-03-15', -1)).toBe('2025-02-15')
    expect(addMonths('2025-12-15', 1)).toBe('2026-01-15')
  })

  it('counts whole days between keys', () => {
    expect(daysBetween('2025-03-01', '2025-03-08')).toBe(7)
    expect(daysBetween('2025-03-08', '2025-03-01')).toBe(-7)
    expect(daysBetween('2025-03-08', '2025-03-08')).toBe(0)
  })
})

describe('weeks', () => {
  it('starts weeks on Monday by default', () => {
    // 2025-08-07 is a Thursday.
    expect(startOfWeek('2025-08-07')).toBe('2025-08-04')
    expect(startOfWeek('2025-08-04')).toBe('2025-08-04')
    expect(startOfWeek('2025-08-10')).toBe('2025-08-04')
  })

  it('supports Sunday starts', () => {
    expect(startOfWeek('2025-08-07', 0)).toBe('2025-08-03')
  })

  it('lists seven consecutive days', () => {
    const days = weekDays('2025-08-07')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2025-08-04')
    expect(days[6]).toBe('2025-08-10')
  })
})

describe('formatDayLabel', () => {
  it('uses relative names for nearby days', () => {
    expect(formatDayLabel('2025-08-07', '2025-08-07')).toBe('Today')
    expect(formatDayLabel('2025-08-08', '2025-08-07')).toBe('Tomorrow')
    expect(formatDayLabel('2025-08-06', '2025-08-07')).toBe('Yesterday')
  })

  it('falls back to a calendar label further out', () => {
    const label = formatDayLabel('2025-08-20', '2025-08-07')
    expect(label).not.toBe('Today')
    expect(label).toContain('20')
  })
})
