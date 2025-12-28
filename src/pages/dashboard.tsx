import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { METRIC_IDS } from '@/db/constants'
import { useSettings } from '@/db/hooks'
import { newId } from '@/lib/id'
import { getDayKey, getWeekKey, trackingDayRange } from '@/lib/time'
import { rollingAverage } from '@/lib/math'
import { sessionBestE1RM } from '@/lib/performance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function DashboardPage() {
  const navigate = useNavigate()
  const settings = useSettings()
  const todayKey = settings ? getDayKey(Date.now(), settings.dayBoundaryHour) : null
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const todayCalories = useLiveQuery(async () => {
    if (!settings || !todayKey) return 0
    const { startMs, endMs } = trackingDayRange(todayKey, settings.dayBoundaryHour)
    const rows = await db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.dailyCalories, startMs], [METRIC_IDS.dailyCalories, endMs], true, false)
      .toArray()
    return rows.reduce((s, r) => s + r.value, 0)
  }, [settings?.dayBoundaryHour, todayKey])

  const caloriesGoal = useLiveQuery(async () => {
    return db.goals
      .where('type')
      .equals('daily_threshold')
      .and((g) => g.status === 'active' && g.metricId === METRIC_IDS.dailyCalories)
      .first()
  }, [])

  const caloriesTarget = caloriesGoal?.target ?? settings?.defaultTargets.caloriesPerDay ?? 2800

  const weekKey = settings
    ? getWeekKey(Date.now(), { weekStartsOn: settings.weekStartsOn, dayBoundaryHour: settings.dayBoundaryHour })
    : null

  const weeklyGoal = useLiveQuery(async () => {
    return db.goals
      .where('type')
      .equals('weekly_frequency')
      .and((g) => g.status === 'active')
      .first()
  }, [])

  const weekWorkoutCount = useLiveQuery(async () => {
    if (!settings || !weekKey) return 0
    const all = await db.workouts.toArray()
    return all.filter((w) => {
      const k = getWeekKey(w.startedAt, {
        weekStartsOn: settings.weekStartsOn,
        dayBoundaryHour: settings.dayBoundaryHour,
      })
      return k === weekKey
    }).length
  }, [settings?.dayBoundaryHour, settings?.weekStartsOn, weekKey])

  const todayWeight = useLiveQuery(async () => {
    if (!settings || !todayKey) return null
    const { startMs, endMs } = trackingDayRange(todayKey, settings.dayBoundaryHour)
    const rows = await db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.bodyWeight, startMs], [METRIC_IDS.bodyWeight, endMs], true, false)
      .toArray()
    const last = rows.sort((a, b) => b.timestamp - a.timestamp)[0]
    return last?.value ?? null
  }, [settings?.dayBoundaryHour, todayKey])

  const weightDeltaVs7 = useLiveQuery(async () => {
    if (!settings) return null
    const end = Date.now()
    const start = end - 21 * 24 * 60 * 60 * 1000
    const rows = await db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.bodyWeight, start], [METRIC_IDS.bodyWeight, end], true, true)
      .toArray()
    const byDay = new Map<string, { ts: number; v: number }>()
    for (const r of rows) {
      const k = getDayKey(r.timestamp, settings.dayBoundaryHour)
      const prev = byDay.get(k)
      if (!prev || r.timestamp > prev.ts) byDay.set(k, { ts: r.timestamp, v: r.value })
    }
    const days = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v.v)
    if (days.length === 0) return null
    const avg7 = rollingAverage(days, 7).at(-1) ?? null
    const last = days.at(-1) ?? null
    if (avg7 == null || last == null) return null
    return last - avg7
  }, [settings?.dayBoundaryHour])

  const activeGoals = useLiveQuery(async () => {
    const all = await db.goals.toArray()
    return all.filter((g) => g.status === 'active').sort((a, b) => a.endDate.localeCompare(b.endDate))
  }, [])

  const caloriesPct = useMemo(() => {
    if (!caloriesTarget) return 0
    return Math.min(100, ((todayCalories ?? 0) / caloriesTarget) * 100)
  }, [todayCalories, caloriesTarget])

  const pinnedKey = settings?.pinnedExerciseIds?.join('|') ?? ''
  const pinnedSpotlight = useLiveQuery(async () => {
    if (!settings) return []
    const ids = settings.pinnedExerciseIds.slice(0, 3)
    if (ids.length === 0) return []
    const now = Date.now()
    const start = now - 35 * 24 * 60 * 60 * 1000
    return Promise.all(
      ids.map(async (exerciseId) => {
        const ex = await db.exercises.get(exerciseId)
        const sets = await db.exerciseSets
          .where('[exerciseId+timestamp]')
          .between([exerciseId, start], [exerciseId, now], true, true)
          .toArray()
        const series = sessionBestE1RM(sets, { dayBoundaryHour: settings.dayBoundaryHour })
        if (series.length === 0) {
          return { exerciseId, name: ex?.name ?? 'Exercise', latest: null as number | null, changePct: null as number | null }
        }
        const latest = series.at(-1)!.e1rm
        const cutoff = now - 28 * 24 * 60 * 60 * 1000
        const baseline = series.find((p) => p.ts >= cutoff)?.e1rm ?? series[0].e1rm
        const changePct = baseline ? ((latest - baseline) / baseline) * 100 : 0
        return { exerciseId, name: ex?.name ?? 'Exercise', latest, changePct }
      }),
    )
  }, [settings?.dayBoundaryHour, pinnedKey])

  async function quickAddCalories(amount: number) {
    await db.entries.put({
      id: newId(),
      metricId: METRIC_IDS.dailyCalories,
      timestamp: Date.now(),
      value: amount,
      meta: {},
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">All offline. Everything stays on this device.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer active:scale-[0.99]"
          onClick={() => navigate('/calories')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/calories')
          }}
        >
          <CardHeader>
            <CardTitle>Calories</CardTitle>
            <CardDescription>
              {Math.round(todayCalories ?? 0)} / {Math.round(caloriesTarget)} kcal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={caloriesPct} />
            <div className="flex flex-wrap gap-2">
              {(settings?.caloriePresets ?? [50, 100, 200, 500]).slice(0, 4).map((p) => (
                <Button
                  key={p}
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    void quickAddCalories(p)
                  }}
                >
                  +{p}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setCustomOpen(true)
                }}
              >
                Custom
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer active:scale-[0.99]"
          onClick={() => navigate('/weight')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/weight')
          }}
        >
          <CardHeader>
            <CardTitle>Weight</CardTitle>
            <CardDescription>
              {todayWeight ? `${todayWeight.toFixed(1)} ${settings?.units.bodyWeight}` : 'Not logged'}
              {weightDeltaVs7 != null
                ? ` • Δ vs 7d avg: ${weightDeltaVs7 >= 0 ? '+' : ''}${weightDeltaVs7.toFixed(1)}`
                : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Tap to view chart and edit entries.</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          className="cursor-pointer active:scale-[0.99]"
          onClick={() => navigate('/workouts')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/workouts')
          }}
        >
          <CardHeader>
            <CardTitle>Workouts</CardTitle>
            <CardDescription>
              This week: {weekWorkoutCount ?? 0}/{weeklyGoal?.target ?? '—'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Tap to view, edit, or add workouts.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance spotlight</CardTitle>
            <CardDescription>e1RM + 4-week change</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pinnedSpotlight ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Pin 1–3 exercises in <Link className="underline" to="/settings">Settings</Link>.
              </div>
            ) : (
              (pinnedSpotlight ?? []).map((p) => (
                <Link
                  key={p.exerciseId}
                  to={`/exercises/${p.exerciseId}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3 text-sm hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Latest e1RM:{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {p.latest != null ? p.latest.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>4w</div>
                    <div className="font-medium tabular-nums text-foreground">
                      {p.changePct == null ? '—' : `${p.changePct >= 0 ? '+' : ''}${p.changePct.toFixed(1)}%`}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
          <CardDescription>Quick view</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(activeGoals ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No active goals. <Link className="underline" to="/goals">Create one</Link>.
            </div>
          ) : (
            (activeGoals ?? []).slice(0, 6).map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {g.type} {g.comparator} {g.target}
                  </div>
                  <div className="text-xs text-muted-foreground">Due {g.endDate}</div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/goals">Manage</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="left-0 right-0 top-auto bottom-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-xl">
          <DialogHeader>
            <DialogTitle>Quick add calories</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="e.g. 350"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">Adds an entry for right now (local only).</div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const n = Number(customValue)
                if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive number')
                await quickAddCalories(n)
                setCustomValue('')
                setCustomOpen(false)
                toast.message(`Added +${Math.round(n)} kcal`)
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


