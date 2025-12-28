import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '@/db/db'
import { useSettings } from '@/db/hooks'
import { sessionBestE1RM } from '@/lib/performance'
import { getDayKey } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ExerciseDetailPage() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()

  const exercise = useLiveQuery(async () => (exerciseId ? db.exercises.get(exerciseId) : undefined), [exerciseId])
  const sets = useLiveQuery(async () => {
    if (!exerciseId) return []
    return db.exerciseSets
      .where('[exerciseId+timestamp]')
      .between([exerciseId, 0], [exerciseId, Date.now()], true, true)
      .toArray()
  }, [exerciseId])

  const series = useMemo(() => {
    if (!settings) return []
    const best = sessionBestE1RM(sets ?? [], { dayBoundaryHour: settings.dayBoundaryHour })
    let runningBest = 0
    const prThresh = (settings.prThresholdPct ?? 0.5) / 100
    return best.map((p) => {
      const isPR = p.e1rm >= runningBest * (1 + prThresh) && runningBest > 0
      runningBest = Math.max(runningBest, p.e1rm)
      return {
        day: getDayKey(p.ts, settings.dayBoundaryHour).slice(5),
        e1rm: Number(p.e1rm.toFixed(1)),
        pr: isPR ? Number(p.e1rm.toFixed(1)) : null,
      }
    })
  }, [sets, settings])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate('/exercises')}>
            Back
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{exercise?.name ?? 'Exercise'}</h1>
          <p className="text-sm text-muted-foreground">
            Session-best e1RM (Epley). PR threshold: {settings?.prThresholdPct ?? 0.5}%.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>e1RM over time</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Line type="monotone" dataKey="e1rm" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="pr" stroke="#22c55e" dot={false} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}


