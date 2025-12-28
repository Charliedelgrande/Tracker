export type ThemeMode = 'dark' | 'light'

export type SettingsRow = {
  id: 'singleton'
  theme: { mode: ThemeMode; accent: string }
  units: { bodyWeight: 'lb' | 'kg'; load: 'lb' | 'kg' }
  dayBoundaryHour: number
  weekStartsOn: 0 | 1
  caloriePresets: number[]
  pinnedExerciseIds: string[]
  prThresholdPct: number
  defaultTargets: {
    caloriesPerDay: number
  }
  schemaVersion: number
}

export type MetricType = 'counter_daily' | 'timeseries' | 'event'

export type MetricRow = {
  id: string
  type: MetricType
  name: string
  unit: string
  config: Record<string, unknown>
}

export type EntryRow = {
  id: string
  metricId: string
  timestamp: number
  value: number
  meta: Record<string, unknown>
}

export type ExerciseRow = {
  id: string
  name: string
  category?: string
  isArchived: boolean
}

export type WorkoutType = 'lift' | 'cardio' | 'sport'
export type WorkoutIntensity = 'easy' | 'med' | 'hard'

export type WorkoutRow = {
  id: string
  startedAt: number
  durationMin: number
  type: WorkoutType
  intensity: WorkoutIntensity
  notes?: string
}

export type ExerciseSetRow = {
  id: string
  workoutId?: string
  exerciseId: string
  timestamp: number
  reps: number
  weight: number
  rpe?: number
  notes?: string
}

export type GoalType =
  | 'target_by_date'
  | 'weekly_frequency'
  | 'daily_threshold'

export type GoalComparator = '≥' | '≤'

export type GoalStatus = 'active' | 'paused' | 'completed'

export type GoalRow = {
  id: string
  type: GoalType
  target: number
  startDate: string
  endDate: string
  metricId?: string
  exerciseId?: string
  comparator: GoalComparator
  status: GoalStatus
  createdAt: number
  updatedAt: number
  config: Record<string, unknown>
}

export type DerivedCacheRow = {
  id: string
  key: string
  value: Record<string, unknown>
  updatedAt: number
}


