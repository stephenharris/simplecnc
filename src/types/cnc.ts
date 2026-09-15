export type CutOperation = 'cut-on-path' | 'cut-outside' | 'cut-inside' | 'pocket'

export type SvgObject = {
  id: number
  name: string
  operationName: string
  src: string
  pathData: string
  viewBoxWidth: number
  viewBoxHeight: number
  width: number
  height: number
  x: number
  y: number
  rotation: number
  operation: CutOperation
  bitId: string
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

export type Contour = Point[]
