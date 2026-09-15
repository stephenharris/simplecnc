import type { Contour } from '../../types/cnc'
import { GcodeOperation } from './gcode-operation'

export class CutOnPathOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[]) {
    return contours
  }
}