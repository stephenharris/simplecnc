import { useCallback } from 'react'
import type { ChangeEvent } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import { createImportedObjects, extractPathSvgs } from '../utils/svg'

const readFileAsText = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result ?? ''))
  reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}.`))
  reader.readAsText(file)
})

type UseSvgImportOptions = {
  stock: Stock
  appendObjects: (objects: SvgObject[]) => void
  setSelectedIds: (ids: number[]) => void
}

export function useSvgImport({ stock, appendObjects, setSelectedIds }: UseSvgImportOptions) {
  return useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    void Promise.all(files.map(async (file) => {
      const svg = await readFileAsText(file)
      return createImportedObjects(extractPathSvgs(svg), file.name, stock.depth)
    })).then((importedByFile) => {
      const importedObjects = importedByFile.flat()
      if (importedObjects.length === 0) return
      appendObjects(importedObjects)
      setSelectedIds(importedObjects.map((object) => object.id))
    }).catch((error: unknown) => {
      window.alert(error instanceof Error ? error.message : 'Could not import the selected SVG files.')
    })
  }, [appendObjects, setSelectedIds, stock])
}
