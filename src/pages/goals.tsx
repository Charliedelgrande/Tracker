import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/db'
import type { GoalComparator, GoalRow, GoalType } from '@/db/types'
import { METRIC_IDS } from '@/db/constants'
import { newId } from '@/lib/id'
import { isoDate } from '@/lib/date'
import { progressFromValues, estimateDateForTarget } from '@/lib/goals'
import { getDayKey, getWeekKey, trackingDayRange } from '@/lib/time'
import { sessionBestE1RM } from '@/lib/performance'
import { useSettings } from '@/db/hooks'
import { SwipeRow } from '@/components/gesture/swipe-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'

type Template = 'weight_by_date' | 'calories_daily_cap' | 'workouts_per_week' | 'exercise_e1rm_by_date'

export function GoalsPage() {
  const settings = useSettings()
  const goals = useLiveQuery(async () => db.goals.orderBy('updatedAt').reverse().toArray(), [])
  const exercises = useLiveQuery(async () => db.exercises.orderBy('name').toArray(), [])

  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState<Template>('calories_daily_cap')
  const [target, setTarget] = useState('2800')
  const [endDate, setEndDate] = useState(isoDate(new Date(new Date().setMonth(new Date().getMonth() + 6))))
  const [comparator, setComparator] = useState<GoalComparator>('≤')
  const [exerciseId, setExerciseId] = useState<string>('')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editComparator, setEditComparator] = useState<GoalComparator>('≥')
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'completed'>('active')

  const items = useMemo(() => goals ?? [], [goals])

  const computed = useLiveQuery(async () => {
    if (!settings) return []
    const allGoals = await db.goals.toArray()
    const now = Date.now()
    const todayKey = getDayKey(now, settings.dayBoundaryHour)
    const thisWeekKey = getWeekKey(now, {
      weekStartsOn: settings.weekStartsOn,
      dayBoundaryHour: settings.dayBoundaryHour,
    })

    return Promise.all(
      allGoals
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (g) => {
          let progress: number | null = null
          let subtitle = `${g.startDate} → ${g.endDate}`
          let estimate: string | null = null

          if (g.type === 'daily_threshold' && g.metricId === METRIC_IDS.dailyCalories) {
            const { startMs, endMs } = trackingDayRange(todayKey, settings.dayBoundaryHour)
            const rows = await db.entries
              .where('[metricId+timestamp]')
              .between([METRIC_IDS.dailyCalories, startMs], [METRIC_IDS.dailyCalories, endMs], true, false)
              .toArray()
            const total = rows.reduce((s, r) => s + r.value, 0)
            progress = Math.min(1, total / g.target)
            subtitle = `Today: ${Math.round(total)} / ${Math.round(g.target)} kcal`
          }

          if (g.type === 'weekly_frequency') {
            const ws = await db.workouts.toArray()
            const count = ws.filter((w) => {
              const k = getWeekKey(w.startedAt, {
                weekStartsOn: settings.weekStartsOn,
                dayBoundaryHour: settings.dayBoundaryHour,
              })
              return k === thisWeekKey
            }).length
            progress = Math.min(1, count / g.target)
            subtitle = `This week: ${count} / ${g.target}`
          }

          if (g.type === 'target_by_date' && g.metricId === METRIC_IDS.bodyWeight) {
            // Use daily last weight; progress based on start->current towards target.
            const startMs = new Date(g.startDate + 'T00:00:00').getTime()
            const rows = await db.entries
              .where('[metricId+timestamp]')
              .between([METRIC_IDS.bodyWeight, startMs], [METRIC_IDS.bodyWeight, now], true, true)
              .toArray()
            const byDay = new Map<string, { ts: number; v: number }>()
            for (const r of rows) {
              const k = getDayKey(r.timestamp, settings.dayBoundaryHour)
              const prev = byDay.get(k)
              if (!prev || r.timestamp > prev.ts) byDay.set(k, { ts: r.timestamp, v: r.value })
            }
            const series = Array.from(byDay.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([, v]) => ({ t: v.ts, v: v.v }))
            const start = series.at(0)?.v
            const current = series.at(-1)?.v
            if (start != null && current != null) {
              progress = progressFromValues({ start, current, target: g.target, comparator: g.comparator })
              subtitle = `Now: ${current.toFixed(1)} → ${g.comparator} ${g.target}`
              const estTs = estimateDateForTarget({ points: series.slice(-21), target: g.target, comparator: g.comparator })
              if (estTs) estimate = `Estimate: ${new Date(estTs).toLocaleDateString()}`
            }
          }

          if (g.type === 'target_by_date' && g.exerciseId) {
            const startMs = new Date(g.startDate + 'T00:00:00').getTime()
            const sets = await db.exerciseSets
              .where('[exerciseId+timestamp]')
              .between([g.exerciseId, startMs], [g.exerciseId, now], true, true)
              .toArray()
            const best = sessionBestE1RM(sets, { dayBoundaryHour: settings.dayBoundaryHour })
            const series = best.map((p) => ({ t: p.ts, v: p.e1rm }))
            const start = series.at(0)?.v
            const current = series.at(-1)?.v
            if (start != null && current != null) {
              progress = progressFromValues({ start, current, target: g.target, comparator: g.comparator })
              const exName = (await db.exercises.get(g.exerciseId))?.name ?? 'Exercise'
              subtitle = `${exName}: ${current.toFixed(1)} → ${g.comparator} ${g.target}`
              const estTs = estimateDateForTarget({ points: series.slice(-10), target: g.target, comparator: g.comparator })
              if (estTs) estimate = `Estimate: ${new Date(estTs).toLocaleDateString()}`
            }
          }

          return { goal: g, progress, subtitle, estimate }
        }),
    )
  }, [settings?.dayBoundaryHour, settings?.weekStartsOn])

  function templateToGoalType(t: Template): GoalType {
    if (t === 'workouts_per_week') return 'weekly_frequency'
    if (t === 'calories_daily_cap') return 'daily_threshold'
    return 'target_by_date'
  }

  async function createGoal() {
    const n = Number(target)
    if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive target')

    const now = Date.now()
    const g: GoalRow = {
      id: newId(),
      type: templateToGoalType(template),
      target: n,
      startDate: isoDate(new Date()),
      endDate,
      comparator,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: {},
    }

    if (template === 'calories_daily_cap') {
      g.metricId = METRIC_IDS.dailyCalories
      g.comparator = '≤'
    } else if (template === 'workouts_per_week') {
      // Canonical counting uses workouts table; this metricId is just a stable link.
      g.metricId = METRIC_IDS.workoutSession
      g.comparator = '≥'
    } else if (template === 'weight_by_date') {
      g.metricId = METRIC_IDS.bodyWeight
    } else if (template === 'exercise_e1rm_by_date') {
      if (!exerciseId) return toast.error('Select an exercise')
      g.exerciseId = exerciseId
      g.comparator = '≥'
    }

    await db.goals.put(g)
    setOpen(false)
    toast.message('Goal created')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">All progress is computed locally.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as Template)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_by_date">Weight by date</SelectItem>
                    <SelectItem value="calories_daily_cap">Calories daily cap</SelectItem>
                    <SelectItem value="workouts_per_week">Workouts per week</SelectItem>
                    <SelectItem value="exercise_e1rm_by_date">Exercise e1RM by date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {template === 'exercise_e1rm_by_date' ? (
                <div className="space-y-2">
                  <Label>Exercise</Label>
                  <Select value={exerciseId} onValueChange={setExerciseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {(exercises ?? []).filter((e) => !e.isArchived).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Comparator</Label>
                  <Select value={comparator} onValueChange={(v) => setComparator(v as GoalComparator)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="≥">≥</SelectItem>
                      <SelectItem value="≤">≤</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>End date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-w-0" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createGoal()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(computed ?? items.map((g) => ({ goal: g, progress: null as number | null, subtitle: `${g.startDate} → ${g.endDate}`, estimate: null as string | null }))).length === 0 ? (
            <div className="text-sm text-muted-foreground">No goals yet.</div>
          ) : (
            (computed ?? []).map(({ goal: g, progress, subtitle, estimate }) => (
              <SwipeRow key={g.id} onDelete={() => db.goals.delete(g.id)}>
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {g.type} {g.comparator} {g.target}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.status} • {subtitle}
                      {estimate ? ` • ${estimate} (est)` : ''}
                    </div>
                    {progress != null ? (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Edit goal"
                      title="Edit"
                      onClick={() => {
                        setEditId(g.id)
                        setEditTarget(String(g.target))
                        setEditEndDate(g.endDate)
                        setEditComparator(g.comparator)
                        setEditStatus(g.status)
                        setEditOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={g.status === 'active' ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() =>
                        void db.goals.put({
                          ...g,
                          status: g.status === 'active' ? 'paused' : 'active',
                          updatedAt: Date.now(),
                        })
                      }
                    >
                      {g.status === 'active' ? 'Pause' : 'Resume'}
                    </Button>
                  </div>
                </div>
              </SwipeRow>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="paused">paused</SelectItem>
                  <SelectItem value="completed">completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comparator</Label>
              <Select value={editComparator} onValueChange={(v) => setEditComparator(v as GoalComparator)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="≥">≥</SelectItem>
                  <SelectItem value="≤">≤</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Input inputMode="decimal" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="min-w-0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editId) return
                const n = Number(editTarget)
                if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive target')
                const existing = await db.goals.get(editId)
                if (!existing) return toast.error('Goal not found')
                await db.goals.put({
                  ...existing,
                  target: n,
                  endDate: editEndDate || existing.endDate,
                  comparator: editComparator,
                  status: editStatus,
                  updatedAt: Date.now(),
                })
                setEditOpen(false)
                toast.message('Saved')
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


