import * as ClipperLib from 'clipper-lib'
import type { Contour } from '../types/cnc'
import { POINT_TOLERANCE } from './constants'
import { isClosedContour } from './helpers'

export class ContourOffsetter {
  offset(contours: Contour[], delta: number): Contour[] {
    const scale = 1000
    const output: Contour[] = []
    contours.filter(isClosedContour).forEach((contour) => {
      const solution: ClipperLib.Paths = []
      const offsetter = new ClipperLib.ClipperOffset()
      const clipperDelta = this.polygonArea(contour) > 0 ? delta : -delta
      offsetter.AddPath(contour.map((point) => ({ X: Math.round(point.x * scale), Y: Math.round(point.y * scale) })), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
      offsetter.Execute(solution, clipperDelta * scale)
      output.push(...solution.map((path) => path.map((point) => ({ x: point.X / scale, y: point.Y / scale }))).map((path) => this.closeContour(path)))
    })
    return output.filter(isClosedContour)
  }

  pocket(contours: Contour[], toolDiameter: number, stepOverRatio: number): Contour[] {
    const closedContours = contours.filter(isClosedContour)
    if (closedContours.length === 0) return []
    if (stepOverRatio <= 0 || stepOverRatio > 1) throw new RangeError('Pocket step-over ratio must be greater than 0 and at most 1')

    const ringContours: Contour[] = []
    const stepOverDistance = toolDiameter * stepOverRatio
    let currentContours = this.offset(closedContours, -toolDiameter / 2)
    while (currentContours.length > 0) {
      ringContours.push(...currentContours)
      const nextContours = currentContours.flatMap((contour) => {
        const currentArea = Math.abs(this.polygonArea(contour))
        return this.offset([contour], -stepOverDistance).filter((candidate) => Math.abs(this.polygonArea(candidate)) < currentArea - POINT_TOLERANCE)
      })
      if (nextContours.length === 0) break
      currentContours = nextContours
    }
    return ringContours.reverse()
  }

  private polygonArea(contour: Contour) {
    return contour.reduce((total, point, index) => {
      const next = contour[(index + 1) % contour.length]
      return total + (point.x * next.y - next.x * point.y)
    }, 0) / 2
  }

  private closeContour(contour: Contour): Contour {
    if (contour.length === 0) return contour
    const first = contour[0]
    const last = contour[contour.length - 1]
    if (Math.hypot(first.x - last.x, first.y - last.y) <= POINT_TOLERANCE) return contour
    return [...contour, { ...first }]
  }
}