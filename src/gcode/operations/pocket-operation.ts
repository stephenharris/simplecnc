import type { Contour, Stock } from '../../types/cnc'
import { forEachDepthPass } from '../depth-passes'
import { toMachinePoint } from '../helpers';
import { writeToolpath } from '../toolpath-writer';
import { GcodeOperation } from './gcode-operation'

export class PocketOperation extends GcodeOperation {
  
  protected adjustContours(contours: Contour[], depth: number): Contour[] {
    const stepOver = this.object.cut.stepOver ?? 50;
    return this.contourOffsetter.pocket(contours, this.cuttingDiameterAtDepth(depth), stepOver / 100)
  }

  generateDepthPasses(lines: string[], stock: Stock) {
    const stepOver = this.object.cut.stepOver ?? 50;
    const maxDepth = Math.min(stock.depth, this.object.cut.depth);
    const features = this.contourOffsetter.features(this.getMachineContours(stock))
    const finalPassStepOver = this.object.cut.finalPassStepOver
    const hasFinalPass = Boolean(finalPassStepOver && finalPassStepOver < stepOver)
    const depths: number[] = []
    forEachDepthPass(this.object, stock, (depth) => depths.push(depth))

    if (features.length === 0) {
      depths.forEach((depth) => writeToolpath(lines, this.object, depth, []))
      if (hasFinalPass && finalPassStepOver !== undefined) {
        lines.push(`; Final pass with step over ${finalPassStepOver}%`)
        writeToolpath(lines, this.object, maxDepth, [])
      }
      return
    }

    features.forEach((feature) => {
      depths.forEach((depth) => {
        const adjustedContours = this.contourOffsetter.pocket(feature, this.cuttingDiameterAtDepth(depth), stepOver / 100)
        writeToolpath(lines, this.object, depth, adjustedContours)
      })

      if (hasFinalPass && finalPassStepOver !== undefined) {
        lines.push(`; Final pass with step over ${finalPassStepOver}%`)
        const adjustedContours = this.contourOffsetter.pocket(feature, this.cuttingDiameterAtDepth(maxDepth), finalPassStepOver / 100)
        writeToolpath(lines, this.object, maxDepth, adjustedContours)
      }
    })
  }

  private getMachineContours(stock: Stock): Contour[] {
    return this.pathFlattener
      .flatten(this.object.pathData)
      .map((contour) => contour.map((point) => toMachinePoint(point, this.object, this.pathTransform, stock)))
  }
  
}