import { describe, expect, it } from 'vitest'
import { getDayKey, getWeekKey } from '@/lib/time'

describe('time', () => {
  it('getDayKey respects boundary hour (4am)', () => {
    // 2025-01-02 03:00 local should count as previous day when boundary=4
    const d = new Date(2025, 0, 2, 3, 0, 0, 0).getTime()
    expect(getDayKey(d, 4)).toBe('2025-01-01')
    // 2025-01-02 05:00 local should count as same day
    const d2 = new Date(2025, 0, 2, 5, 0, 0, 0).getTime()
    expect(getDayKey(d2, 4)).toBe('2025-01-02')
  })

  it('getWeekKey returns stable format', () => {
    const ts = new Date(2025, 0, 2, 12, 0, 0, 0).getTime()
    const key = getWeekKey(ts, { weekStartsOn: 1, dayBoundaryHour: 4 })
    expect(key).toMatch(/^\d{4}-W\d{2}$/)
  })
})


