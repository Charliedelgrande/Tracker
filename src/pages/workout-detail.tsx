import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { newId } from '@/lib/id'
import { epleyE1RM } from '@/lib/performance'
import { SwipeRow } from '@/components/gesture/swipe-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'

export function WorkoutDetailPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()

  const workout = useLiveQuery(async () => (workoutId ? db.workouts.get(workoutId) : undefined), [workoutId])
  const sets = useLiveQuery(async () => {
    if (!workoutId) return []
    return db.exerciseSets
      .where('[workoutId+timestamp]')
      .between([workoutId, 0], [workoutId, Date.now()], true, true)
      .toArray()
  }, [workoutId])
  const exercises = useLiveQuery(async () => {
    const all = await db.exercises.orderBy('name').toArray()
    return all.filter((e) => !e.isArchived)
  }, [])

  const [open, setOpen] = useState(false)
  const [exerciseId, setExerciseId] = useState<string>('')
  const [reps, setReps] = useState('5')
  const [weight, setWeight] = useState('135')
  const [rpe, setRpe] = useState('')

  const [editSetOpen, setEditSetOpen] = useState(false)
  const [editSetId, setEditSetId] = useState<string | null>(null)
  const [editSetReps, setEditSetReps] = useState('')
  const [editSetWeight, setEditSetWeight] = useState('')
  const [editSetRpe, setEditSetRpe] = useState('')

  const setsSorted = useMemo(() => (sets ?? []).slice().sort((a, b) => b.timestamp - a.timestamp), [sets])

  async function addSet() {
    if (!workoutId) return
    if (!exerciseId) return toast.error('Select an exercise')
    const repsN = Number(reps)
    const weightN = Number(weight)
    const rpeN = rpe.trim() ? Number(rpe) : undefined
    if (!Number.isFinite(repsN) || repsN <= 0) return toast.error('Reps must be > 0')
    if (!Number.isFinite(weightN) || weightN <= 0) return toast.error('Weight must be > 0')
    if (rpeN !== undefined && (!Number.isFinite(rpeN) || rpeN <= 0)) return toast.error('RPE must be a number')

    await db.exerciseSets.put({
      id: newId(),
      workoutId,
      exerciseId,
      timestamp: Date.now(),
      reps: repsN,
      weight: weightN,
      rpe: rpeN,
    })
    setOpen(false)
    toast.message('Set added')
  }

  if (!workoutId) return null
  if (!workout) {
    return (
      <div className="space-y-3">
        <Button variant="outline" onClick={() => navigate('/workouts')}>
          Back
        </Button>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate('/workouts')}>
            Back
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Workout</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(workout.startedAt).toLocaleString()} • {workout.type} • {workout.intensity} •{' '}
            {workout.durationMin} min
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add set</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add exercise set</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Exercise</Label>
                <Select value={exerciseId} onValueChange={setExerciseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    {(exercises ?? []).map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Reps</Label>
                  <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>RPE (optional)</Label>
                  <Input inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void addSet()}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {setsSorted.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sets yet.</div>
          ) : (
            setsSorted.map((s) => {
              const exName = (exercises ?? []).find((e) => e.id === s.exerciseId)?.name ?? 'Unknown'
              const e1rm = epleyE1RM(s.weight, s.reps)
              return (
                <SwipeRow key={s.id} onDelete={() => db.exerciseSets.delete(s.id)}>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{exName}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.weight} x {s.reps}
                        {s.rpe ? ` @${s.rpe}` : ''} • e1RM {e1rm.toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Edit set"
                        title="Edit"
                        onClick={() => {
                          setEditSetId(s.id)
                          setEditSetReps(String(s.reps))
                          setEditSetWeight(String(s.weight))
                          setEditSetRpe(s.rpe != null ? String(s.rpe) : '')
                          setEditSetOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </SwipeRow>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={editSetOpen} onOpenChange={setEditSetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit set</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Reps</Label>
              <Input inputMode="numeric" value={editSetReps} onChange={(e) => setEditSetReps(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Weight</Label>
              <Input inputMode="decimal" value={editSetWeight} onChange={(e) => setEditSetWeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>RPE (optional)</Label>
              <Input inputMode="decimal" value={editSetRpe} onChange={(e) => setEditSetRpe(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditSetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editSetId) return
                const repsN = Number(editSetReps)
                const weightN = Number(editSetWeight)
                const rpeN = editSetRpe.trim() ? Number(editSetRpe) : undefined
                if (!Number.isFinite(repsN) || repsN <= 0) return toast.error('Reps must be > 0')
                if (!Number.isFinite(weightN) || weightN <= 0) return toast.error('Weight must be > 0')
                if (rpeN !== undefined && (!Number.isFinite(rpeN) || rpeN <= 0)) return toast.error('RPE must be a number')
                const existing = await db.exerciseSets.get(editSetId)
                if (!existing) return toast.error('Set not found')
                await db.exerciseSets.put({ ...existing, reps: repsN, weight: weightN, rpe: rpeN })
                setEditSetOpen(false)
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


