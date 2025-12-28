import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { METRIC_IDS } from '@/db/constants'
import { useSettings } from '@/db/hooks'
import { getDayKey, getWeekKey } from '@/lib/time'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function InsightsPage() {
  const settings = useSettings()

  const caloriesRows = useLiveQuery(async () => {
    if (!settings) return []
    const end = Date.now()
    const start = end - 28 * 24 * 60 * 60 * 1000
    return db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.dailyCalories, start], [METRIC_IDS.dailyCalories, end], true, true)
      .toArray()
  }, [settings?.dayBoundaryHour])

  const weightRows = useLiveQuery(async () => {
    if (!settings) return []
    const end = Date.now()
    const start = end - 60 * 24 * 60 * 60 * 1000
    return db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.bodyWeight, start], [METRIC_IDS.bodyWeight, end], true, true)
      .toArray()
  }, [settings?.dayBoundaryHour])

  const workouts = useLiveQuery(async () => db.workouts.orderBy('startedAt').toArray(), [])
  const weeklyGoal = useLiveQuery(async () => {
    return db.goals
      .where('type')
      .equals('weekly_frequency')
      .and((g) => g.status === 'active')
      .first()
  }, [])

  const caloriesInsight = useMemo(() => {
    if (!settings) return null
    const byDay = new Map<string, number>()
    for (const r of caloriesRows ?? []) {
      const k = getDayKey(r.timestamp, settings.dayBoundaryHour)
      byDay.set(k, (byDay.get(k) ?? 0) + r.value)
    }
    let wkSum = 0
    let wkCount = 0
    let weSum = 0
    let weCount = 0
    for (const [k, total] of byDay.entries()) {
      const d = new Date(k + 'T12:00:00')
      const day = d.getDay()
      const isWeekend = day === 0 || day === 6
      if (isWeekend) {
        weSum += total
        weCount++
      } else {
        wkSum += total
        wkCount++
      }
    }
    const wkAvg = wkCount ? wkSum / wkCount : 0
    const weAvg = weCount ? weSum / weCount : 0
    return { wkAvg, weAvg }
  }, [caloriesRows, settings])

  const weightInsight = useMemo(() => {
    if (!settings) return null
    const byDay = new Map<string, { ts: number; v: number }>()
    for (const r of weightRows ?? []) {
      const k = getDayKey(r.timestamp, settings.dayBoundaryHour)
      const prev = byDay.get(k)
      if (!prev || r.timestamp > prev.ts) byDay.set(k, { ts: r.timestamp, v: r.value })
    }
    const days = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v.v)
    if (days.length < 2) return { delta14: 0, direction: '—' as const }
    const last = days[days.length - 1]
    const prev = days[Math.max(0, days.length - 1 - 14)]
    const delta = last - prev
    const direction = delta > 0.2 ? 'up' : delta < -0.2 ? 'down' : 'flat'
    return { delta14: delta, direction }
  }, [weightRows, settings])

  const workoutStreak = useMemo(() => {
    if (!settings || !weeklyGoal) return null
    const target = weeklyGoal.target
    const counts = new Map<string, number>()
    for (const w of workouts ?? []) {
      const k = getWeekKey(w.startedAt, {
        weekStartsOn: settings.weekStartsOn,
        dayBoundaryHour: settings.dayBoundaryHour,
      })
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    const nowKey = getWeekKey(Date.now(), {
      weekStartsOn: settings.weekStartsOn,
      dayBoundaryHour: settings.dayBoundaryHour,
    })
    // walk back week-by-week
    let streak = 0
    let cursor = new Date()
    for (let i = 0; i < 52; i++) {
      const k = getWeekKey(cursor.getTime(), {
        weekStartsOn: settings.weekStartsOn,
        dayBoundaryHour: settings.dayBoundaryHour,
      })
      const c = counts.get(k) ?? 0
      if (k === nowKey || streak > 0) {
        if (c >= target) streak++
        else break
      }
      cursor.setDate(cursor.getDate() - 7)
    }
    return { target, streak }
  }, [workouts, weeklyGoal, settings])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">Simple, useful, computed locally.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calories (last 28 days)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {caloriesInsight ? (
              <div className="space-y-1">
                <div>
                  Weekday avg: <span className="font-medium tabular-nums">{caloriesInsight.wkAvg.toFixed(0)}</span>
                </div>
                <div>
                  Weekend avg: <span className="font-medium tabular-nums">{caloriesInsight.weAvg.toFixed(0)}</span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {weightInsight ? (
              <div className="space-y-1">
                <div>
                  Δ14d:{' '}
                  <span className="font-medium tabular-nums">
                    {weightInsight.delta14 >= 0 ? '+' : ''}
                    {weightInsight.delta14.toFixed(1)} {settings?.units.bodyWeight}
                  </span>
                </div>
                <div className="text-muted-foreground">Direction: {weightInsight.direction}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">No data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Workout consistency</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {workoutStreak ? (
              <div className="space-y-1">
                <div>
                  Current weekly goal: ≥ <span className="font-medium tabular-nums">{workoutStreak.target}</span>
                </div>
                <div>
                  Streak of weeks meeting goal:{' '}
                  <span className="font-medium tabular-nums">{workoutStreak.streak}</span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Create a “workouts per week” goal to see streaks.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


