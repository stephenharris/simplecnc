import type { Contour, Stock } from '../../types/cnc'
import { toMachinePoint } from '../helpers';
import { writeToolpath } from '../toolpath-writer';
import { GcodeOperation } from './gcode-operation'

export class PocketOperation extends GcodeOperation {
  
  protected adjustContours(contours: Contour[]): Contour[] {
    const stepOver = this.object.cut.stepOver ?? 50;
    return this.contourOffsetter.pocket(contours, this.toolDiameter, stepOver / 100)
  }

  generateDepthPasses(lines: string[], stock: Stock) {
    super.generateDepthPasses(lines, stock);
    const stepOver = this.object.cut.stepOver ?? 50;
    const maxDepth = Math.min(stock.depth, this.object.cut.depth);

    if(this.object.cut.finalPassStepOver && this.object.cut.finalPassStepOver < stepOver ) { 
      lines.push(`; Final pass with step over ${this.object.cut.finalPassStepOver}%`);
      this.addFinalDepthPass(lines, maxDepth, this.object.cut.finalPassStepOver);
    }
  }

  private addFinalDepthPass(lines: string[], depth: number, stepOver: number) {
    const contours = this.pathFlattener
      .flatten(this.object.pathData)
      .map((contour) => contour.map((point) => toMachinePoint(point, this.object)))

    const adjustedContours = this.contourOffsetter.pocket(contours, this.toolDiameter, stepOver / 100)
    writeToolpath(lines, this.object, depth, adjustedContours)
  }
  
}