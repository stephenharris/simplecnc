import type { Contour } from '../../types/cnc'
import { GcodeOperation } from './gcode-operation'

export class PocketOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[]) {
    return this.contourOffsetter.pocket(contours, this.toolDiameter, 0.5)
  }
}