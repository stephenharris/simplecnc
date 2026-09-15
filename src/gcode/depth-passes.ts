import type { Stock, SvgObject } from '../types/cnc'
import { STEP_DOWN } from './constants'

export const forEachDepthPass = (object: SvgObject, stock: Stock, callback: (depth: number) => void) => {
  const maxDepth = Math.min(stock.depth, object.depth)
  for (let depth = STEP_DOWN; depth < maxDepth; depth += STEP_DOWN) callback(depth)
  if (maxDepth > 0) callback(maxDepth)
}