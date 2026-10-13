import { describe, expect, it } from 'vitest'
import { snapToGrid } from './grid'

describe('snapToGrid', () => {
  it('snaps to the nearest grid point', () => {
    expect(snapToGrid(12, 10)).toBe(10)
    expect(snapToGrid(16, 10)).toBe(20)
    expect(snapToGrid(-16, 10)).toBe(-20)
  })

  it('leaves values unchanged for an invalid spacing', () => {
    expect(snapToGrid(12, 0)).toBe(12)
    expect(snapToGrid(12, Number.NaN)).toBe(12)
  })
})
