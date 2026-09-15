import type { Contour } from '../../types/cnc'
import { isClosedContour } from '../helpers'
import { TOOL_DIAMETER } from '../constants'
import { GcodeOperation } from './gcode-operation'

export class CutOutsideOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[]) {
    return [...contours.filter((contour) => !isClosedContour(contour)), ...this.contourOffsetter.offset(contours, TOOL_DIAMETER / 2)]
  }
}