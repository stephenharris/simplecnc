export type CutOperation = 'cut-on-path' | 'cut-outside' | 'cut-inside' | 'pocket'

export type SvgObject = {
  id: number
  name: string
  src: string
  width: number
  height: number
  x: number
  y: number
  rotation: number
  operation: CutOperation
  depth: number
}

export type Stock = {
  width: number
  height: number
  depth: number
}

export type Point = {
  x: number
  y: number
}
