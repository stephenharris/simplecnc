import type { Contour, Stock, SvgObject, Tool } from '../../types/cnc'
import { ContourOffsetter } from '../contour-offsetter'
import { forEachDepthPass } from '../depth-passes'
import { getObjectPathTransform, toMachinePoint } from '../helpers'
import { SvgPathFlattener } from '../path-flattener'
import { writeToolpath } from '../toolpath-writer'

export abstract class GcodeOperation {
  protected readonly object: SvgObject
  protected readonly tool: Tool
  protected readonly pathTransform: ReturnType<typeof getObjectPathTransform>
  protected readonly contourOffsetter = new ContourOffsetter()
  protected readonly pathFlattener = new SvgPathFlattener()

  constructor(object: SvgObject, tool: Tool) {
    this.object = object
    this.tool = tool
    this.pathTransform = getObjectPathTransform(object)
  }

  generateDepthPasses(lines: string[], stock: Stock) {
    forEachDepthPass(this.object, stock, (depth) => this.addDepthPass(lines, depth, stock))
  }

  protected addDepthPass(lines: string[], depth: number, stock: Stock) {
    const contours = this.pathFlattener
      .flatten(this.object.pathData)
      .map((contour) => contour.map((point) => toMachinePoint(point, this.object, this.pathTransform, stock)))
    writeToolpath(lines, this.object, depth, this.adjustContours(contours, depth))
  }

  protected cuttingDiameterAtDepth(depth: number) {
    if (this.tool.shape !== 'conical') return this.tool.diameter

    const angle = this.tool.angle
    if (angle === undefined || !Number.isFinite(angle) || angle <= 0 || angle >= 180) {
      throw new Error(`Conical tool "${this.tool.description}" must have an angle greater than 0 and less than 180 degrees.`)
    }

    const cuttingDiameter = 2 * depth * Math.tan(angle * Math.PI / 360)
    return Math.min(this.tool.diameter, cuttingDiameter)
  }

  protected abstract adjustContours(contours: Contour[], depth: number): Contour[]
}