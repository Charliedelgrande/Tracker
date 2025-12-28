import { addDays, format, getWeek, getWeekYear, parseISO, startOfWeek } from 'date-fns'

function shiftForBoundary(ts: number, dayBoundaryHour: number) {
  return ts - dayBoundaryHour * 60 * 60 * 1000
}

export function getDayKey(ts: number, dayBoundaryHour: number) {
  const shifted = new Date(shiftForBoundary(ts, dayBoundaryHour))
  return format(shifted, 'yyyy-MM-dd')
}

export function getWeekKey(
  ts: number,
  opts: { weekStartsOn: 0 | 1; dayBoundaryHour: number },
) {
  const shifted = new Date(shiftForBoundary(ts, opts.dayBoundaryHour))
  const weekStartsOn = opts.weekStartsOn
  const week = getWeek(shifted, { weekStartsOn })
  const weekYear = getWeekYear(shifted, { weekStartsOn })
  return `${weekYear}-W${String(week).padStart(2, '0')}`
}

export function trackingDayRange(dayKey: string, dayBoundaryHour: number) {
  // dayKey is yyyy-MM-dd for the *tracking day*.
  const base = parseISO(dayKey) // local midnight
  const start = new Date(base)
  start.setHours(dayBoundaryHour, 0, 0, 0)
  const end = addDays(start, 1)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

export function weekRangeFromTs(
  ts: number,
  opts: { weekStartsOn: 0 | 1; dayBoundaryHour: number },
) {
  const shifted = new Date(shiftForBoundary(ts, opts.dayBoundaryHour))
  const start = startOfWeek(shifted, { weekStartsOn: opts.weekStartsOn })
  start.setHours(0, 0, 0, 0)
  const end = addDays(start, 7)
  // Convert back to original time space by adding boundary hours.
  const startMs = start.getTime() + opts.dayBoundaryHour * 60 * 60 * 1000
  const endMs = end.getTime() + opts.dayBoundaryHour * 60 * 60 * 1000
  return { startMs, endMs }
}


