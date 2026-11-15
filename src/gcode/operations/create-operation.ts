import type { SvgObject, Tool } from '../../types/cnc'
import { CutInsideOperation } from './cut-inside-operation'
import { CutOnPathOperation } from './cut-on-path-operation'
import { CutOutsideOperation } from './cut-outside-operation'
import { PocketOperation } from './pocket-operation'

export const createOperation = (object: SvgObject, tool: Tool) => {
  switch (object.cut.operation) {
    case 'cut-outside': return new CutOutsideOperation(object, tool)
    case 'cut-inside': return new CutInsideOperation(object, tool)
    case 'pocket': return new PocketOperation(object, tool)
    default: return new CutOnPathOperation(object, tool)
  }
}