import { useState } from 'react'
import type { GridSnapSettings } from '../utils/grid'

export function useGridSnap() {
  const [enabled, setEnabled] = useState(false)
  const [spacing, setSpacing] = useState(10)
  const settings: GridSnapSettings = { enabled, spacing }

  return { ...settings, settings, setEnabled, setSpacing }
}
