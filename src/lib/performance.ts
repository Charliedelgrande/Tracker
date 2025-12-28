import type { ExerciseSetRow } from '@/db/types'
import { getDayKey } from '@/lib/time'

export function epleyE1RM(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + reps / 30)
}

export function sessionBestE1RM(
  sets: ExerciseSetRow[],
  opts: { dayBoundaryHour: number },
) {
  const bySession = new Map<string, { ts: number; e1rm: number }>()
  for (const s of sets) {
    const sessionKey = s.workoutId ?? getDayKey(s.timestamp, opts.dayBoundaryHour)
    const e1rm = epleyE1RM(s.weight, s.reps)
    const prev = bySession.get(sessionKey)
    if (!prev || e1rm > prev.e1rm) {
      bySession.set(sessionKey, { ts: s.timestamp, e1rm })
    }
  }
  return Array.from(bySession.values()).sort((a, b) => a.ts - b.ts)
}


