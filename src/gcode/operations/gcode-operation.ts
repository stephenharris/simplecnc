import type { Contour, Stock, SvgObject } from '../../types/cnc'
import { ContourOffsetter } from '../contour-offsetter'
import { forEachDepthPass } from '../depth-passes'
import { toMachinePoint } from '../helpers'
import { SvgPathFlattener } from '../path-flattener'
import { writeToolpath } from '../toolpath-writer'
import { getGroupMembersInWorldSpace } from '../../utils/groups'

export abstract class GcodeOperation {
  protected readonly object: SvgObject
  protected readonly toolDiameter: number
  protected readonly contourOffsetter = new ContourOffsetter()
  protected readonly pathFlattener = new SvgPathFlattener()

  constructor(object: SvgObject, toolDiameter: number) {
    this.object = object
    this.toolDiameter = toolDiameter
  }

  generateDepthPasses(lines: string[], stock: Stock) {
    forEachDepthPass(this.object, stock, (depth) => this.addDepthPass(lines, depth))
  }

  protected addDepthPass(lines: string[], depth: number) {
    writeToolpath(lines, this.object, depth, this.adjustContours(this.getContours()))
  }

  protected getContours(): Contour[] {
    return getGroupMembersInWorldSpace(this.object).flatMap((member) =>
      this.pathFlattener
        .flatten(member.pathData)
        .map((contour) => contour.map((point) => toMachinePoint(point, member))),
    )
  }

  protected abstract adjustContours(contours: Contour[]): Contour[]
}