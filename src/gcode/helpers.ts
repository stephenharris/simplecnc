import type { Contour, Point, SvgObject } from '../types/cnc'

export const POINT_TOLERANCE = 0.25

/** Returns whether a contour has enough points and matching endpoints to be offset as a polygon. */
export const isClosedContour = (contour: Contour) => {
  if (contour.length <= 3) return false

  const firstPoint = contour[0]
  const lastPoint = contour[contour.length - 1]
  const distance = Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y)

  return distance < POINT_TOLERANCE
}

export const toMachinePoint = (point: Point, object: SvgObject): Point => {
  const x = object.x + point.x / object.viewBoxWidth * object.width
  const y = object.y + object.height - point.y / object.viewBoxHeight * object.height
  const angle = object.rotation * Math.PI / 180
  const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 }
  return {
    x: center.x + (x - center.x) * Math.cos(angle) - (y - center.y) * Math.sin(angle),
    y: center.y + (x - center.x) * Math.sin(angle) + (y - center.y) * Math.cos(angle),
  }
}

export const sanitizeOperationName = (name: string) => name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'operation'