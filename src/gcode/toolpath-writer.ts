import type { Contour, SvgObject } from '../types/cnc'
import { SAFE_Z } from './constants'

export const writeToolpath = (lines: string[], object: SvgObject, depth: number, contours: Contour[]) => {
  lines.push(`; Pass depth: ${depth.toFixed(3)} mm`, `; ${object.name} / ${object.cut.operation}`)
  contours.forEach((contour) => {
    const first = contour[0]
    if (!first) return
    lines.push(`G0 X${first.x.toFixed(3)} Y${first.y.toFixed(3)}`, `G1 Z-${depth.toFixed(3)} F${object.cut.plungeRate}`)
    contour.slice(1).forEach((point) => lines.push(`G1 X${point.x.toFixed(3)} Y${point.y.toFixed(3)} F${object.cut.feedRate}`))
    lines.push(`G0 Z${SAFE_Z.toFixed(3)}`)
  })
}