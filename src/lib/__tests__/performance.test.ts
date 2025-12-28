import { describe, expect, it } from 'vitest'
import { epleyE1RM, sessionBestE1RM } from '@/lib/performance'

describe('performance', () => {
  it('epleyE1RM matches expected formula', () => {
    expect(epleyE1RM(200, 5)).toBeCloseTo(200 * (1 + 5 / 30), 8)
  })

  it('sessionBestE1RM groups by workoutId when present, otherwise dayKey', () => {
    const base = new Date(2025, 0, 2, 12, 0, 0, 0).getTime()
    const sets = [
      { id: 'a', workoutId: 'w1', exerciseId: 'e', timestamp: base, reps: 5, weight: 200 },
      { id: 'b', workoutId: 'w1', exerciseId: 'e', timestamp: base + 60_000, reps: 3, weight: 215 },
      { id: 'c', exerciseId: 'e', timestamp: base + 86_400_000, reps: 5, weight: 205 },
    ]
    const series = sessionBestE1RM(sets as any, { dayBoundaryHour: 4 })
    expect(series.length).toBe(2)
    expect(series[0].e1rm).toBeGreaterThan(0)
  })
})


