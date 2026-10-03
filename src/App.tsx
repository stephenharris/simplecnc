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
import { cloneProjectSnapshot, commitHistory, createHistoryState, pushHistory, redoHistory, replacePresent, undoHistory } from './utils/history'
import { createImportedObjects, extractPathSvgs } from './utils/svg'
import type { Point, Stock, SvgObject } from './types/cnc'
import type { ProjectSnapshot } from './utils/history'

function App() {
  const defaultStock: Stock = { width: 400, height: 300, depth: 12 }
  const storedProject = loadProjectFromStorage()
  const initialProject = { stock: storedProject?.stock ?? defaultStock, objects: storedProject?.objects ?? [] }
  const [history, setHistory] = useState(() => createHistoryState(initialProject))
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [zoom, setZoom] = useState(100)
  const fileInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const dragStartProject = useRef<ProjectSnapshot | null>(null)
  const hasHydratedProject = useRef(false)
  const objects = history.present.objects
  const stock = history.present.stock
  
  const selectedObjects = objects.filter((object) => selectedIds.includes(object.id))

  useEffect(() => {
    if (!hasHydratedProject.current) {
      hasHydratedProject.current = true
      return
    }
    saveProjectToStorage({ stock, objects })
  }, [stock, objects])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if(event.key.toLocaleLowerCase() === 'delete') {
        event.preventDefault();
        deleteSelected();
        return;
      }

      const modifierPressed = event.metaKey || event.ctrlKey
      if (!modifierPressed) return
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        setHistory((current) => undoHistory(current))
      }
      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        setHistory((current) => redoHistory(current))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIds])

  const updateSelected = (changes: Partial<SvgObject>, live = false) => {
    if (selectedIds.length === 0) return

    const axisAlignedBoundingBox = new AxisAlignedBoundingBox(
      selectedObjects.map((object) => ({ ...object })),
    )

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
          y: axisAlignedBoundingBox.getMinY() + axisAlignedBoundingBox.getHeight() / 2,
        }
        transformed = rotateSelectionAroundPoint(transformed, center, rotationDelta)
      }

      const nextObjects = objects.map((object) => {
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

    if (live) {
      setHistory((current) => replacePresent(current, { stock: current.present.stock, objects: nextObjects }))
    } else {
      setProject({ stock, objects: nextObjects })
    }
  }

  const importFiles = (event: ChangeEvent<HTMLInputElement>) => {
    Array.from(event.target.files ?? []).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const imported = createImportedObjects(extractPathSvgs(String(reader.result)), file.name, stock.depth)
        setProject({ stock, objects: [...objects, ...imported] })
        setSelectedIds(imported.map((object) => object.id))
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }

  const setProject = (nextProject: { stock: Stock, objects: SvgObject[] }) => {
    setHistory((current) => pushHistory(current, nextProject))
  }

  const beginGesture = () => {
    dragStartProject.current = cloneProjectSnapshot(history.present)
  }

  const endGesture = () => {
    const startProject = dragStartProject.current
    dragStartProject.current = null
    if (!startProject) return
    setHistory((current) => commitHistory(current, startProject, current.present))
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
    setProject({ stock: emptyStock, objects: [] })
    setSelectedIds([])
    clearProjectFromStorage()
  }

  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const importedProject = deserializeProject(String(reader.result))
        setProject({ stock: importedProject.stock, objects: importedProject.objects })
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
    setProject({ stock, objects: objects.filter((object) => !selectedIds.includes(object.id)) })
    setSelectedIds([])
  }

  const updateStock = (changes: Partial<Stock>) => {
    const nextStock = { ...stock, ...changes }
    const nextObjects = changes.depth !== undefined
      ? objects.map((object) => ({ ...object, depth: Math.min(object.depth, nextStock.depth) }))
      : objects
    setProject({ stock: nextStock, objects: nextObjects })
  }

  const updateStockPreset = (value: string) => {
    if (value === 'custom') return
    const [width, height] = value.split('x').map(Number)
    updateStock({ width, height })
  }

  const handleMove = (ids: number[], delta: Point, startPositions?: Record<number, Point>) => {
    setHistory((current) => {
      const nextObjects = current.present.objects.map((object) => {
        if (!ids.includes(object.id)) return object

        const start = startPositions?.[object.id] ?? { x: object.x, y: object.y }
        return {
          ...object,
          x: start.x + delta.x,
          y: start.y + delta.y,
        }
      })
      return replacePresent(current, { stock: current.present.stock, objects: nextObjects })
    })
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
      <Header
        onGenerateGCode={downloadGcode}
        onImportProject={() => projectInput.current?.click()}
        onNewProject={newProject}
        onSaveProject={saveProject}
        onUndo={() => setHistory((current) => undoHistory(current))}
        onRedo={() => setHistory((current) => redoHistory(current))}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
      />
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
        }} onGestureStart={beginGesture} onMove={handleMove} onGestureEnd={endGesture}/>
        <RightSidebar selectedObjects={selectedObjects} stock={stock} onDelete={deleteSelected} onUpdate={updateSelected} />
      </div>
    </main>
  )
}

export default App
