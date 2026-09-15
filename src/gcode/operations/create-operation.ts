import type { SvgObject } from '../../types/cnc'
import { CutInsideOperation } from './cut-inside-operation'
import { CutOnPathOperation } from './cut-on-path-operation'
import { CutOutsideOperation } from './cut-outside-operation'
import { PocketOperation } from './pocket-operation'

export const createOperation = (object: SvgObject) => {
  switch (object.operation) {
    case 'cut-outside': return new CutOutsideOperation(object)
    case 'cut-inside': return new CutInsideOperation(object)
    case 'pocket': return new PocketOperation(object)
    default: return new CutOnPathOperation(object)
  }
}