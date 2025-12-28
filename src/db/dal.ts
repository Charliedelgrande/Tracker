import { db } from '@/db/db'
import type { EntryRow, SettingsRow } from '@/db/types'
import { trackingDayRange } from '@/lib/time'

export async function getSettings() {
  return db.settings.get('singleton')
}

export async function updateSettings(patch: Partial<SettingsRow>) {
  const current = await db.settings.get('singleton')
  if (!current) throw new Error('Settings not initialized')
  await db.settings.put({ ...current, ...patch })
}

export async function addEntry(entry: EntryRow) {
  await db.entries.put(entry)
}

export async function putEntry(entry: EntryRow) {
  await db.entries.put(entry)
}

export async function deleteEntry(id: string) {
  await db.entries.delete(id)
}

export async function entriesBetween(metricId: string, startMs: number, endMs: number) {
  return db.entries
    .where('[metricId+timestamp]')
    .between([metricId, startMs], [metricId, endMs], true, false)
    .toArray()
}

export async function entriesForDay(metricId: string, dayKey: string, dayBoundaryHour: number) {
  const { startMs, endMs } = trackingDayRange(dayKey, dayBoundaryHour)
  return entriesBetween(metricId, startMs, endMs)
}


