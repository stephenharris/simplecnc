import JSZip from 'jszip'
import type { Stock, SvgObject } from '../types/cnc'
import { FEED_RATE, PLUNGE_RATE, SAFE_Z, STEP_DOWN, TOOL_DIAMETER } from './constants'
import { isClosedContour, sanitizeOperationName } from './helpers'
import { createOperation } from './operations'

export const DEFAULT_TOOL_DIAMETER = TOOL_DIAMETER
export const DEFAULT_STEPDOWN = STEP_DOWN
export const DEFAULT_FEED_RATE = FEED_RATE
export const DEFAULT_PLUNGE_RATE = PLUNGE_RATE
export const DEFAULT_SAFE_Z = SAFE_Z

export { isClosedContour, sanitizeOperationName }

/** Generates one GRBL 1.1-compatible file for a single operation. */
export const generateGcode = (object: SvgObject, stock: Stock): string => {
  const lines = [`; SimpleCNC / ${object.operationName}`, '; GRBL 1.1 / Z0 at material top / origin: bottom-left', `; Tool diameter: ${DEFAULT_TOOL_DIAMETER.toFixed(3)} mm`, `; Stepdown: ${DEFAULT_STEPDOWN.toFixed(2)} mm`, 'G21', 'G90', 'G17', 'G94', 'M5', `G0 Z${DEFAULT_SAFE_Z.toFixed(3)}`]
  createOperation(object).generateDepthPasses(lines, stock)
  lines.push(`G0 Z${DEFAULT_SAFE_Z.toFixed(3)}`, 'M5', 'G0 X0 Y0', 'M2')
  return `${lines.join('\n')}\n`
}

/** Creates one NC file per object and returns a ZIP download payload. */
export const createGcodeZip = async (objects: SvgObject[], stock: Stock) => {
  const zip = new JSZip()
  objects.forEach((object) => {
    zip.file(
      `${sanitizeOperationName(object.operationName)}.nc`,
      generateGcode(object, stock)
    )
  })
  return zip.generateAsync({ type: 'blob' })
}