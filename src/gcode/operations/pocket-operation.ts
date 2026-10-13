import type { Contour } from '../../types/cnc'
import { GcodeOperation } from './gcode-operation'

export class PocketOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[]) {
    const stepOver = this.object.cut.stepOver ?? 50
    return this.contourOffsetter.pocket(contours, this.toolDiameter, stepOver / 100)
  }
}