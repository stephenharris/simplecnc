import { useCallback } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import { createGcodeZip } from '../gcode/generator'

export function useGcodeDownload(objects: SvgObject[], stock: Stock) {
  return useCallback(async () => {
    if (objects.length === 0) return
    const blob = await createGcodeZip(objects, stock)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'simplecnc-gcode.zip'
    link.click()
    URL.revokeObjectURL(url)
  }, [objects, stock])
}
