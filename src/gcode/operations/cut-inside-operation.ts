import type { Contour } from '../../types/cnc'
import { isClosedContour } from '../helpers'
import { GcodeOperation } from './gcode-operation'

export class CutInsideOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[]) {
    return [...contours.filter((contour) => !isClosedContour(contour)), ...this.contourOffsetter.offset(contours, -this.toolDiameter / 2)]
  }
}