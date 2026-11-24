import './Header.css'

type HeaderProps = {
  title: string
  onTitleChange: (title: string) => void
  onGenerateGCode: () => void
  onExportProject: () => void
  onImportProject: () => void
  onNewProject: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function Header({ title, onTitleChange, onGenerateGCode, onExportProject, onImportProject, onNewProject, onUndo, onRedo, canUndo, canRedo }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">⌁</span>
        <span>
          <strong>SimpleCNC</strong>
        </span>
      </div>

      <input
        className="project-title-input"
        type="text"
        aria-label="Project title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />

      <div className="header-actions">
        <button className="secondary-button" type="button" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button className="secondary-button" type="button" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        <button className="secondary-button" type="button" onClick={onNewProject}>
          New project
        </button>
        <button className="secondary-button" type="button" onClick={onImportProject}>
          Import project
        </button>
        <button className="secondary-button" type="button" onClick={onExportProject}>
          Export project
        </button>
        <button className="export-button" type="button" onClick={onGenerateGCode}>
          Generate G-code <span>→</span>
        </button>
      </div>
    </header>
  )
}
