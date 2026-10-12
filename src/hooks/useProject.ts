import { useCallback, useRef, useState } from 'react'
import { commitHistory, cloneProjectSnapshot, createHistoryState, pushHistory, redoHistory, replacePresent, undoHistory } from '../utils/history'
import type { HistoryState, ProjectSnapshot } from '../utils/history'
import { loadProjectFromStorage } from '../utils/project'
import type { Point, Stock, SvgObject } from '../types/cnc'

const defaultStock: Stock = { width: 400, height: 300, depth: 12 }

const loadInitialProject = (): ProjectSnapshot => {
  const storedProject = loadProjectFromStorage()
  return {
    stock: storedProject?.stock ?? defaultStock,
    objects: storedProject?.objects ?? [],
  }
}

export function useProject() {
  const [history, setHistory] = useState<HistoryState>(() => createHistoryState(loadInitialProject()))
  const dragStartProject = useRef<ProjectSnapshot | null>(null)
  const { objects, stock } = history.present

  const setProject = useCallback((nextProject: ProjectSnapshot) => {
    setHistory((current) => pushHistory(current, nextProject))
  }, [])

  const appendObjects = useCallback((newObjects: SvgObject[]) => {
    if (newObjects.length === 0) return
    setHistory((current) => pushHistory(current, {
      stock: current.present.stock,
      objects: [...current.present.objects, ...newObjects],
    }))
  }, [])

  const updateProjectLive = useCallback((update: (current: ProjectSnapshot) => ProjectSnapshot) => {
    setHistory((current) => replacePresent(current, update(current.present)))
  }, [])

  const undo = useCallback(() => setHistory((current) => undoHistory(current)), [])
  const redo = useCallback(() => setHistory((current) => redoHistory(current)), [])

  const beginGesture = useCallback(() => {
    dragStartProject.current = cloneProjectSnapshot(history.present)
  }, [history.present])

  const endGesture = useCallback(() => {
    const startProject = dragStartProject.current
    dragStartProject.current = null
    if (!startProject) return
    setHistory((current) => commitHistory(current, startProject, current.present))
  }, [])

  const updateStock = useCallback((changes: Partial<Stock>) => {
    const nextStock = { ...stock, ...changes }
    const nextObjects = changes.depth !== undefined
      ? objects.map((object) => ({ ...object, depth: Math.min(object.depth, nextStock.depth) }))
      : objects
    setProject({ stock: nextStock, objects: nextObjects })
  }, [objects, setProject, stock])

  const updateStockPreset = useCallback((value: string) => {
    if (value === 'custom') return
    const [width, height] = value.split('x').map(Number)
    updateStock({ width, height })
  }, [updateStock])

  const moveObjects = useCallback((ids: number[], delta: Point, startPositions?: Record<number, Point>) => {
    updateProjectLive((current) => ({
      stock: current.stock,
      objects: current.objects.map((object) => {
        if (!ids.includes(object.id)) return object

        const start = startPositions?.[object.id] ?? { x: object.x, y: object.y }
        return {
          ...object,
          x: start.x + delta.x,
          y: start.y + delta.y,
        }
      }),
    }))
  }, [updateProjectLive])

  return {
    history,
    objects,
    stock,
    setProject,
    appendObjects,
    updateProjectLive,
    undo,
    redo,
    beginGesture,
    endGesture,
    updateStock,
    updateStockPreset,
    moveObjects,
  }
}
