import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'

export function ExercisesPage() {
  const navigate = useNavigate()
  const exercises = useLiveQuery(async () => db.exercises.orderBy('name').toArray(), [])

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const items = useMemo(() => exercises ?? [], [exercises])

  async function addExercise() {
    const n = name.trim()
    if (!n) return toast.error('Enter a name')
    await db.exercises.put({
      id: newId(),
      name: n,
      category: category.trim() ? category.trim() : undefined,
      isArchived: false,
    })
    setName('')
    setCategory('')
    setOpen(false)
    toast.message('Exercise added')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercises</h1>
          <p className="text-sm text-muted-foreground">Local list + performance charts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add exercise</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New exercise</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bench Press" />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Push" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void addExercise()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All exercises</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No exercises yet.</div>
          ) : (
            items.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
              >
                <button className="min-w-0 text-left" onClick={() => navigate(`/exercises/${ex.id}`)}>
                  <div className="text-sm font-medium">
                    {ex.name} {ex.isArchived ? <span className="text-xs text-muted-foreground">(archived)</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{ex.category ?? '—'}</div>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Edit exercise"
                    title="Edit"
                    onClick={() => {
                      setEditId(ex.id)
                      setEditName(ex.name)
                      setEditCategory(ex.category ?? '')
                      setEditOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={ex.isArchived ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => void db.exercises.put({ ...ex, isArchived: !ex.isArchived })}
                  >
                    {ex.isArchived ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editId) return
                const n = editName.trim()
                if (!n) return toast.error('Enter a name')
                const existing = await db.exercises.get(editId)
                if (!existing) return toast.error('Exercise not found')
                await db.exercises.put({
                  ...existing,
                  name: n,
                  category: editCategory.trim() ? editCategory.trim() : undefined,
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


