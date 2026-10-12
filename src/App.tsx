import { useRef, useState } from 'react'
import './App.css'
import { Canvas } from './components/Canvas'
import { Header } from './components/Header'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { useGcodeDownload } from './hooks/useGcodeDownload'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useObjectClipboard } from './hooks/useObjectClipboard'
import { useProject } from './hooks/useProject'
import { useProjectFiles } from './hooks/useProjectFiles'
import { useProjectPersistence } from './hooks/useProjectPersistence'
import { useSelection } from './hooks/useSelection'
import { useSvgImport } from './hooks/useSvgImport'
import { clearProjectFromStorage } from './utils/project'

function App() {
  const project = useProject()
  const selection = useSelection({
    objects: project.objects,
    stock: project.stock,
    setProject: project.setProject,
    updateProjectLive: project.updateProjectLive,
  })
  const { copySelected, pasteCopied } = useObjectClipboard({
    objects: project.objects,
    selectedObjects: selection.selectedObjects,
    stock: project.stock,
    setProject: project.setProject,
    setSelectedIds: selection.setSelectedIds,
  })
  const { saveProject, importProject } = useProjectFiles({
    stock: project.stock,
    objects: project.objects,
    setProject: project.setProject,
    clearSelection: () => selection.setSelectedIds([]),
  })
  const importSvgFiles = useSvgImport({
    stock: project.stock,
    appendObjects: project.appendObjects,
    setSelectedIds: selection.setSelectedIds,
  })
  const downloadGcode = useGcodeDownload(project.objects, project.stock)
  const [zoom, setZoom] = useState(100)
  const fileInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)

  useProjectPersistence(project.stock, project.objects)
  useKeyboardShortcuts({
    copySelected,
    pasteCopied,
    deleteSelected: selection.deleteSelected,
    undo: project.undo,
    redo: project.redo,
  })

  const newProject = () => {
    project.setProject({ stock: { width: 400, height: 300, depth: 12 }, objects: [] })
    selection.setSelectedIds([])
    clearProjectFromStorage()
  }

  return (
    <main className="app-shell">
      <Header
        onGenerateGCode={downloadGcode}
        onImportProject={() => projectInput.current?.click()}
        onNewProject={newProject}
        onSaveProject={saveProject}
        onUndo={project.undo}
        onRedo={project.redo}
        canUndo={project.history.past.length > 0}
        canRedo={project.history.future.length > 0}
      />
      <input ref={projectInput} type="file" accept=".json,application/json" hidden onChange={importProject} />
      <div className="workspace">
        <LeftSidebar
          objects={project.objects}
          stock={project.stock}
          fileInput={fileInput}
          onImport={importSvgFiles}
          onSelect={selection.select}
          onStockChange={project.updateStock}
          onStockPreset={project.updateStockPreset}
          selectedIds={selection.selectedIds}
        />
        <Canvas
          objects={project.objects}
          selectedIds={selection.selectedIds}
          stock={project.stock}
          zoom={zoom}
          onZoomChange={setZoom}
          onUpdate={selection.updateSelected}
          onSelect={selection.select}
          onGestureStart={project.beginGesture}
          onMove={project.moveObjects}
          onGestureEnd={project.endGesture}
        />
        <RightSidebar
          selectedObjects={selection.selectedObjects}
          stock={project.stock}
          onDelete={selection.deleteSelected}
          onUpdate={selection.updateSelected}
          onAlign={selection.alignSelected}
        />
      </div>
    </main>
  )
}

export default App
