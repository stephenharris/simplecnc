import type { SvgObject } from '../types/cnc'

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export const getSelectionBounds = (items: SvgObject[]): Bounds => {
  if (items.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

  const left = Math.min(...items.map((item) => item.x))
  const bottom = Math.min(...items.map((item) => item.y))
  const right = Math.max(...items.map((item) => item.x + item.width))
  const top = Math.max(...items.map((item) => item.y + item.height))

  return {
    x: left,
    y: bottom,
    width: Math.max(0.001, right - left),
    height: Math.max(0.001, top - bottom),
  }
}

/*
 * Scales the given items from the "from" bounds to the "to" bounds, preserving their relative positions 
 * and sizes.
 * Returns a new array of scaled items.
*/
export const scaleSelectionToBounds = (items: SvgObject[], from: Bounds, to: Bounds): SvgObject[] => {
  return items.map((item) => {
    const relativeX = item.x - from.x
    const relativeY = item.y - from.y

    const scaleX = from.width > 0 ? to.width / from.width : 1
    let scaleY = from.height > 0 ? to.height / from.height : 1

    return {
      ...item,
      x: to.x + relativeX * scaleX,
      y: to.y + relativeY * scaleY,
      width: item.width * scaleX,
      height: item.height * scaleY,
    }
  })
}

export const rotateSelectionAroundPoint = (items: SvgObject[], center: { x: number, y: number }, angleDegrees: number): SvgObject[] => {

  const angle = angleDegrees * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return items.map((item) => {
    const itemCenter = { x: item.x + item.width / 2, y: item.y + item.height / 2 }
    const offsetX = itemCenter.x - center.x
    const offsetY = itemCenter.y - center.y
    const rotatedCenter = {
      x: center.x + offsetX * cos - offsetY * sin,
      y: center.y + offsetX * sin + offsetY * cos,
    }

    return {
      ...item,
      x: rotatedCenter.x - item.width / 2,
      y: rotatedCenter.y - item.height / 2,
      rotation: item.rotation + angleDegrees,
    }
  })
}
