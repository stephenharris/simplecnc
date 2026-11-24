import { useCallback } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import { createGcodeZip, sanitizeOperationName } from '../gcode/generator'
import { DEFAULT_PROJECT_TITLE } from '../utils/project'

export function useGcodeDownload(title: string, objects: SvgObject[], stock: Stock) {
  return useCallback(async () => {
    if (objects.length === 0) return
    const blob = await createGcodeZip(objects, stock)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeOperationName(title.trim() || DEFAULT_PROJECT_TITLE)}.zip`
    link.click()
    URL.revokeObjectURL(url)
  }, [objects, stock, title])
}
