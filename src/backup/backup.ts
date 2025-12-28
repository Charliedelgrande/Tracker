import { db } from '@/db/db'
import { bootstrapDb, CURRENT_SCHEMA_VERSION } from '@/db/bootstrap'
import type { SettingsRow } from '@/db/types'
import { decryptString, encryptString, type EncryptedPayload } from '@/backup/crypto'
import { EncryptedBackupSchema, PlainBackupSchema, type PlainBackup } from '@/backup/schema'

export async function createPlainBackup(): Promise<PlainBackup> {
  const [settings, metrics, entries, exercises, workouts, exerciseSets, goals] = await Promise.all([
    db.settings.get('singleton'),
    db.metrics.toArray(),
    db.entries.toArray(),
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.exerciseSets.toArray(),
    db.goals.toArray(),
  ])

  if (!settings) throw new Error('Settings not initialized')

  return {
    app: 'TrackOS',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    settings: { ...settings, schemaVersion: CURRENT_SCHEMA_VERSION },
    metrics,
    entries,
    exercises,
    workouts,
    exerciseSets,
    goals,
  }
}

export async function createEncryptedBackup(passphrase: string) {
  const plain = await createPlainBackup()
  const payload: EncryptedPayload = await encryptString(JSON.stringify(plain), passphrase)
  return {
    app: 'TrackOS' as const,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    encrypted: true as const,
    payload,
  }
}

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function migrateSettingsToCurrent(s: SettingsRow): SettingsRow {
  // Add any missing fields introduced after v1.
  return {
    ...s,
    pinnedExerciseIds: s.pinnedExerciseIds ?? [],
    prThresholdPct: s.prThresholdPct ?? 0.5,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }
}

export async function parseBackupJson(text: string, passphrase?: string): Promise<PlainBackup> {
  const raw = JSON.parse(text) as unknown
  const maybeEncrypted = EncryptedBackupSchema.safeParse(raw)
  if (maybeEncrypted.success) {
    if (!passphrase) throw new Error('Passphrase required for encrypted backup')
    const decrypted = await decryptString(maybeEncrypted.data.payload, passphrase)
    const plainRaw = JSON.parse(decrypted) as unknown
    const parsed = PlainBackupSchema.parse(plainRaw)
    return migratePlainBackup(parsed)
  }

  const parsed = PlainBackupSchema.parse(raw)
  return migratePlainBackup(parsed)
}

export function migratePlainBackup(plain: PlainBackup): PlainBackup {
  // Currently: v1 -> v2 adds a few settings fields + bumps schemaVersion.
  if (plain.schemaVersion <= CURRENT_SCHEMA_VERSION) {
    return {
      ...plain,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: migrateSettingsToCurrent(plain.settings as SettingsRow),
    }
  }
  return plain
}

export async function importBackupReplace(plain: PlainBackup) {
  const validated = migratePlainBackup(plain)

  await db.transaction(
    'rw',
    [db.settings, db.metrics, db.entries, db.exercises, db.workouts, db.exerciseSets, db.goals],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.metrics.clear(),
        db.entries.clear(),
        db.exercises.clear(),
        db.workouts.clear(),
        db.exerciseSets.clear(),
        db.goals.clear(),
      ])

      await db.settings.put(validated.settings as SettingsRow)
      await db.metrics.bulkPut(validated.metrics)
      await db.entries.bulkPut(validated.entries)
      await db.exercises.bulkPut(validated.exercises)
      await db.workouts.bulkPut(validated.workouts)
      await db.exerciseSets.bulkPut(validated.exerciseSets)
      await db.goals.bulkPut(validated.goals)
    },
  )

  await bootstrapDb()
}

export async function factoryReset() {
  await db.transaction(
    'rw',
    [db.settings, db.metrics, db.entries, db.exercises, db.workouts, db.exerciseSets, db.goals],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.metrics.clear(),
        db.entries.clear(),
        db.exercises.clear(),
        db.workouts.clear(),
        db.exerciseSets.clear(),
        db.goals.clear(),
      ])
    },
  )
  await bootstrapDb()
}


