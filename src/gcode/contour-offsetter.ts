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
      
      // ClipperLib only works with integers so we scale up the coordinates to preserve precision.
      offsetter.AddPath(contour.map((point) => (
        { 
          X: Math.round(point.x * scale), 
          Y: Math.round(point.y * scale) 
        }
      )), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
      
      //If delta is negative the polygon shrinks, if positive the polygon grows.
      offsetter.Execute(solution, delta * scale)

      //Now scale the coordinates back down to their original values and close the contour if necessary.
      output.push(...solution
          .map((path) => path.map((point) => ({ x: point.X / scale, y: point.Y / scale })))
          .map((path) => this.closeContour(path)))
    })
    return output.filter(isClosedContour)
  }

  pocket(contours: Contour[], toolDiameter: number, stepOverRatio: number): Contour[] {
    const closedContours = contours.filter(isClosedContour)
    if (closedContours.length === 0) return []
    if (stepOverRatio <= 0 || stepOverRatio > 1) throw new RangeError('Pocket step-over ratio must be greater than 0 and at most 1')

    const ringContours: Contour[] = []
    const stepOverDistance = toolDiameter * stepOverRatio
    let currentContours = this.offsetCompound(this.union(closedContours), -toolDiameter / 2)
    while (currentContours.length > 0) {
      ringContours.push(...currentContours)
      const nextContours = this.offsetCompound(currentContours, -stepOverDistance)
      const currentArea = currentContours.reduce((area, contour) => area + this.polygonArea(contour), 0)
      const nextArea = nextContours.reduce((area, contour) => area + this.polygonArea(contour), 0)
      if (nextContours.length === 0 || nextArea >= currentArea - POINT_TOLERANCE) break
      currentContours = nextContours
    }
    return ringContours.reverse()
  }

  private union(contours: Contour[]): Contour[] {
    const clipper = new ClipperLib.Clipper()
    clipper.AddPaths(this.toClipperPaths(contours), ClipperLib.PolyType.ptSubject, true)
    const solution: ClipperLib.Paths = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    return this.fromClipperPaths(solution)
  }

  private offsetCompound(contours: Contour[], delta: number): Contour[] {
    if (contours.length === 0) return []
    const offsetter = new ClipperLib.ClipperOffset()
    offsetter.AddPaths(this.toClipperPaths(contours), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
    const solution: ClipperLib.Paths = []
    offsetter.Execute(solution, delta * 1000)
    return this.fromClipperPaths(solution)
  }

  private toClipperPaths(contours: Contour[]): ClipperLib.Paths {
    const scale = 1000
    return contours.map((contour) => contour.map((point) => ({
      X: Math.round(point.x * scale),
      Y: Math.round(point.y * scale),
    })))
  }

  private fromClipperPaths(paths: ClipperLib.Paths): Contour[] {
    const scale = 1000
    return paths
      .map((path) => path.map((point) => ({ x: point.X / scale, y: point.Y / scale })))
      .map((path) => this.closeContour(path))
      .filter(isClosedContour)
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