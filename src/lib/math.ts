export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function linearRegressionSlope(points: Array<{ x: number; y: number }>) {
  // Ordinary least squares slope.
  if (points.length < 2) return 0
  const n = points.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumXX += p.x * p.x
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

export function rollingAverage(values: number[], window: number) {
  if (window <= 0) throw new Error('window must be > 0')
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    let sum = 0
    for (let j = start; j <= i; j++) sum += values[j]
    out.push(sum / (i - start + 1))
  }
  return out
}


