import type { CutOperation, Stock, SvgObject } from '../types/cnc'
import './RightSidebar.css'

const operationLabels: Record<CutOperation, string> = {
  'cut-on-path': 'Cut on path',
  'cut-outside': 'Cut outside path',
  'cut-inside': 'Cut inside path',
  pocket: 'Pocket',
}

type RightSidebarProps = {
  selected: SvgObject | undefined
  stock: Stock
  onDelete: () => void
  onUpdate: (changes: Partial<SvgObject>) => void
}

export function RightSidebar({ selected, stock, onDelete, onUpdate }: RightSidebarProps) {
  return (
    <aside className="sidebar inspector">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">03 / INSPECTOR</span>
          <h2>Transform</h2>
        </div>
        <button className="delete-button" type="button" disabled={!selected} onClick={onDelete}>×</button>
      </div>

      {selected ? (
        <>
          <div className="selected-file">
            <span className="file-icon">⌁</span>
            <span>{selected.name}<small>SVG vector object</small></span>
          </div>
          <div className="inspector-section">
            <label className="operation-name-field">
              Operation name
              <input type="text" value={selected.operationName} onChange={(event) => onUpdate({ operationName: event.target.value })} />
              <small>Paths with the same name export together</small>
            </label>
            <div className="section-title">CUT OPERATION <span>PATH</span></div>
            <select className="operation-select" value={selected.operation} onChange={(event) => onUpdate({ operation: event.target.value as CutOperation })}>
              {Object.entries(operationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="depth-field">
              Depth
              <input type="number" min="0" max={stock.depth} step="0.1" value={selected.depth} onChange={(event) => onUpdate({ depth: Math.min(stock.depth, Math.max(0, Number(event.target.value))) })} />
              <small>Max {stock.depth} mm, based on stock material</small>
            </label>
          </div>
          <div className="inspector-section">
            <div className="section-title">POSITION <span>MM</span></div>
            <div className="field-grid">
              <label>X<input type="number" value={Math.round(selected.x)} onChange={(event) => onUpdate({ x: Number(event.target.value) })} /></label>
              <label>Y<input type="number" value={Math.round(selected.y)} onChange={(event) => onUpdate({ y: Number(event.target.value) })} /></label>
            </div>
          </div>
          <div className="inspector-section">
            <div className="section-title">SIZE <span>MM</span></div>
            <div className="field-grid">
              <label>Width<input type="number" value={Math.round(selected.width)} onChange={(event) => onUpdate({ width: Number(event.target.value) })} /></label>
              <label>Height<input type="number" value={Math.round(selected.height)} onChange={(event) => onUpdate({ height: Number(event.target.value) })} /></label>
            </div>
            <label className="toggle-row"><span>Lock proportions</span><input type="checkbox" defaultChecked /><i /></label>
          </div>
          <div className="inspector-section">
            <div className="section-title">ROTATION <span>DEGREES</span></div>
            <input className="wide-input" type="number" value={selected.rotation} onChange={(event) => onUpdate({ rotation: Number(event.target.value) })} />
          </div>
        </>
      ) : <p className="empty-state">Import an SVG to begin.</p>}

      <div className="inspector-note">
        <span>⌁</span>
        <p>Assign path operations now. Toolpath generation will use these settings in the next pass.</p>
      </div>
    </aside>
  )
}
