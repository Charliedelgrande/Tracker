import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { METRIC_IDS } from '@/db/constants'
import { useSettings } from '@/db/hooks'
import { trackingDayRange, getDayKey } from '@/lib/time'
import { newId } from '@/lib/id'
import { SwipeRow } from '@/components/gesture/swipe-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Pencil } from 'lucide-react'

type EditState = { id: string; value: string; note: string }

export function CaloriesPage() {
  const settings = useSettings()
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [edit, setEdit] = useState<EditState | null>(null)

  useEffect(() => {
    if (!settings) return
    setDayKey(getDayKey(Date.now(), settings.dayBoundaryHour))
  }, [settings])

  const entries = useLiveQuery(async () => {
    if (!settings || !dayKey) return []
    const { startMs, endMs } = trackingDayRange(dayKey, settings.dayBoundaryHour)
    return db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.dailyCalories, startMs], [METRIC_IDS.dailyCalories, endMs], true, false)
      .toArray()
  }, [settings?.dayBoundaryHour, dayKey])

  const sorted = useMemo(
    () => (entries ?? []).slice().sort((a, b) => b.timestamp - a.timestamp),
    [entries],
  )
  const total = useMemo(() => sorted.reduce((s, e) => s + e.value, 0), [sorted])

  const todayKey = settings ? getDayKey(Date.now(), settings.dayBoundaryHour) : null

  const weekBars = useLiveQuery(async () => {
    if (!settings || !dayKey) return []
    // 7 days ending at selected dayKey (inclusive)
    const endRange = trackingDayRange(dayKey, settings.dayBoundaryHour).endMs
    const startRange = endRange - 7 * 24 * 60 * 60 * 1000
    const rows = await db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.dailyCalories, startRange], [METRIC_IDS.dailyCalories, endRange], true, false)
      .toArray()

    const byDay = new Map<string, number>()
    for (const r of rows) {
      const k = getDayKey(r.timestamp, settings.dayBoundaryHour)
      byDay.set(k, (byDay.get(k) ?? 0) + r.value)
    }
    const keys = Array.from(byDay.keys()).sort()
    return keys.slice(-7).map((k) => ({ day: k.slice(5), total: Math.round(byDay.get(k) ?? 0) }))
  }, [settings?.dayBoundaryHour, dayKey])

  async function addCalories(amount: number, note?: string) {
    if (!settings || !dayKey) return
    const { startMs } = trackingDayRange(dayKey, settings.dayBoundaryHour)
    const isToday = dayKey === getDayKey(Date.now(), settings.dayBoundaryHour)
    const ts = isToday ? Date.now() : startMs + 12 * 60 * 60 * 1000
    await db.entries.put({
      id: newId(),
      metricId: METRIC_IDS.dailyCalories,
      timestamp: ts,
      value: amount,
      meta: note ? { note } : {},
    })
  }

  async function undoLastToday() {
    if (!settings || !todayKey) return
    if (dayKey !== todayKey) return
    const { startMs, endMs } = trackingDayRange(todayKey, settings.dayBoundaryHour)
    const rows = await db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.dailyCalories, startMs], [METRIC_IDS.dailyCalories, endMs], true, false)
      .toArray()
    const last = rows.sort((a, b) => b.timestamp - a.timestamp)[0]
    if (!last) return
    await db.entries.delete(last.id)
    toast.message('Undid last calorie entry')
  }

  if (!settings || !dayKey) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Calories</h1>
        <p className="text-sm text-muted-foreground">Loading local data…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calories</h1>
          <p className="text-sm text-muted-foreground">Stored locally in IndexedDB. Never sent anywhere.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button className="w-full sm:w-auto" variant={dayKey === todayKey ? 'secondary' : 'outline'} onClick={() => setDayKey(todayKey!)}>
            Today
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => {
              const y = new Date()
              y.setDate(y.getDate() - 1)
              setDayKey(getDayKey(y.getTime(), settings.dayBoundaryHour))
            }}
          >
            Yesterday
          </Button>
          <Input
            type="date"
            value={dayKey}
            onChange={(e) => setDayKey(e.target.value)}
            className="col-span-2 w-full min-w-0 sm:col-span-1 sm:w-[160px]"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-baseline justify-between">
            <span>Daily total</span>
            <span className="text-3xl font-semibold tabular-nums">{Math.round(total)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.caloriePresets.map((p) => (
              <Button key={p} variant="secondary" onClick={() => void addCalories(p)}>
                +{p}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Input
              inputMode="numeric"
              placeholder="Custom amount"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-[180px]"
            />
            <Button
              onClick={() => {
                const n = Number(custom)
                if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive number')
                void addCalories(n)
                setCustom('')
              }}
            >
              Add
            </Button>
            <Button variant="outline" disabled={dayKey !== todayKey} onClick={() => void undoLastToday()}>
              Undo last (today)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 ? (
            <div className="text-sm text-muted-foreground">No entries for this day.</div>
          ) : (
            <div className="space-y-2">
              {sorted.map((e) => {
                const note = typeof e.meta?.note === 'string' ? (e.meta.note as string) : ''
                return (
                  <SwipeRow
                    key={e.id}
                    onDelete={() => db.entries.delete(e.id)}
                  >
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium tabular-nums">+{Math.round(e.value)} kcal</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {note ? ` • ${note}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog
                          open={edit?.id === e.id}
                          onOpenChange={(open) => {
                            if (!open) return setEdit(null)
                            setEdit({ id: e.id, value: String(e.value), note })
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="Edit entry" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit entry</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Calories</Label>
                                <Input
                                  inputMode="numeric"
                                  value={edit?.value ?? ''}
                                  onChange={(ev) => setEdit((s) => (s ? { ...s, value: ev.target.value } : s))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Note (optional)</Label>
                                <Textarea
                                  value={edit?.note ?? ''}
                                  onChange={(ev) => setEdit((s) => (s ? { ...s, note: ev.target.value } : s))}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="secondary" onClick={() => setEdit(null)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={async () => {
                                  if (!edit) return
                                  const n = Number(edit.value)
                                  if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive number')
                                  await db.entries.put({
                                    ...e,
                                    value: n,
                                    meta: edit.note ? { ...(e.meta ?? {}), note: edit.note } : { ...(e.meta ?? {}) },
                                  })
                                  setEdit(null)
                                  toast.message('Saved')
                                }}
                              >
                                Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </SwipeRow>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7-day summary</CardTitle>
        </CardHeader>
        <CardContent className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekBars ?? []}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}


