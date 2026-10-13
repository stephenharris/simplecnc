import { describe, expect, it } from 'vitest'
import type { SvgObject } from '../types/cnc'
import { snapToObjectAlignment } from './alignmentSnap'

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
  svg: '',
})

describe('snapToObjectAlignment', () => {
  it('snaps matching left and middle edges to another object', () => {
    const objects = [
      makeObject(1, 10, 10, 20, 20),
      makeObject(2, 50, 40, 30, 30),
    ]

    const result = snapToObjectAlignment(objects, [1], { x: 38, y: 33 }, { x: 5, y: 5 })

    expect(result).toEqual({
      delta: { x: 40, y: 35 },
      guideX: 50,
      guideY: 55,
    })
  })

  it('does not snap outside the tolerance or to another moving object', () => {
    const objects = [
      makeObject(1, 10, 10, 20, 20),
      makeObject(2, 50, 40, 30, 30),
    ]

    expect(snapToObjectAlignment(objects, [1, 2], { x: 0, y: 0 }, { x: 5, y: 5 })).toEqual({
      delta: { x: 0, y: 0 },
      guideX: null,
      guideY: null,
    })
    expect(snapToObjectAlignment(objects, [1], { x: 0, y: 0 }, { x: 5, y: 5 })).toEqual({
      delta: { x: 0, y: 0 },
      guideX: null,
      guideY: null,
    })
  })
})
