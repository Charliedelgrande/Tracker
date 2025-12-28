import { db } from '@/db/db'
import type { MetricRow, SettingsRow } from '@/db/types'

export const CURRENT_SCHEMA_VERSION = 3

export const PRECREATED_METRICS: MetricRow[] = [
  {
    id: 'dailyCalories',
    type: 'counter_daily',
    name: 'Daily Calories',
    unit: 'kcal',
    config: {},
  },
  {
    id: 'bodyWeight',
    type: 'timeseries',
    name: 'Body Weight',
    unit: 'lb', // updated at runtime for display; stored data is numeric.
    config: {},
  },
  {
    id: 'workoutSession',
    type: 'event',
    name: 'Workout Session',
    unit: 'min',
    config: {},
  },
]

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 'singleton',
  theme: {
    mode: 'dark',
    // Accent stored as HSL tuple string: "h s% l%" without "hsl()"
    // Example: "210 100% 60%"
    accent: '0 0% 98%',
  },
  units: { bodyWeight: 'lb', load: 'lb' },
  dayBoundaryHour: 4,
  weekStartsOn: 1,
  caloriePresets: [50, 100, 200, 500, 1000],
  pinnedExerciseIds: [],
  prThresholdPct: 0.5,
  defaultTargets: { caloriesPerDay: 2800 },
  schemaVersion: CURRENT_SCHEMA_VERSION,
}

/**
 * Creates singleton settings + precreated metrics if missing.
 * No network calls; safe to run on every startup.
 */
export async function bootstrapDb() {
  await db.open()

  await db.transaction('rw', db.settings, db.metrics, async () => {
    const settings = await db.settings.get('singleton')
    if (!settings) {
      await db.settings.put(DEFAULT_SETTINGS)
    } else if (settings.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      // Schema versioning for export/import and runtime checks.
      // Dexie schema migrations (stores) are handled via db.version() above.
      await db.settings.put({ ...settings, schemaVersion: CURRENT_SCHEMA_VERSION })
    }

    for (const m of PRECREATED_METRICS) {
      const existing = await db.metrics.get(m.id)
      if (!existing) await db.metrics.put(m)
    }
  })
}


