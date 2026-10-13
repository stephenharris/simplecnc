import JSZip from 'jszip'
import type { Stock, SvgObject } from '../types/cnc'
import { getTool } from '../utils/tools'
import { FEED_RATE, PLUNGE_RATE, SAFE_Z, STEP_DOWN } from './constants'
import { isClosedContour, sanitizeOperationName } from './helpers'
import { createOperation } from './operations'

export const DEFAULT_STEPDOWN = STEP_DOWN
export const DEFAULT_FEED_RATE = FEED_RATE
export const DEFAULT_PLUNGE_RATE = PLUNGE_RATE
export const DEFAULT_SAFE_Z = SAFE_Z

export { isClosedContour, sanitizeOperationName }

/** Generates one GRBL 1.1-compatible file for a single operation. */
export const generateGcode = (object: SvgObject, stock: Stock): string => {
  const bit = getTool(object.cut.bitId)
  if (!bit) throw new Error(`No configured bit found for object "${object.name}"`)
  const toolDiameter = bit.diameter
  const lines = [
    `; SimpleCNC / ${object.operationName}`, 
    '; GRBL 1.1 / Z0 at material top / origin: bottom-left', 
    `; Stepdown: ${object.cut.depthPerPass.toFixed(2)} mm`,
    'G21', 
    'G90', 
    'G17', 
    'G94', 
    `; Tool: ${bit.description}`,
    `; Tool diameter: ${toolDiameter.toFixed(3)} mm`, 
    `T${object.cut.bitId} M6`,
    `G0 Z${DEFAULT_SAFE_Z.toFixed(3)}`
  ]
  createOperation(object, toolDiameter).generateDepthPasses(lines, stock)
  lines.push(`G0 Z${DEFAULT_SAFE_Z.toFixed(3)}`, 'G0 X0 Y0', 'M2')
  return `${lines.join('\n')}\n`
}

/** Creates one NC file per object and returns a ZIP download payload. */
export const createGcodeZip = async (objects: SvgObject[], stock: Stock) => {
  const zip = new JSZip()
  let fileNames = new Set<string>();
  objects.forEach((object) => {
    // Even if the user has given duplicate operation names, we need to 
    // ensure unique file names for each object.
    let fileName = `${sanitizeOperationName(object.operationName)}.nc`;
    let counter = 1;
    while (fileNames.has(fileName)) {
      fileName = `${sanitizeOperationName(object.operationName)}-${counter}.nc`;
      counter++;
    }
    fileNames.add(fileName);
    zip.file(
      `${fileName}`,
      generateGcode(object, stock)
    )
  })
  return zip.generateAsync({ type: 'blob' })
}