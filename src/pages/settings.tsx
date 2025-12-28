import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { db } from '@/db/db'
import { useSettings } from '@/db/hooks'
import type { SettingsRow } from '@/db/types'
import { createEncryptedBackup, createPlainBackup, downloadJson, factoryReset, importBackupReplace, parseBackupJson } from '@/backup/backup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ACCENTS: Array<{ label: string; hsl: string }> = [
  { label: 'White', hsl: '0 0% 98%' },
  { label: 'Cyan', hsl: '190 100% 60%' },
  { label: 'Purple', hsl: '270 90% 70%' },
  { label: 'Green', hsl: '142 70% 55%' },
  { label: 'Orange', hsl: '30 100% 60%' },
]

export function SettingsPage() {
  const settings = useSettings()
  const exercises = useLiveQuery(async () => db.exercises.orderBy('name').toArray(), [])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [passphrase, setPassphrase] = useState('')
  const [exportEncrypted, setExportEncrypted] = useState(false)

  const pinned = useMemo(() => new Set(settings?.pinnedExerciseIds ?? []), [settings?.pinnedExerciseIds])

  async function save(next: SettingsRow) {
    await db.settings.put(next)
  }

  if (!settings) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Loading local settings…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Everything is local. No accounts, no servers.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2 gap-2 sm:flex sm:justify-between">
          <TabsTrigger className="w-full" value="general">General</TabsTrigger>
          <TabsTrigger className="w-full" value="presets">Presets</TabsTrigger>
          <TabsTrigger className="w-full" value="pinned">Pinned</TabsTrigger>
          <TabsTrigger className="w-full" value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={settings.theme.mode === 'dark' ? 'secondary' : 'outline'}
                  onClick={() => void save({ ...settings, theme: { ...settings.theme, mode: 'dark' } })}
                >
                  Dark
                </Button>
                <Button
                  variant={settings.theme.mode === 'light' ? 'secondary' : 'outline'}
                  onClick={() => void save({ ...settings, theme: { ...settings.theme, mode: 'light' } })}
                >
                  Light
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Accent</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <Button
                      key={a.label}
                      variant={settings.theme.accent === a.hsl ? 'secondary' : 'outline'}
                      onClick={() => void save({ ...settings, theme: { ...settings.theme, accent: a.hsl } })}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Day boundary hour</Label>
                <Select
                  value={String(settings.dayBoundaryHour)}
                  onValueChange={(v) => void save({ ...settings, dayBoundaryHour: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Week starts on</Label>
                <Select
                  value={String(settings.weekStartsOn)}
                  onValueChange={(v) => void save({ ...settings, weekStartsOn: Number(v) as 0 | 1 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Mon</SelectItem>
                    <SelectItem value="0">Sun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Body weight units</Label>
                <Select
                  value={settings.units.bodyWeight}
                  onValueChange={(v) =>
                    void save({ ...settings, units: { ...settings.units, bodyWeight: v as 'lb' | 'kg' } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Load units</Label>
                <Select
                  value={settings.units.load}
                  onValueChange={(v) => void save({ ...settings, units: { ...settings.units, load: v as 'lb' | 'kg' } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              <Button asChild variant="outline">
                <Link to="/exercises">Exercises</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/goals">Goals</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/insights">Insights</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calorie quick add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.caloriePresets.map((p, idx) => (
                <div key={`${p}-${idx}`} className="flex items-center gap-2">
                  <Input
                    inputMode="numeric"
                    value={String(p)}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      const next = settings.caloriePresets.slice()
                      next[idx] = Number.isFinite(n) ? n : 0
                      void save({ ...settings, caloriePresets: next })
                    }}
                    className="w-[140px]"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const next = settings.caloriePresets.filter((_, i) => i !== idx)
                      void save({ ...settings, caloriePresets: next.length ? next : [50, 100, 200, 500, 1000] })
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => void save({ ...settings, caloriePresets: [...settings.caloriePresets, 250] })}
              >
                Add preset
              </Button>

              <div className="space-y-2 pt-3">
                <Label>PR threshold (%)</Label>
                <Input
                  inputMode="decimal"
                  value={String(settings.prThresholdPct)}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n) || n <= 0) return
                    void save({ ...settings, prThresholdPct: n })
                  }}
                  className="w-[160px]"
                />
                <div className="text-xs text-muted-foreground">
                  Used for exercise PR highlights on the e1RM chart.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pinned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pinned exercises</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(exercises ?? []).filter((e) => !e.isArchived).length === 0 ? (
                <div className="text-sm text-muted-foreground">Add exercises first to pin them.</div>
              ) : (
                (exercises ?? [])
                  .filter((e) => !e.isArchived)
                  .map((e) => {
                    const checked = pinned.has(e.id)
                    return (
                      <label
                        key={e.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                      >
                        <div className="text-sm font-medium">{e.name}</div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(ev) => {
                            const next = new Set(settings.pinnedExerciseIds)
                            if (ev.target.checked) next.add(e.id)
                            else next.delete(e.id)
                            void save({ ...settings, pinnedExerciseIds: Array.from(next) })
                          }}
                        />
                      </label>
                    )
                  })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Passphrase (optional)</Label>
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Used only for encrypted export/import"
                />
                <div className="flex items-center gap-2">
                  <input
                    id="enc"
                    type="checkbox"
                    checked={exportEncrypted}
                    onChange={(e) => setExportEncrypted(e.target.checked)}
                  />
                  <Label htmlFor="enc">Encrypt export</Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async () => {
                    try {
                      if (exportEncrypted) {
                        if (!passphrase) return toast.error('Enter a passphrase for encrypted export')
                        const enc = await createEncryptedBackup(passphrase)
                        downloadJson(enc, `trackos-backup-encrypted-${Date.now()}.json`)
                      } else {
                        const plain = await createPlainBackup()
                        downloadJson(plain, `trackos-backup-${Date.now()}.json`)
                      }
                      toast.message('Exported')
                    } catch (e) {
                      toast.error((e as Error).message)
                    }
                  }}
                >
                  Export JSON
                </Button>

                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  Import JSON (replace)
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const text = await file.text()
                      const plain = await parseBackupJson(text, passphrase || undefined)
                      await importBackupReplace(plain)
                      toast.message('Imported')
                    } catch (err) {
                      toast.error((err as Error).message)
                    } finally {
                      e.target.value = ''
                    }
                  }}
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await factoryReset()
                    toast.message('Factory reset complete')
                  }}
                >
                  Factory reset (clear IndexedDB)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


