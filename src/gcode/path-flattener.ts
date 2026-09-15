import { makeAbsolute, parseSVG } from 'svg-path-parser'
import type { Contour, Point } from '../types/cnc'
import { POINT_TOLERANCE } from './helpers'

/** Converts SVG path commands into line segments suitable for router motion. */
export class SvgPathFlattener {
  private contours: Contour[] = []
  private contour: Contour = []
  private current: Point = { x: 0, y: 0 }
  private start: Point = { x: 0, y: 0 }

  flatten(pathData: string): Contour[] {
    const commands = makeAbsolute(parseSVG(pathData))
    this.contours = []
    this.contour = []
    this.current = { x: 0, y: 0 }
    this.start = { x: 0, y: 0 }

    for (const command of commands) {
      switch (command.code) {
        case 'M':
          if (this.contour.length > 1) this.contours.push(this.contour)
          this.current = { x: command.x, y: command.y }
          this.start = this.current
          this.contour = [this.current]
          break
        case 'L': this.addPoint({ x: command.x, y: command.y }); break
        case 'H': this.addPoint({ x: command.x, y: this.current.y }); break
        case 'V': this.addPoint({ x: this.current.x, y: command.y }); break
        case 'C': this.addCurve({ x: command.x, y: command.y }, { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 }); break
        case 'Q': this.addCurve({ x: command.x, y: command.y }, { x: command.x1, y: command.y1 }); break
        case 'A': this.addArc({ x: command.x, y: command.y }, command.rx, command.ry, command.xAxisRotation, command.largeArc, command.sweep); break
        case 'Z':
          this.addPoint(this.start)
          if (this.contour.length > 1) this.contours.push(this.contour)
          this.contour = []
          this.current = this.start
          break
        default: break
      }
    }

    if (this.contour.length > 1) this.contours.push(this.contour)
    return this.contours
  }

  private addPoint(point: Point) {
    if (!this.contour.length || Math.hypot(point.x - this.current.x, point.y - this.current.y) > POINT_TOLERANCE) this.contour.push(point)
    this.current = point
  }

  private addCurve(end: Point, control1: Point, control2?: Point) {
    const origin = this.current
    const steps = Math.max(8, Math.ceil(Math.hypot(end.x - origin.x, end.y - origin.y) / 3))
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      const inverse = 1 - t
      const point = control2
        ? { x: inverse ** 3 * origin.x + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * end.x, y: inverse ** 3 * origin.y + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * end.y }
        : { x: inverse ** 2 * origin.x + 2 * inverse * t * control1.x + t ** 2 * end.x, y: inverse ** 2 * origin.y + 2 * inverse * t * control1.y + t ** 2 * end.y }
      this.addPoint(point)
    }
  }

  private addArc(end: Point, rx: number, ry: number, rotation: number, largeArc: boolean, sweep: boolean) {
    if (rx === 0 || ry === 0) {
      this.addPoint(end)
      return
    }
    const radians = rotation * Math.PI / 180
    const cosRotation = Math.cos(radians)
    const sinRotation = Math.sin(radians)
    const midpoint = { x: (this.current.x - end.x) / 2, y: (this.current.y - end.y) / 2 }
    const rotatedMidpoint = { x: cosRotation * midpoint.x + sinRotation * midpoint.y, y: -sinRotation * midpoint.x + cosRotation * midpoint.y }
    const radiusScale = Math.max(1, rotatedMidpoint.x ** 2 / rx ** 2 + rotatedMidpoint.y ** 2 / ry ** 2)
    const adjustedRx = rx * Math.sqrt(radiusScale)
    const adjustedRy = ry * Math.sqrt(radiusScale)
    const sign = largeArc === sweep ? -1 : 1
    const centerFactor = sign * Math.sqrt(Math.max(0, (adjustedRx ** 2 * adjustedRy ** 2 - adjustedRx ** 2 * rotatedMidpoint.y ** 2 - adjustedRy ** 2 * rotatedMidpoint.x ** 2) / (adjustedRx ** 2 * rotatedMidpoint.y ** 2 + adjustedRy ** 2 * rotatedMidpoint.x ** 2)))
    const rotatedCenter = { x: centerFactor * adjustedRx * rotatedMidpoint.y / adjustedRy, y: -centerFactor * adjustedRy * rotatedMidpoint.x / adjustedRx }
    const center = { x: cosRotation * rotatedCenter.x - sinRotation * rotatedCenter.y + (this.current.x + end.x) / 2, y: sinRotation * rotatedCenter.x + cosRotation * rotatedCenter.y + (this.current.y + end.y) / 2 }
    const startVector = this.arcVector(this.current, center, adjustedRx, adjustedRy)
    const endVector = this.arcVector(end, center, adjustedRx, adjustedRy)
    const startAngle = this.angleBetween({ x: 1, y: 0 }, { x: cosRotation * startVector.x + sinRotation * startVector.y, y: -sinRotation * startVector.x + cosRotation * startVector.y })
    let sweepAngle = this.angleBetween({ x: cosRotation * startVector.x + sinRotation * startVector.y, y: -sinRotation * startVector.x + cosRotation * startVector.y }, { x: cosRotation * endVector.x + sinRotation * endVector.y, y: -sinRotation * endVector.x + cosRotation * endVector.y })
    if (!sweep && sweepAngle > 0) sweepAngle -= Math.PI * 2
    if (sweep && sweepAngle < 0) sweepAngle += Math.PI * 2
    const steps = Math.max(8, Math.ceil(Math.abs(sweepAngle) * Math.max(adjustedRx, adjustedRy) / 3))
    for (let step = 1; step <= steps; step += 1) {
      const angle = startAngle + sweepAngle * step / steps
      this.addPoint({ x: center.x + adjustedRx * Math.cos(angle) * cosRotation - adjustedRy * Math.sin(angle) * sinRotation, y: center.y + adjustedRx * Math.cos(angle) * sinRotation + adjustedRy * Math.sin(angle) * cosRotation })
    }
  }

  private arcVector(point: Point, center: Point, radiusX: number, radiusY: number) {
    return { x: (point.x - center.x) / radiusX, y: (point.y - center.y) / radiusY }
  }

  private angleBetween(from: Point, to: Point) {
    return Math.atan2(from.x * to.y - from.y * to.x, from.x * to.x + from.y * to.y)
  }
}