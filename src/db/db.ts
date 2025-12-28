import Dexie, { type Table } from 'dexie'
import type {
  DerivedCacheRow,
  EntryRow,
  ExerciseRow,
  ExerciseSetRow,
  GoalRow,
  MetricRow,
  SettingsRow,
  WorkoutRow,
} from '@/db/types'

export class TrackOSDb extends Dexie {
  settings!: Table<SettingsRow, string>
  metrics!: Table<MetricRow, string>
  entries!: Table<EntryRow, string>
  exercises!: Table<ExerciseRow, string>
  workouts!: Table<WorkoutRow, string>
  exerciseSets!: Table<ExerciseSetRow, string>
  goals!: Table<GoalRow, string>
  derivedCache!: Table<DerivedCacheRow, string>

  constructor() {
    super('trackos')

    // v1: initial schema
    this.version(1).stores({
      settings: 'id',
      metrics: 'id, type, name',
      entries: 'id, metricId, timestamp',
      exercises: 'id, name, isArchived',
      workouts: 'id, startedAt, type, intensity',
      exerciseSets: 'id, workoutId, exerciseId, timestamp',
      goals: 'id, type, status, endDate',
      derivedCache: 'id, key, updatedAt',
    })

    // v2: add compound indexes for efficient time-range queries (still fully local/offline).
    this.version(2)
      .stores({
        settings: 'id',
        metrics: 'id, type, name',
        entries: 'id, [metricId+timestamp], metricId, timestamp',
        exercises: 'id, name, isArchived',
        workouts: 'id, startedAt, type, intensity',
        exerciseSets:
          'id, [exerciseId+timestamp], [workoutId+timestamp], workoutId, exerciseId, timestamp',
        goals: 'id, type, status, metricId, exerciseId, endDate',
        derivedCache: 'id, key, updatedAt',
      })
      .upgrade(async () => {
        // No data transforms required; index changes only.
      })

    // v3: index goal timestamps for stable ordering in UI.
    this.version(3)
      .stores({
        settings: 'id',
        metrics: 'id, type, name',
        entries: 'id, [metricId+timestamp], metricId, timestamp',
        exercises: 'id, name, isArchived',
        workouts: 'id, startedAt, type, intensity',
        exerciseSets:
          'id, [exerciseId+timestamp], [workoutId+timestamp], workoutId, exerciseId, timestamp',
        goals: 'id, type, status, metricId, exerciseId, endDate, createdAt, updatedAt',
        derivedCache: 'id, key, updatedAt',
      })
      .upgrade(async () => {
        // Index-only change; no data transforms required.
      })
  }
}

export const db = new TrackOSDb()


