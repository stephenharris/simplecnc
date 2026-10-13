export type GridSnapSettings = {
  enabled: boolean
  spacing: number
}

export const snapToGrid = (value: number, spacing: number) => {
  if (!Number.isFinite(spacing) || spacing <= 0) return value
  return Math.round(value / spacing) * spacing
}
