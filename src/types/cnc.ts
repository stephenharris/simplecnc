export type CutOperation = 'cut-on-path' | 'cut-outside' | 'cut-inside' | 'pocket'

export type CutSettings = {
  operation: CutOperation
  bitId: string
  depth: number
  feedRate: number
  plungeRate: number
  depthPerPass: number
  stepOver?: number
  finalPassStepOver?: number
}

export type SvgObject = {
  id: number
  name: string
  operationName: string
  src: string
  pathData: string
  viewBoxWidth: number
  viewBoxHeight: number
  pathBoundsX?: number
  pathBoundsY?: number
  pathBoundsWidth?: number
  pathBoundsHeight?: number
  width: number
  height: number
  x: number
  y: number
  rotation: number
  cut: CutSettings
  lockedProportions: boolean
  svg: string
}

export type SvgObjectUpdate = Omit<Partial<SvgObject>, 'cut'> & {
  cut?: Partial<CutSettings>
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
