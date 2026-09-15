import type { SvgObject } from '../../types/cnc'
import { CutInsideOperation } from './cut-inside-operation'
import { CutOnPathOperation } from './cut-on-path-operation'
import { CutOutsideOperation } from './cut-outside-operation'
import { PocketOperation } from './pocket-operation'

export const createOperation = (object: SvgObject, toolDiameter: number) => {
  switch (object.operation) {
    case 'cut-outside': return new CutOutsideOperation(object, toolDiameter)
    case 'cut-inside': return new CutInsideOperation(object, toolDiameter)
    case 'pocket': return new PocketOperation(object, toolDiameter)
    default: return new CutOnPathOperation(object, toolDiameter)
  }
}