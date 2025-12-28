import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/db'
import type { WorkoutIntensity, WorkoutType } from '@/db/types'
import { newId } from '@/lib/id'
import { SwipeRow } from '@/components/gesture/swipe-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'

const WORKOUT_TYPES: WorkoutType[] = ['lift', 'cardio', 'sport']
const INTENSITIES: WorkoutIntensity[] = ['easy', 'med', 'hard']

export function WorkoutsPage() {
  const navigate = useNavigate()
  const workouts = useLiveQuery(async () => db.workouts.orderBy('startedAt').reverse().toArray(), [])

  const [open, setOpen] = useState(false)
  const [durationMin, setDurationMin] = useState('45')
  const [type, setType] = useState<WorkoutType>('lift')
  const [intensity, setIntensity] = useState<WorkoutIntensity>('med')
  const [notes, setNotes] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editStartedAt, setEditStartedAt] = useState('')
  const [editDurationMin, setEditDurationMin] = useState('')
  const [editType, setEditType] = useState<WorkoutType>('lift')
  const [editIntensity, setEditIntensity] = useState<WorkoutIntensity>('med')
  const [editNotes, setEditNotes] = useState('')

  const items = useMemo(() => workouts ?? [], [workouts])

  function toLocalDatetimeInput(ts: number) {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function createWorkout() {
    const dur = Number(durationMin)
    if (!Number.isFinite(dur) || dur <= 0) return
    const id = newId()
    await db.workouts.put({
      id,
      startedAt: Date.now(),
      durationMin: dur,
      type,
      intensity,
      notes: notes.trim() ? notes.trim() : undefined,
    })
    setOpen(false)
    setNotes('')
    navigate(`/workouts/${id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">Sessions and sets are stored locally.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New workout</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick workout</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKOUT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Intensity</Label>
                <Select value={intensity} onValueChange={(v) => setIntensity(v as WorkoutIntensity)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITIES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Felt strong" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createWorkout()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No workouts yet.</div>
          ) : (
            items.map((w) => (
              <SwipeRow key={w.id} onDelete={() => db.workouts.delete(w.id)}>
                <div className="flex w-full items-center justify-between gap-3 p-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/workouts/${w.id}`)}>
                    <div className="text-sm font-medium">
                      {new Date(w.startedAt).toLocaleDateString()} • {w.type} • {w.intensity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.durationMin} min{w.notes ? ` • ${w.notes}` : ''}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Edit workout"
                      title="Edit"
                      onClick={() => {
                        setEditId(w.id)
                        setEditStartedAt(toLocalDatetimeInput(w.startedAt))
                        setEditDurationMin(String(w.durationMin))
                        setEditType(w.type)
                        setEditIntensity(w.intensity)
                        setEditNotes(w.notes ?? '')
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
            <DialogTitle>Edit workout</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Started</Label>
              <Input type="datetime-local" value={editStartedAt} onChange={(e) => setEditStartedAt(e.target.value)} className="min-w-0" />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input inputMode="numeric" value={editDurationMin} onChange={(e) => setEditDurationMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as WorkoutType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Intensity</Label>
              <Select value={editIntensity} onValueChange={(v) => setEditIntensity(v as WorkoutIntensity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENSITIES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes (optional)</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editId) return
                const dur = Number(editDurationMin)
                if (!Number.isFinite(dur) || dur <= 0) return toast.error('Duration must be > 0')
                const started = Date.parse(editStartedAt)
                if (!Number.isFinite(started)) return toast.error('Invalid start time')
                const existing = await db.workouts.get(editId)
                if (!existing) return toast.error('Workout not found')
                await db.workouts.put({
                  ...existing,
                  startedAt: started,
                  durationMin: dur,
                  type: editType,
                  intensity: editIntensity,
                  notes: editNotes.trim() ? editNotes.trim() : undefined,
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


