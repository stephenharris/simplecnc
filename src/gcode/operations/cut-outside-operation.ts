import type { Contour } from '../../types/cnc'
import { isClosedContour } from '../helpers'
import { GcodeOperation } from './gcode-operation'

export class CutOutsideOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[], depth: number) {
    return [...contours.filter((contour) => !isClosedContour(contour)), ...this.contourOffsetter.offset(contours, this.cuttingDiameterAtDepth(depth) / 2)]
  }
}