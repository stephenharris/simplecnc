import type { Contour } from '../../types/cnc'
import { TOOL_DIAMETER } from '../constants'
import { GcodeOperation } from './gcode-operation'

export class PocketOperation extends GcodeOperation {
  protected adjustContours(contours: Contour[]) {
    return this.contourOffsetter.pocket(contours, TOOL_DIAMETER)
  }
}