import { describe, expect, it } from 'vitest'
import { getSelectionBounds, scaleSelectionToBounds } from './geometry'
import type { SvgObject } from '../types/cnc'

const makeObject = (id: number, x: number, y: number, width: number, height: number): SvgObject => ({
  id,
  name: `object-${id}`,
  operationName: `op-${id}`,
  src: '',
  pathData: '',
  viewBoxWidth: width,
  viewBoxHeight: height,
  width,
  height,
  x,
  y,
  rotation: 0,
  operation: 'cut-on-path',
  bitId: '2-flute-spiral-flat-nose-1-8',
  depth: 1,
  lockedProportions: false,
  pathBoundsX: 0,
  pathBoundsY: 0,
  pathBoundsWidth: width,
  pathBoundsHeight: height,
})

describe('geometry helpers', () => {
  it('preserves relative object positions when scaling a selection to a new bounds box', () => {
    const objects = [
      makeObject(1, 10, 20, 30, 20),
      makeObject(2, 50, 60, 20, 10),
    ]
    const start = getSelectionBounds(objects)
    const next = { x: 0, y: 0, width: start.width * 2, height: start.height * 2 }

    const scaled = scaleSelectionToBounds(objects, start, next)

    expect(scaled[0].x).toBeCloseTo(0)
    expect(scaled[0].y).toBeCloseTo(0)
    expect(scaled[0].width).toBeCloseTo(60)
    expect(scaled[0].height).toBeCloseTo(40)
    expect(scaled[1].x).toBeCloseTo(80)
    expect(scaled[1].y).toBeCloseTo(80)
    expect(scaled[1].width).toBeCloseTo(40)
    expect(scaled[1].height).toBeCloseTo(20)
  })
})
