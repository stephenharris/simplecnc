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

const cloneObject = (object: SvgObject): SvgObject => ({
  ...object,
  cut: { ...object.cut },
  ...(object.groupedObjects
    ? { groupedObjects: object.groupedObjects.map(cloneObject) }
    : {}),
})

const collectObjectTree = (objects: SvgObject[]): SvgObject[] =>
  objects.flatMap((object) => [object, ...(object.groupedObjects ? collectObjectTree(object.groupedObjects) : [])])

const cloneObjectWithNewIds = (
  object: SvgObject,
  nextId: () => number,
  nextName: (name: string) => string,
  isRoot = true,
): SvgObject => {
  const name = nextName(object.name)
  return {
    ...object,
    id: nextId(),
    name,
    operationName: isRoot ? name : object.operationName,
    cut: { ...object.cut },
    ...(object.groupedObjects
      ? { groupedObjects: object.groupedObjects.map((member) => cloneObjectWithNewIds(member, nextId, nextName, false)) }
      : {}),
  }
}

export function useObjectClipboard({ objects, selectedObjects, stock, setProject, setSelectedIds }: UseObjectClipboardOptions) {
  const clipboard = useRef<SvgObject[]>([])
  const pasteCount = useRef(0)

  const copySelected = useCallback(() => {
    clipboard.current = selectedObjects.map(cloneObject)
    pasteCount.current = 0
  }, [selectedObjects])

  const pasteCopied = useCallback(() => {
    if (clipboard.current.length === 0) return

    const objectTree = collectObjectTree(objects)
    const usedIds = new Set(objectTree.map((object) => object.id))
    const usedNames = new Set(objectTree.map((object) => object.name))
    let nextId = objectTree.reduce((maxId, object) => Math.max(maxId, object.id), Date.now()) + 1
    const offset = (pasteCount.current + 1) * 10
    const allocateId = () => {
      while (usedIds.has(nextId)) nextId += 1
      const id = nextId
      usedIds.add(id)
      nextId += 1
      return id
    }
    const allocateName = (name: string) => {
      let nextName = name
      let counter = 1
      while (usedNames.has(nextName)) {
        nextName = `${name}-${counter}`
        counter += 1
      }
      usedNames.add(nextName)
      return nextName
    }
    const pastedObjects = clipboard.current.map((object) => {
      const pastedObject = cloneObjectWithNewIds(object, allocateId, allocateName)
      return {
        ...pastedObject,
        x: object.x + offset,
        y: object.y + offset,
      }
    })

    pasteCount.current += 1
    setProject({ stock, objects: [...objects, ...pastedObjects] })
    setSelectedIds(pastedObjects.map((object) => object.id))
  }, [objects, setProject, setSelectedIds, stock])

  return { copySelected, pasteCopied }
}
