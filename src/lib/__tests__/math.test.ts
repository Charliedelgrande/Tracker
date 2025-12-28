import { describe, expect, it } from 'vitest'
import { linearRegressionSlope, rollingAverage } from '@/lib/math'

describe('math', () => {
  it('rollingAverage computes trailing window averages', () => {
    expect(rollingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5])
  })

  it('linearRegressionSlope returns slope for perfect line', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ]
    expect(linearRegressionSlope(pts)).toBeCloseTo(2, 6)
  })
})


