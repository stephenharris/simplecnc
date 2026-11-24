import { useEffect, useRef } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import { saveProjectToStorage } from '../utils/project'

export function useProjectPersistence(title: string, stock: Stock, objects: SvgObject[]) {
  const hasMounted = useRef(false)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    saveProjectToStorage({ title, stock, objects })
  }, [objects, stock, title])
}
