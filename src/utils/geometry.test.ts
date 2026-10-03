import { describe, expect, it } from 'vitest'
import { AxisAlignedBoundingBox, rotateSelectionAroundPoint } from './geometry'
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
  svg: '',
})

describe('geometry helpers', () => {
  it('computes the axis-aligned bounds for rotated and unrotated objects', () => {
    const objects = [
      makeObject(1, 10, 20, 10, 20),
      makeObject(2, 30, 40, 10, 10),
    ]
    objects[0].rotation = 90

    const box = new AxisAlignedBoundingBox(objects)

    expect(box.getMinX()).toBe(5)
    expect(box.getMinY()).toBe(25)
    expect(box.getWidth()).toBe(35)
    expect(box.getHeight()).toBe(25)
  })

  it('scales and translates objects to match the target bounding box', () => {
    const objects = [
      makeObject(1, 10, 20, 10, 20),
      makeObject(2, 30, 40, 10, 10),
    ]
    const box = new AxisAlignedBoundingBox(objects)

    expect(box.getWidth()).toBe(30)
    expect(box.getHeight()).toBe(30)

    const transformed = box.transform({ x: 0, y: 0, width: 45, height: 15 })

    expect(transformed).toHaveLength(2)
    expect(transformed[0]).toMatchObject({ x: 0, y: 0, width: 15 , height: 10 })
    expect(transformed[1]).toMatchObject({ x: 30, y: 10, width: 15, height: 5 })
    expect(box.getMinX()).toBe(0)
    expect(box.getMinY()).toBe(0)
    expect(box.getWidth()).toBe(45)
    expect(box.getHeight()).toBe(15)
  })

  it('rotates object centers around the center of the selection', () => {
    const objects = [
      makeObject(1, 0, 0, 10, 10),
      makeObject(2, 40, 0, 10, 10),
    ]
    objects[0].rotation = 10
    objects[1].rotation = 30
    const center = { x: 25, y: 5 }

    const rotated = rotateSelectionAroundPoint(objects, center, 90)

    expect(rotated[0].x).toBeCloseTo(20)
    expect(rotated[0].y).toBeCloseTo(-20)
    expect(rotated[0].rotation).toBeCloseTo(100)
    expect(rotated[1].x).toBeCloseTo(20)
    expect(rotated[1].y).toBeCloseTo(20)
    expect(rotated[1].rotation).toBeCloseTo(120)
  })

  it('resepects locked proportions when resizing width', () => {
    const objects = [
      makeObject(1, 10, 20, 10, 20),
      makeObject(2, 30, 40, 10, 10),
    ]
    objects[0].lockedProportions = true 

    const box = new AxisAlignedBoundingBox(objects)
    box.transform({ width: 60 })

    expect(box.getMinX()).toBe(10)
    expect(box.getMinY()).toBe(20)
    expect(box.getWidth()).toBe(60)
    expect(box.getHeight()).toBe(60)
  })

  it('resepects locked proportions when resizing height', () => {
    const objects = [
      makeObject(1, 10, 20, 10, 20),
      makeObject(2, 30, 40, 10, 10),
    ]
    objects[0].lockedProportions = true 

    const box = new AxisAlignedBoundingBox(objects)
    box.transform({ height: 15 })

    expect(box.getMinX()).toBe(10)
    expect(box.getMinY()).toBe(20)
    expect(box.getWidth()).toBe(15)
    expect(box.getHeight()).toBe(15)
  })

  it('locked proportions maintains aspect ratio when resizing both width and height', () => {
    const objects = [
      makeObject(1, 10, 20, 10, 20),
      makeObject(2, 30, 40, 10, 10),
    ]
    // locked proportion applies to all objects in the selection if at least one object has it enabled.
    objects[0].lockedProportions = true 

    const box = new AxisAlignedBoundingBox(objects)
    const transformed = box.transform({ width: 60, height: 15 })

    expect(box.getMinX()).toBe(10)
    expect(box.getMinY()).toBe(20)
    expect(box.getWidth()).toBe(60)
    // The width change takes precedence over the height change,
    // so the height is adjusted to maintain aspect ratio.
    expect(box.getHeight()).toBe(60)

    // Both objects have doubled in size, and maintain their aspect ratios.
    expect(transformed[0].width).toBe(20)
    expect(transformed[0].height).toBe(40)
    expect(transformed[1].width).toBe(20)
    expect(transformed[1].height).toBe(20)
  })
})
