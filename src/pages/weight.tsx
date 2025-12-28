import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { METRIC_IDS } from '@/db/constants'
import { useSettings } from '@/db/hooks'
import { getDayKey, trackingDayRange } from '@/lib/time'
import { rollingAverage, linearRegressionSlope } from '@/lib/math'
import { newId } from '@/lib/id'
import { SwipeRow } from '@/components/gesture/swipe-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'

export function WeightPage() {
  const settings = useSettings()
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    if (!settings) return
    setDayKey(getDayKey(Date.now(), settings.dayBoundaryHour))
  }, [settings])

  const recent = useLiveQuery(async () => {
    if (!settings) return []
    const end = Date.now()
    const start = end - 120 * 24 * 60 * 60 * 1000
    return db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.bodyWeight, start], [METRIC_IDS.bodyWeight, end], true, true)
      .toArray()
  }, [settings?.dayBoundaryHour])

  const dailySeries = useMemo(() => {
    if (!settings) return []
    const byDay = new Map<string, { ts: number; value: number }>()
    for (const r of recent ?? []) {
      const k = getDayKey(r.timestamp, settings.dayBoundaryHour)
      const prev = byDay.get(k)
      if (!prev || r.timestamp > prev.ts) byDay.set(k, { ts: r.timestamp, value: r.value })
    }
    const days = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ dayKey: k, ts: v.ts, value: v.value }))

    const avg = rollingAverage(days.map((d) => d.value), 7)
    return days.map((d, i) => ({
      day: d.dayKey.slice(5),
      dayKey: d.dayKey,
      value: d.value,
      avg7: avg[i],
    }))
  }, [recent, settings])

  const todayKey = settings ? getDayKey(Date.now(), settings.dayBoundaryHour) : null
  const todaysWeight = useMemo(() => {
    if (!todayKey) return null
    for (let i = dailySeries.length - 1; i >= 0; i--) {
      const d = dailySeries[i]
      if (d.dayKey === todayKey) return d.value
    }
    return null
  }, [dailySeries, todayKey])

  const trendLbPerWeek = useMemo(() => {
    const pts = dailySeries.slice(-21).map((d, i) => ({ x: i, y: d.avg7 }))
    const slopePerDay = linearRegressionSlope(pts)
    return slopePerDay * 7
  }, [dailySeries])

  async function logWeightForSelectedDay() {
    if (!settings || !dayKey) return
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive number')
    const { startMs } = trackingDayRange(dayKey, settings.dayBoundaryHour)
    const isToday = dayKey === todayKey
    const ts = isToday ? Date.now() : startMs + 12 * 60 * 60 * 1000
    await db.entries.put({
      id: newId(),
      metricId: METRIC_IDS.bodyWeight,
      timestamp: ts,
      value: n,
      meta: {},
    })
    setValue('')
    toast.message('Weight logged')
  }

  const recentEntries = useLiveQuery(async () => {
    if (!settings) return []
    const end = Date.now()
    const start = end - 60 * 24 * 60 * 60 * 1000
    return db.entries
      .where('[metricId+timestamp]')
      .between([METRIC_IDS.bodyWeight, start], [METRIC_IDS.bodyWeight, end], true, true)
      .reverse()
      .toArray()
  }, [settings?.dayBoundaryHour])

  if (!settings || !dayKey) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Weight</h1>
        <p className="text-sm text-muted-foreground">Loading local data…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weight</h1>
          <p className="text-sm text-muted-foreground">
            Raw + 7-day average + 21-day trend. Units: {settings.units.bodyWeight}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button className="w-full sm:w-auto" variant={dayKey === todayKey ? 'secondary' : 'outline'} onClick={() => setDayKey(todayKey!)}>
            Today
          </Button>
          <Input type="date" value={dayKey} onChange={(e) => setDayKey(e.target.value)} className="col-span-2 w-full min-w-0 sm:col-span-1 sm:w-[160px]" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-baseline justify-between">
            <span>Today</span>
            <span className="text-3xl font-semibold tabular-nums">
              {todaysWeight ? `${todaysWeight.toFixed(1)} ${settings.units.bodyWeight}` : '—'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              inputMode="decimal"
              placeholder={`e.g. 180.2 (${settings.units.bodyWeight})`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-[220px]"
            />
            <Button onClick={() => void logWeightForSelectedDay()}>Log weight</Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Trend (last ~21 points):{' '}
            <span className="font-medium tabular-nums text-foreground">
              {trendLbPerWeek >= 0 ? '+' : ''}
              {trendLbPerWeek.toFixed(2)} {settings.units.bodyWeight}/week
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last 120 days</CardTitle>
        </CardHeader>
        <CardContent className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySeries}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--muted-foreground))"
                dot={false}
                strokeWidth={2}
              />
              <Line type="monotone" dataKey="avg7" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(recentEntries ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No weight entries yet.</div>
          ) : (
            (recentEntries ?? []).slice(0, 20).map((e) => (
              <SwipeRow key={e.id} onDelete={() => db.entries.delete(e.id)}>
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium tabular-nums">
                      {e.value.toFixed(1)} {settings.units.bodyWeight}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Edit weight entry"
                      title="Edit"
                      onClick={() => {
                        setEditId(e.id)
                        setEditValue(String(e.value))
                        setEditDate(getDayKey(e.timestamp, settings.dayBoundaryHour))
                        setEditOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
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
            <DialogTitle>Edit weight entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Weight ({settings.units.bodyWeight})</Label>
              <Input inputMode="decimal" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!settings || !editId) return
                const n = Number(editValue)
                if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a positive number')
                if (!editDate) return toast.error('Pick a date')
                const existing = await db.entries.get(editId)
                if (!existing) return toast.error('Entry not found')
                const { startMs } = trackingDayRange(editDate, settings.dayBoundaryHour)
                await db.entries.put({
                  ...existing,
                  value: n,
                  timestamp: startMs + 12 * 60 * 60 * 1000,
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


