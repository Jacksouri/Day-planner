/** Date helpers that operate on `YYYY-MM-DD` day keys in the user's local time zone. */

export function toDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toDayKey(fromDayKey(value)) === value
}

export function addDays(key: string, days: number): string {
  const date = fromDayKey(key)
  date.setDate(date.getDate() + days)
  return toDayKey(date)
}

export function addMonths(key: string, months: number): string {
  const date = fromDayKey(key)
  const targetMonthDay = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(targetMonthDay, lastDayOfTargetMonth))
  return toDayKey(date)
}

/** Monday-based start of the week containing `key`. */
export function startOfWeek(key: string, weekStartsOn: number = 1): string {
  const date = fromDayKey(key)
  const offset = (date.getDay() - weekStartsOn + 7) % 7
  return addDays(key, -offset)
}

export function weekDays(key: string, weekStartsOn: number = 1): string[] {
  const start = startOfWeek(key, weekStartsOn)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function daysBetween(from: string, to: string): number {
  const millisPerDay = 24 * 60 * 60 * 1000
  const diff = fromDayKey(to).getTime() - fromDayKey(from).getTime()
  return Math.round(diff / millisPerDay)
}

export function formatDayLabel(key: string, today: string): string {
  const delta = daysBetween(today, key)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  const date = fromDayKey(key)
  const withYear = date.getFullYear() !== fromDayKey(today).getFullYear()
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
