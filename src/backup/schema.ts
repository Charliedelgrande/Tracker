import { z } from 'zod'

export const SettingsSchema = z
  .object({
    id: z.literal('singleton'),
    theme: z.object({ mode: z.enum(['dark', 'light']), accent: z.string() }),
    units: z.object({ bodyWeight: z.enum(['lb', 'kg']), load: z.enum(['lb', 'kg']) }),
    dayBoundaryHour: z.number().int().min(0).max(23),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    caloriePresets: z.array(z.number()),
    pinnedExerciseIds: z.array(z.string()).default([]),
    prThresholdPct: z.number().default(0.5),
    defaultTargets: z.object({ caloriesPerDay: z.number() }),
    schemaVersion: z.number().int(),
  })
  .passthrough()

export const MetricSchema = z.object({
  id: z.string(),
  type: z.enum(['counter_daily', 'timeseries', 'event']),
  name: z.string(),
  unit: z.string(),
  config: z.record(z.unknown()),
})

export const EntrySchema = z.object({
  id: z.string(),
  metricId: z.string(),
  timestamp: z.number(),
  value: z.number(),
  meta: z.record(z.unknown()),
})

export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  isArchived: z.boolean(),
})

export const WorkoutSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  durationMin: z.number(),
  type: z.enum(['lift', 'cardio', 'sport']),
  intensity: z.enum(['easy', 'med', 'hard']),
  notes: z.string().optional(),
})

export const ExerciseSetSchema = z.object({
  id: z.string(),
  workoutId: z.string().optional(),
  exerciseId: z.string(),
  timestamp: z.number(),
  reps: z.number(),
  weight: z.number(),
  rpe: z.number().optional(),
  notes: z.string().optional(),
})

export const GoalSchema = z.object({
  id: z.string(),
  type: z.enum(['target_by_date', 'weekly_frequency', 'daily_threshold']),
  target: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  metricId: z.string().optional(),
  exerciseId: z.string().optional(),
  comparator: z.enum(['≥', '≤']),
  status: z.enum(['active', 'paused', 'completed']),
  createdAt: z.number(),
  updatedAt: z.number(),
  config: z.record(z.unknown()),
})

export const PlainBackupSchema = z.object({
  app: z.literal('TrackOS'),
  schemaVersion: z.number().int(),
  exportedAt: z.number(),
  settings: SettingsSchema,
  metrics: z.array(MetricSchema),
  entries: z.array(EntrySchema),
  exercises: z.array(ExerciseSchema),
  workouts: z.array(WorkoutSchema),
  exerciseSets: z.array(ExerciseSetSchema),
  goals: z.array(GoalSchema),
})

export const EncryptedBackupSchema = z.object({
  app: z.literal('TrackOS'),
  schemaVersion: z.number().int(),
  exportedAt: z.number(),
  encrypted: z.literal(true),
  payload: z.object({
    algo: z.literal('AES-GCM'),
    kdf: z.literal('PBKDF2'),
    hash: z.literal('SHA-256'),
    iterations: z.number().int(),
    saltB64: z.string(),
    ivB64: z.string(),
    ciphertextB64: z.string(),
  }),
})

export type PlainBackup = z.infer<typeof PlainBackupSchema>
export type EncryptedBackup = z.infer<typeof EncryptedBackupSchema>


