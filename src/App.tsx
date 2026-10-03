import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import { Canvas } from './components/Canvas'
import { Header } from './components/Header'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { createGcodeZip } from './gcode/generator'
import { AxisAlignedBoundingBox, rotateSelectionAroundPoint } from './utils/geometry'
import { clearProjectFromStorage, deserializeProject, loadProjectFromStorage, saveProjectToStorage, serializeProject } from './utils/project'
import { createImportedObjects, extractPathSvgs } from './utils/svg'
import type { Point, Stock, SvgObject } from './types/cnc'

function App() {
  const defaultStock: Stock = { width: 400, height: 300, depth: 12 }
  const storedProject = loadProjectFromStorage()
  const [objects, setObjects] = useState<SvgObject[]>(storedProject?.objects ?? [])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [stock, setStock] = useState<Stock>(storedProject?.stock ?? defaultStock)
  const [zoom, setZoom] = useState(100)
  const fileInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const hasHydratedProject = useRef(false)
  const selectedObjects = objects.filter((object) => selectedIds.includes(object.id))

  useEffect(() => {
    if (!hasHydratedProject.current) {
      hasHydratedProject.current = true
      return
    }
    saveProjectToStorage({ stock, objects })
  }, [stock, objects])

  const updateSelected = (changes: Partial<SvgObject>) => {
    if (selectedIds.length === 0) return

    let axisAlignedBoundingBox = new AxisAlignedBoundingBox(selectedObjects);

    setObjects((current) => {

      let transformed = axisAlignedBoundingBox.transform({
        x: changes?.x,
        y: changes?.y,
        width: changes?.width,
        height: changes?.height,
      })

      if (changes.rotation !== undefined) {
        const rotationDelta = changes.rotation - selectedObjects[0].rotation
        const center = { 
          x: axisAlignedBoundingBox.getMinX() + axisAlignedBoundingBox.getWidth() / 2, 
          y: axisAlignedBoundingBox.getMinY() + axisAlignedBoundingBox.getHeight() / 2 
        }
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

  const saveProject = () => {
    const payload = serializeProject({ stock, objects })
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'simplecnc-project.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const newProject = () => {
    const emptyStock: Stock = { width: 400, height: 300, depth: 12 }
    setObjects([])
    setSelectedIds([])
    setStock(emptyStock)
    clearProjectFromStorage()
  }

  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const importedProject = deserializeProject(String(reader.result))
        setObjects(importedProject.objects)
        setStock(importedProject.stock)
        setSelectedIds([])
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not import that SimpleCNC project file.')
      }
    }
    reader.readAsText(file)
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
      <Header onGenerateGCode={downloadGcode} onImportProject={() => projectInput.current?.click()} onNewProject={newProject} onSaveProject={saveProject} />
      <input ref={projectInput} type="file" accept=".json,application/json" hidden onChange={importProject} />
      <div className="workspace">
        <LeftSidebar objects={objects} stock={stock} fileInput={fileInput} onImport={importFiles} onSelect={(id, additive) => {
          setSelectedIds((current) => {
            if (additive) {
              return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
            }
            return [id]
          })
        }} onStockChange={updateStock} onStockPreset={updateStockPreset} selectedIds={selectedIds} />
        <Canvas objects={objects} selectedIds={selectedIds} stock={stock} zoom={zoom} onZoomChange={setZoom} onUpdate={updateSelected} onSelect={(id, additive) => {
          setSelectedIds((current) => {
            if (additive) {
              return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
            }
            return [id]
          })
        }} onMove={handleMove}/>
        <RightSidebar selectedObjects={selectedObjects} stock={stock} onDelete={deleteSelected} onUpdate={updateSelected} />
      </div>
    </main>
  )
}

export default App
