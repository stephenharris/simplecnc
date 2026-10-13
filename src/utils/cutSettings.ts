import type { CutSettings } from '../types/cnc'
import { FEED_RATE, PLUNGE_RATE, STEP_DOWN } from '../gcode/constants'

export const createCutSettings = (bitId: string, depth: number): CutSettings => ({
  operation: 'cut-on-path',
  bitId,
  depth,
  feedRate: FEED_RATE,
  plungeRate: PLUNGE_RATE,
  depthPerPass: STEP_DOWN,
})
