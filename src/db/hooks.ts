import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { SettingsRow } from '@/db/types'

export function useSettings() {
  return useLiveQuery(async () => (await db.settings.get('singleton')) as SettingsRow | undefined, [])
}


