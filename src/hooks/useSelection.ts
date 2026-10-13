import { useCallback, useState } from 'react'
import { AxisAlignedBoundingBox, rotateSelectionAroundPoint } from '../utils/geometry'
import type { Alignment } from '../utils/geometry'
import type { Stock, SvgObject } from '../types/cnc'
import type { ProjectSnapshot } from '../utils/history'
import type { GridSnapSettings } from '../utils/grid'
import { snapToGrid } from '../utils/grid'

type UseSelectionOptions = {
  objects: SvgObject[]
  stock: Stock
  gridSnap: GridSnapSettings
  setProject: (project: ProjectSnapshot) => void
  updateProjectLive: (update: (current: ProjectSnapshot) => ProjectSnapshot) => void
}

export function useSelection({ objects, stock, gridSnap, setProject, updateProjectLive }: UseSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const selectedObjects = objects.filter((object) => selectedIds.includes(object.id))

  const select = useCallback((id: number, additive: boolean) => {
    setSelectedIds((current) => {
      if (additive) {
        return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
      }
      return [id]
    })
  }, [])

  const updateSelected = useCallback((changes: Partial<SvgObject>, live = false) => {
    if (selectedIds.length === 0) return

    const axisAlignedBoundingBox = new AxisAlignedBoundingBox(selectedObjects.map((object) => ({ ...object })))
    let transformed = axisAlignedBoundingBox.transform({
      x: changes.x,
      y: changes.y,
      width: changes.width,
      height: changes.height,
    })

    if (changes.rotation !== undefined) {
      const rotationDelta = changes.rotation - selectedObjects[0].rotation
      const center = {
        x: axisAlignedBoundingBox.getMinX() + axisAlignedBoundingBox.getWidth() / 2,
        y: axisAlignedBoundingBox.getMinY() + axisAlignedBoundingBox.getHeight() / 2,
      }
      transformed = rotateSelectionAroundPoint(transformed, center, rotationDelta)
    }

    let nextObjects = objects.map((object) => {
      if (!selectedIds.includes(object.id)) return object

      const nextObject = transformed.find((item) => item.id === object.id) ?? object

      if (changes.lockedProportions !== undefined) nextObject.lockedProportions = changes.lockedProportions
      if (changes.operationName !== undefined) nextObject.operationName = changes.operationName
      if (changes.operation !== undefined) nextObject.operation = changes.operation
      if (changes.bitId !== undefined) nextObject.bitId = changes.bitId
      if (changes.depth !== undefined) nextObject.depth = changes.depth

      if (nextObject.lockedProportions) {
        const aspectRatio = nextObject.width > 0 && nextObject.height > 0
          ? nextObject.width / nextObject.height
          : object.viewBoxWidth / object.viewBoxHeight
        if (changes.width !== undefined) {
          nextObject.height = nextObject.width / aspectRatio
        } else if (changes.height !== undefined) {
          nextObject.width = nextObject.height * aspectRatio
        }
      }

      return nextObject
    })

    if (gridSnap.enabled && (changes.x !== undefined || changes.y !== undefined || changes.width !== undefined || changes.height !== undefined || changes.rotation !== undefined)) {
      const selectedTransformed = nextObjects.filter((object) => selectedIds.includes(object.id))
      const transformedBounds = new AxisAlignedBoundingBox(selectedTransformed)
      const deltaX = snapToGrid(transformedBounds.getMinX(), gridSnap.spacing) - transformedBounds.getMinX()
      const deltaY = snapToGrid(transformedBounds.getMinY(), gridSnap.spacing) - transformedBounds.getMinY()
      nextObjects = nextObjects.map((object) => selectedIds.includes(object.id)
        ? { ...object, x: object.x + deltaX, y: object.y + deltaY }
        : object)
    }

    if (live) {
      updateProjectLive((current) => ({ stock: current.stock, objects: nextObjects }))
    } else {
      setProject({ stock, objects: nextObjects })
    }
  }, [gridSnap, objects, selectedIds, selectedObjects, setProject, stock, updateProjectLive])

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    setProject({ stock, objects: objects.filter((object) => !selectedIds.includes(object.id)) })
    setSelectedIds([])
  }, [objects, selectedIds, setProject, stock])

  const alignSelected = useCallback((alignment: Alignment) => {
    if (selectedObjects.length < 2) return

    let alignedObjects = new AxisAlignedBoundingBox(selectedObjects.map((object) => ({ ...object }))).align(alignment)
    if (gridSnap.enabled) {
      const alignedBounds = new AxisAlignedBoundingBox(alignedObjects)
      const deltaX = snapToGrid(alignedBounds.getMinX(), gridSnap.spacing) - alignedBounds.getMinX()
      const deltaY = snapToGrid(alignedBounds.getMinY(), gridSnap.spacing) - alignedBounds.getMinY()
      alignedObjects = alignedObjects.map((object) => ({ ...object, x: object.x + deltaX, y: object.y + deltaY }))
    }
    const alignedById = new Map(alignedObjects.map((object) => [object.id, object]))
    setProject({
      stock,
      objects: objects.map((object) => alignedById.get(object.id) ?? object),
    })
  }, [gridSnap, objects, selectedObjects, setProject, stock])

  return {
    selectedIds,
    selectedObjects,
    setSelectedIds,
    select,
    updateSelected,
    deleteSelected,
    alignSelected,
  }
}
