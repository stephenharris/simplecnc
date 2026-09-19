import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import { Canvas } from './components/Canvas'
import { Header } from './components/Header'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { createGcodeZip } from './gcode/generator'
import { getSelectionBounds, rotateSelectionAroundPoint, scaleSelectionToBounds } from './utils/geometry'
import { createImportedObjects, extractPathSvgs } from './utils/svg'
import type { Point, Stock, SvgObject } from './types/cnc'

function App() {
  const [objects, setObjects] = useState<SvgObject[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [stock, setStock] = useState<Stock>({ width: 400, height: 300, depth: 12 })
  const [zoom, setZoom] = useState(100)
  const fileInput = useRef<HTMLInputElement>(null)
  const selectedObjects = objects.filter((object) => selectedIds.includes(object.id))

  const updateObject = (id: number, changes: Partial<SvgObject>) => {
    setObjects((current) => current.map((object) => {
      if (object.id !== id) return object

      const nextChanges = { ...changes }

      if (object.lockedProportions) {
        const aspectRatio = object.width > 0 && object.height > 0
          ? object.width / object.height
          : object.viewBoxWidth / object.viewBoxHeight
        if (nextChanges.width !== undefined) {
          nextChanges.height = nextChanges.width / aspectRatio
        } else if (nextChanges.height !== undefined) {
          nextChanges.width = nextChanges.height * aspectRatio
        }
      }

      return { ...object, ...nextChanges }
    }))
  }

  const updateSelected = (changes: Partial<SvgObject>) => {
    if (selectedIds.length === 0) return
    if (selectedIds.length === 1) {
      updateObject(selectedIds[0], changes)
      return
    }

    const group = getSelectionBounds(selectedObjects)
    const nextGroup = {
      x: changes.x ?? group.x,
      y: changes.y ?? group.y,
      width: changes.width ?? group.width,
      height: changes.height ?? group.height,
    }

    setObjects((current) => {
      let transformed = scaleSelectionToBounds(
        current.filter((object) => selectedIds.includes(object.id)),
        group,
        nextGroup,
      )

      if (changes.rotation !== undefined) {
        const rotationDelta = changes.rotation - selectedObjects[0].rotation
        const center = { x: group.x + group.width / 2, y: group.y + group.height / 2 }
        transformed = rotateSelectionAroundPoint(transformed, center, rotationDelta)
      }

      return current.map((object) => {
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
    })
  }

  const importFiles = (event: ChangeEvent<HTMLInputElement>) => {
    Array.from(event.target.files ?? []).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const imported = createImportedObjects(extractPathSvgs(String(reader.result)), file.name, stock.depth)
        setObjects((current) => [...current, ...imported])
        setSelectedIds(imported.map((object) => object.id))
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }

  const deleteSelected = () => {
    if (selectedIds.length === 0) return
    setObjects((current) => current.filter((object) => !selectedIds.includes(object.id)))
    setSelectedIds([])
  }

  const updateStock = (changes: Partial<Stock>) => {
    setStock((current) => ({ ...current, ...changes }))
    if (changes.depth !== undefined) {
      setObjects((current) => current.map((object) => ({ ...object, depth: Math.min(object.depth, changes.depth ?? object.depth) })))
    }
  }

  const updateStockPreset = (value: string) => {
    if (value === 'custom') return
    const [width, height] = value.split('x').map(Number)
    updateStock({ width, height })
  }

  const handleMove = (ids: number[], delta: Point, startPositions?: Record<number, Point>) => {
    setObjects((current) => current.map((object) => {
      if (!ids.includes(object.id)) return object

      const start = startPositions?.[object.id] ?? { x: object.x, y: object.y }
      return {
        ...object,
        x: start.x + delta.x,
        y: start.y + delta.y,
      }
    }))
  }

  const handleResize = (
    ids: number[],
    changes: Pick<SvgObject, 'width' | 'height' | 'x' | 'y'>,
    startBounds?: { x: number, y: number, width: number, height: number },
    startSelection?: SvgObject[],
  ) => {
    if (ids.length === 1) {
      updateObject(ids[0], changes)
      return
    }

    // If resizing multiple objects, we need to calculate the new bounds of the group and 
    // scale each object accordingly

    const selection = startSelection ?? objects.filter((object) => ids.includes(object.id))
    const sourceBounds = startBounds ?? getSelectionBounds(selection)
    const nextBounds = {
      x: changes.x ?? sourceBounds.x,
      y: changes.y ?? sourceBounds.y,
      width: changes.width ?? sourceBounds.width,
      height: changes.height ?? sourceBounds.height,
    }

    const resized = scaleSelectionToBounds(selection, sourceBounds, nextBounds)
    setObjects((current) => current.map((object) => {
      const match = resized.find((item) => item.id === object.id)
      return match && ids.includes(object.id) ? match : object
    }))
  }
  const downloadGcode = async () => {
    if (objects.length === 0) return
    const blob = await createGcodeZip(objects, stock)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'simplecnc-gcode.zip'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <Header onGenerateGCode={downloadGcode} />
      <div className="workspace">
        <LeftSidebar objects={objects} stock={stock} fileInput={fileInput} onImport={importFiles} onSelect={(id, additive) => {
          setSelectedIds((current) => {
            if (additive) {
              return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
            }
            return [id]
          })
        }} onStockChange={updateStock} onStockPreset={updateStockPreset} selectedIds={selectedIds} />
        <Canvas objects={objects} selectedIds={selectedIds} stock={stock} zoom={zoom} onZoomChange={setZoom} onSelect={(id, additive) => {
          setSelectedIds((current) => {
            if (additive) {
              return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
            }
            return [id]
          })
        }} onMove={handleMove} onResize={handleResize} />
        <RightSidebar selectedObjects={selectedObjects} stock={stock} onDelete={deleteSelected} onUpdate={updateSelected} />
      </div>
    </main>
  )
}

export default App
