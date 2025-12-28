import { format } from 'date-fns'

export function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}


