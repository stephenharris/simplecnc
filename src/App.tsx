import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import { Canvas } from './components/Canvas'
import { Header } from './components/Header'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { createGcodeZip } from './gcode/generator'
import { createImportedObjects, extractPathSvgs } from './utils/svg'
import type { Point, Stock, SvgObject } from './types/cnc'

function App() {
  const [objects, setObjects] = useState<SvgObject[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [stock, setStock] = useState<Stock>({ width: 400, height: 300, depth: 12 })
  const [zoom, setZoom] = useState(100)
  const fileInput = useRef<HTMLInputElement>(null)
  const selected = objects.find((object) => object.id === selectedId)

  const updateObject = (id: number, changes: Partial<SvgObject>) => {
    setObjects((current) => current.map((object) => object.id === id ? { ...object, ...changes } : object))
  }

  const updateSelected = (changes: Partial<SvgObject>) => {
    if (selectedId !== null) updateObject(selectedId, changes)
  }

  const importFiles = (event: ChangeEvent<HTMLInputElement>) => {
    Array.from(event.target.files ?? []).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const imported = createImportedObjects(extractPathSvgs(String(reader.result)), file.name, stock.depth)
        setObjects((current) => [...current, ...imported])
        setSelectedId(imported[imported.length - 1]?.id ?? null)
      }
      reader.readAsText(file)
    })
    event.target.value = ''
  }

  const deleteSelected = () => {
    if (selectedId === null) return
    setObjects((current) => current.filter((object) => object.id !== selectedId))
    setSelectedId(null)
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

  const handleMove = (id: number, point: Point) => updateObject(id, point)
  const handleResize = (id: number, changes: Pick<SvgObject, 'width' | 'height' | 'x' | 'y'>) => updateObject(id, changes)
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
        <LeftSidebar objects={objects} stock={stock} fileInput={fileInput} onImport={importFiles} onSelect={setSelectedId} onStockChange={updateStock} onStockPreset={updateStockPreset} selectedId={selectedId} />
        <Canvas objects={objects} selectedId={selectedId} stock={stock} zoom={zoom} onZoomChange={setZoom} onSelect={setSelectedId} onMove={handleMove} onResize={handleResize} />
        <RightSidebar selected={selected} stock={stock} onDelete={deleteSelected} onUpdate={updateSelected} />
      </div>
    </main>
  )
}

export default App
