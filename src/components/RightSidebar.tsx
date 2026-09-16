import { useState } from 'react'
import type { CutOperation, Stock, SvgObject } from '../types/cnc'
import bits from '../data/bits.json'
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
  const [activeTab, setActiveTab] = useState<'transform' | 'cut'>('transform')

  return (
    <aside className="sidebar inspector">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">03 / INSPECTOR</span>
          <h2>Transform</h2>
        </div>
        {selected && (
          <button className="delete-button" type="button" aria-label="Delete selected object" title="Delete selected object" onClick={onDelete}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        )}
      </div>

      {selected ? (
        <>
          <div className="selected-file">
            <span className="file-icon">⌁</span>
            <span>{selected.name}<small>SVG vector object</small></span>
          </div>
          <div className="inspector-tabs" role="tablist" aria-label="Object settings">
            <button className={activeTab === 'transform' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'transform'} onClick={() => setActiveTab('transform')}>Transform</button>
            <button className={activeTab === 'cut' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'cut'} onClick={() => setActiveTab('cut')}>Cut</button>
          </div>
          {activeTab === 'transform' ? (
            <div role="tabpanel" aria-label="Transform settings">
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
                  <label>Width<input type="number" min="12" step="0.1" value={selected.width} onChange={(event) => onUpdate({ width: Number(event.target.value) })} /></label>
                  <label>Height<input type="number" min="12" step="0.1" value={selected.height} onChange={(event) => onUpdate({ height: Number(event.target.value) })} /></label>
                </div>
                <label className="toggle-row"><span>Lock proportions</span><input type="checkbox" checked={selected.lockedProportions} onChange={(event) => onUpdate({ lockedProportions: event.target.checked })} /><i /></label>
              </div>
              <div className="inspector-section">
                <div className="section-title">ROTATION <span>DEGREES</span></div>
                <input className="wide-input" type="number" value={selected.rotation} onChange={(event) => onUpdate({ rotation: Number(event.target.value) })} />
              </div>
            </div>
          ) : (
            <div role="tabpanel" aria-label="Cut settings">
              <div className="inspector-section">
                <label className="operation-name-field">
                  Operation name
                  <input type="text" value={selected.operationName} onChange={(event) => onUpdate({ operationName: event.target.value })} />
                  <small>Each object exports as its own file</small>
                </label>
                <div className="section-title">CUT OPERATION <span>PATH</span></div>
                <select className="operation-select" value={selected.operation} onChange={(event) => onUpdate({ operation: event.target.value as CutOperation })}>
                  {Object.entries(operationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label className="bit-field">
                  Bit
                  <select className="operation-select" value={selected.bitId} onChange={(event) => onUpdate({ bitId: event.target.value })}>
                    {bits.map((bit) => <option key={bit.id} value={bit.id}>{bit.name} ({bit.type}, {bit.diameterMm} mm)</option>)}
                  </select>
                  <small>Diameter {bits.find((bit) => bit.id === selected.bitId)?.diameterMm ?? bits[0].diameterMm} mm</small>
                </label>
                <label className="depth-field">
                  Depth
                  <input type="number" min="0" max={stock.depth} step="0.1" value={selected.depth} onChange={(event) => onUpdate({ depth: Math.min(stock.depth, Math.max(0, Number(event.target.value))) })} />
                  <small>Max {stock.depth} mm, based on stock material</small>
                </label>
              </div>
            </div>
          )}
        </>
      ) : <p className="empty-state">Import an SVG to begin.</p>}

    </aside>
  )
}
