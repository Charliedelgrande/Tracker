import { clamp, linearRegressionSlope } from '@/lib/math'

export function progressFromValues(opts: {
  start: number
  current: number
  target: number
  comparator: '≥' | '≤'
}) {
  const { start, current, target, comparator } = opts
  if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(target)) return null

  if (comparator === '≤') {
    const denom = start - target
    if (denom === 0) return current <= target ? 1 : 0
    return clamp((start - current) / denom, 0, 1)
  }

  const denom = target - start
  if (denom === 0) return current >= target ? 1 : 0
  return clamp((current - start) / denom, 0, 1)
}

export function estimateDateForTarget(opts: {
  points: Array<{ t: number; v: number }>
  target: number
  comparator: '≥' | '≤'
}) {
  // Linear projection based on recent points (t in ms, v in units).
  // Returns a timestamp (ms) or null if projection is not meaningful.
  const pts = opts.points
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t)
  if (pts.length < 2) return null

  const t0 = pts[0].t
  const reg = pts.map((p) => ({ x: (p.t - t0) / 86_400_000, y: p.v })) // days since start
  const slopePerDay = linearRegressionSlope(reg)
  if (slopePerDay === 0) return null

  const last = pts[pts.length - 1]
  const delta = opts.target - last.v
  const daysToTarget = delta / slopePerDay
  if (!Number.isFinite(daysToTarget)) return null

  // If comparator is "≤" but slope is increasing (or vice versa), projection can still work
  // if daysToTarget is positive; otherwise it's moving away.
  if (daysToTarget < 0) return null
  const ts = last.t + daysToTarget * 86_400_000
  return Number.isFinite(ts) ? ts : null
}


