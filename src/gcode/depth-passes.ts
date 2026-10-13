import type { Stock, SvgObject } from '../types/cnc'

export const forEachDepthPass = (object: SvgObject, stock: Stock, callback: (depth: number) => void) => {
  const maxDepth = Math.min(stock.depth, object.cut.depth)
  const depthPerPass = object.cut.depthPerPass
  if (!Number.isFinite(depthPerPass) || depthPerPass <= 0) {
    throw new Error(`Depth per pass must be greater than zero for object "${object.name}".`)
  }
  for (let depth = depthPerPass; depth < maxDepth; depth += depthPerPass) callback(depth)
  if (maxDepth > 0) callback(maxDepth)
}