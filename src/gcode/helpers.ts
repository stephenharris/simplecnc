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

type SvgTransform = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
  boundsX: number
  boundsY: number
}

const IDENTITY_TRANSFORM: SvgTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, boundsX: 0, boundsY: 0 }

const multiplyTransforms = (left: SvgTransform, right: SvgTransform): SvgTransform => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f,
  boundsX: 0,
  boundsY: 0,
})

const transformFromText = (value: string): SvgTransform => {
  const operations = value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)
  let transform = { ...IDENTITY_TRANSFORM }
  for (const [, name, rawValues] of operations) {
    const values = rawValues.trim().split(/[,\s]+/).map(Number)
    let next: SvgTransform
    switch (name) {
      case 'matrix':
        if (values.length !== 6) throw new Error(`Invalid SVG matrix transform "${value}".`)
        next = { a: values[0], b: values[1], c: values[2], d: values[3], e: values[4], f: values[5], boundsX: 0, boundsY: 0 }
        break
      case 'translate':
        if (values.length < 1 || values.length > 2) throw new Error(`Invalid SVG translate transform "${value}".`)
        next = { ...IDENTITY_TRANSFORM, e: values[0], f: values[1] ?? 0 }
        break
      case 'scale':
        if (values.length < 1 || values.length > 2) throw new Error(`Invalid SVG scale transform "${value}".`)
        next = { ...IDENTITY_TRANSFORM, a: values[0], d: values[1] ?? values[0] }
        break
      case 'rotate': {
        if (values.length !== 1 && values.length !== 3) throw new Error(`Invalid SVG rotate transform "${value}".`)
        const radians = values[0] * Math.PI / 180
        const rotation = { ...IDENTITY_TRANSFORM, a: Math.cos(radians), b: Math.sin(radians), c: -Math.sin(radians), d: Math.cos(radians) }
        if (values.length === 1) next = rotation
        else {
          const toCenter = { ...IDENTITY_TRANSFORM, e: values[1], f: values[2] }
          const fromCenter = { ...IDENTITY_TRANSFORM, e: -values[1], f: -values[2] }
          next = multiplyTransforms(multiplyTransforms(toCenter, rotation), fromCenter)
        }
        break
      }
      case 'skewX':
      case 'skewY': {
        if (values.length !== 1) throw new Error(`Invalid SVG skew transform "${value}".`)
        const skew = Math.tan(values[0] * Math.PI / 180)
        next = name === 'skewX'
          ? { ...IDENTITY_TRANSFORM, c: skew }
          : { ...IDENTITY_TRANSFORM, b: skew }
        break
      }
      default:
        throw new Error(`Unsupported SVG transform "${name}".`)
    }
    if (Object.values(next).some((entry) => !Number.isFinite(entry))) throw new Error(`Invalid SVG transform "${value}".`)
    transform = multiplyTransforms(transform, next)
  }
  return transform
}

export const getObjectPathTransform = (object: SvgObject): SvgTransform => {
  const bounds = object.svg.match(/\bdata-path-bounds=["']([^"']+)["']/i)?.[1].trim().split(/\s+/).map(Number)
  const boundsX = bounds?.length === 4 && Number.isFinite(bounds[0]) ? bounds[0] : 0
  const boundsY = bounds?.length === 4 && Number.isFinite(bounds[1]) ? bounds[1] : 0
  let transform = { ...IDENTITY_TRANSFORM }
  for (const [, value] of object.svg.matchAll(/<(?:g|path)\b[^>]*\btransform=["']([^"']+)["']/gi)) {
    transform = multiplyTransforms(transform, transformFromText(value))
  }
  return { ...transform, boundsX, boundsY }
}

export const toMachinePoint = (point: Point, object: SvgObject, pathTransform = IDENTITY_TRANSFORM): Point => {
  const rawX = point.x + pathTransform.boundsX
  const rawY = point.y + pathTransform.boundsY
  const transformedPoint = {
    x: pathTransform.a * rawX + pathTransform.c * rawY + pathTransform.e - pathTransform.boundsX,
    y: pathTransform.b * rawX + pathTransform.d * rawY + pathTransform.f - pathTransform.boundsY,
  }

  const bounds = object.pathBoundsWidth && object.pathBoundsHeight
    ? { x: object.pathBoundsX ?? 0, y: object.pathBoundsY ?? 0, width: object.pathBoundsWidth, height: object.pathBoundsHeight }
    : { x: 0, y: 0, width: object.viewBoxWidth, height: object.viewBoxHeight }
  
  // Normalise the point inside the bounding box, scale it to the object size, 
  // and then offset it to the object position. 
  // Note that the y-axis is inverted in SVG coordinates, so we subtract the scaled y from the object height.
  const x = object.x + (transformedPoint.x - bounds.x) / bounds.width * object.width
  const y = object.y + object.height - (transformedPoint.y - bounds.y) / bounds.height * object.height
  
  // Finally, apply rotation around the center of the object.
  const angle = object.rotation * Math.PI / 180
  const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 }
  return {
    x: center.x + (x - center.x) * Math.cos(angle) - (y - center.y) * Math.sin(angle),
    y: center.y + (x - center.x) * Math.sin(angle) + (y - center.y) * Math.cos(angle),
  }
}

export const sanitizeOperationName = (name: string) => name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'operation'