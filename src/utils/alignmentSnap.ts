import type { Point, SvgObject } from '../types/cnc'
import { AxisAlignedBoundingBox } from './geometry'

export type AlignmentSnap = {
  delta: Point
  guideX: number | null
  guideY: number | null
}

const getBounds = (objects: SvgObject[]) => new AxisAlignedBoundingBox(objects).getBounds()

const getClosestSnap = (
  movingValues: number[],
  targetValues: number[],
  delta: number,
  tolerance: number,
) => {
  let closest: { delta: number; guide: number } | null = null

  for (let index = 0; index < movingValues.length; index += 1) {
    const movingValue = movingValues[index] + delta
    const targetValue = targetValues[index]
    const adjustment = targetValue - movingValue

    if (Math.abs(adjustment) <= tolerance && (!closest || Math.abs(adjustment) < Math.abs(closest.delta))) {
      closest = { delta: adjustment, guide: targetValue }
    }
  }

  return closest
}

export const snapToObjectAlignment = (
  objects: SvgObject[],
  movingIds: number[],
  delta: Point,
  tolerance: Point,
): AlignmentSnap => {
  const movingObjects = objects.filter((object) => movingIds.includes(object.id))
  const stationaryObjects = objects.filter((object) => !movingIds.includes(object.id))

  if (movingObjects.length === 0 || stationaryObjects.length === 0) {
    return { delta, guideX: null, guideY: null }
  }

  const movingBounds = getBounds(movingObjects)
  const movingX = [movingBounds.x, movingBounds.x + movingBounds.width / 2, movingBounds.x + movingBounds.width]
  const movingY = [movingBounds.y, movingBounds.y + movingBounds.height / 2, movingBounds.y + movingBounds.height]
  let closestX: { delta: number; guide: number } | null = null
  let closestY: { delta: number; guide: number } | null = null

  for (const object of stationaryObjects) {
    const bounds = getBounds([object])
    const targetX = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width]
    const targetY = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height]
    const candidateX = getClosestSnap(movingX, targetX, delta.x, tolerance.x)
    const candidateY = getClosestSnap(movingY, targetY, delta.y, tolerance.y)

    if (candidateX && (!closestX || Math.abs(candidateX.delta) < Math.abs(closestX.delta))) {
      closestX = candidateX
    }
    if (candidateY && (!closestY || Math.abs(candidateY.delta) < Math.abs(closestY.delta))) {
      closestY = candidateY
    }
  }

  return {
    delta: {
      x: delta.x + (closestX?.delta ?? 0),
      y: delta.y + (closestY?.delta ?? 0),
    },
    guideX: closestX?.guide ?? null,
    guideY: closestY?.guide ?? null,
  }
}
