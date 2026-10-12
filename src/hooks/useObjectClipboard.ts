import { useCallback, useRef } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import type { ProjectSnapshot } from '../utils/history'

type UseObjectClipboardOptions = {
  objects: SvgObject[]
  selectedObjects: SvgObject[]
  stock: Stock
  setProject: (project: ProjectSnapshot) => void
  setSelectedIds: (ids: number[]) => void
}

export function useObjectClipboard({ objects, selectedObjects, stock, setProject, setSelectedIds }: UseObjectClipboardOptions) {
  const clipboard = useRef<SvgObject[]>([])
  const pasteCount = useRef(0)

  const copySelected = useCallback(() => {
    clipboard.current = selectedObjects.map((object) => ({ ...object }))
    pasteCount.current = 0
  }, [selectedObjects])

  const pasteCopied = useCallback(() => {
    if (clipboard.current.length === 0) return

    const usedIds = new Set(objects.map((object) => object.id))
    const usedNames = new Set(objects.map((object) => object.name))
    let nextId = objects.reduce((maxId, object) => Math.max(maxId, object.id), Date.now()) + 1
    const offset = (pasteCount.current + 1) * 10
    const pastedObjects = clipboard.current.map((object) => {
      while (usedIds.has(nextId)) nextId += 1
      let nextName = object.name
      let counter = 1
      while (usedNames.has(nextName)) {
        nextName = `${object.name}-${counter}`
        counter += 1
      }
      const pastedObject = {
        ...object,
        id: nextId,
        name: nextName,
        operationName: nextName,
        x: object.x + offset,
        y: object.y + offset,
      }
      usedIds.add(nextId)
      usedNames.add(nextName)
      nextId += 1
      return pastedObject
    })

    pasteCount.current += 1
    setProject({ stock, objects: [...objects, ...pastedObjects] })
    setSelectedIds(pastedObjects.map((object) => object.id))
  }, [objects, setProject, setSelectedIds, stock])

  return { copySelected, pasteCopied }
}
