import { useState } from 'react'
import type { CutOperation, Stock, SvgObject, SvgObjectUpdate } from '../types/cnc'
import { AxisAlignedBoundingBox } from '../utils/geometry'
import type { Alignment } from '../utils/geometry'
import { getTool, toolList } from '../utils/tools'
import './RightSidebar.css'
import { CommitInput } from './CommitInput'

const operationLabels: Record<CutOperation, string> = {
  'cut-on-path': 'Cut on path',
  'cut-outside': 'Cut outside path',
  'cut-inside': 'Cut inside path',
  pocket: 'Pocket',
}

type RightSidebarProps = {
  selectedObjects: SvgObject[]
  stock: Stock
  onDelete: () => void
  onUpdate: (changes: SvgObjectUpdate) => void
  onAlign: (alignment: Alignment) => void
}

export function RightSidebar({ selectedObjects, stock, onDelete, onUpdate, onAlign }: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'transform' | 'cut'>('transform')
  const selected = selectedObjects[0]
  const selectedTool = selected ? getTool(selected.cut.bitId) : undefined
  let axisAlignedBoundingBox = new AxisAlignedBoundingBox(selectedObjects);

  return (
    <aside className="sidebar inspector">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">03 / INSPECTOR</span>
          <h2>{selectedObjects.length > 1 ? 'Group' : 'Transform'}</h2>
        </div>
        {selectedObjects.length > 0 && (
          <button className="delete-button" type="button" aria-label="Delete selected object" title="Delete selected object" onClick={onDelete}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        )}
      </div>

      {selectedObjects.length > 0 ? (
        <>
          <div className="selected-file">
            <span className="file-icon">⌁</span>
            <span>{selectedObjects.length > 1 ? `${selectedObjects.length} objects selected` : selected.name}<small>{selectedObjects.length > 1 ? 'SVG vector group' : 'SVG vector object'}</small></span>
          </div>
          {selectedObjects.length === 1 && (
            <div className="inspector-tabs" role="tablist" aria-label="Object settings">
              <button className={activeTab === 'transform' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'transform'} onClick={() => setActiveTab('transform')}>Transform</button>
              <button className={activeTab === 'cut' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'cut'} onClick={() => setActiveTab('cut')}>Cut</button>
            </div>
          )}
          {(activeTab === 'transform' || selectedObjects.length > 1) ? (
            <div role="tabpanel" aria-label="Transform settings">
              {selectedObjects.length > 1 && (
                <div className="inspector-section alignment-section">
                  <div className="section-title">ALIGN OBJECTS</div>
                  <div className="alignment-controls">
                    <div role="group" aria-label="Horizontal alignment">
                      {(['left', 'center', 'right'] as const).map((alignment) => (
                        <button key={alignment} type="button" onClick={() => onAlign(alignment)}>
                          {alignment[0].toUpperCase() + alignment.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div role="group" aria-label="Vertical alignment">
                      {(['top', 'middle', 'bottom'] as const).map((alignment) => (
                        <button key={alignment} type="button" onClick={() => onAlign(alignment)}>
                          {alignment[0].toUpperCase() + alignment.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="inspector-section">
                <div className="section-title">POSITION <span>MM</span></div>
                <div className="field-grid">
                  <label>X<CommitInput type="number" value={String(Math.round(axisAlignedBoundingBox.getMinX() || 0))} onCommit={(value) => onUpdate({ x: Number(value) })} /></label>
                  <label>Y<CommitInput type="number" value={String(Math.round(axisAlignedBoundingBox.getMinY() || 0))} onCommit={(value) => onUpdate({ y: Number(value) })} /></label>
                </div>
              </div>
              <div className="inspector-section">
                <div className="section-title">SIZE <span>MM</span></div>
                <div className="field-grid">
                  <label>Width<CommitInput type="number" min={12} value={String(axisAlignedBoundingBox.getWidth().toFixed(3) || 0)} onCommit={(value) => onUpdate({ width: Number(value) })} /></label>
                  <label>Height<CommitInput type="number" min={12} value={String(axisAlignedBoundingBox.getHeight().toFixed(3) || 0)} onCommit={(value) => onUpdate({ height: Number(value) })} /></label>
                </div>
                {selected && <label className="toggle-row"><span>Lock proportions</span><input type="checkbox" checked={selected.lockedProportions} onChange={(event) => onUpdate({ lockedProportions: event.target.checked })} /><i /></label>}
              </div>
              {selected && <div className="inspector-section">
                <div className="section-title">ROTATION <span>DEGREES</span></div>
                <CommitInput className="wide-input" type="number" value={String(selected.rotation)} onCommit={(value) => onUpdate({ rotation: Number(value) })} />
              </div>}
            </div>
          ) : (
            <div role="tabpanel" aria-label="Cut settings">
              <div className="inspector-section">
                <label className="operation-name-field">
                  Operation name
                  <CommitInput type="text" value={selected.operationName} onCommit={(value) => onUpdate({ operationName: value })} />
                </label>
                <label className="operation-name-field">
                  Cut operation
                  <select className="operation-select" value={selected.cut.operation} onChange={(event) => onUpdate({ cut: { operation: event.target.value as CutOperation } })}>
                    {Object.entries(operationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="bit-field">
                  Bit
                  <select className="operation-select" value={selected.cut.bitId} onChange={(event) => onUpdate({ cut: { bitId: event.target.value } })}>
                    {toolList.map((tool) => <option key={tool.id} value={tool.id}>{tool.description} ({tool.diameter} mm)</option>)}
                  </select>
                  <small>Diameter {selectedTool?.diameter ?? toolList[0]?.diameter ?? 0} mm</small>
                </label>
                <label className="depth-field">
                  Cut Depth
                  <CommitInput type="number" min={0} max={stock.depth} step={0.1} value={String(selected.cut.depth)} onCommit={(value) => onUpdate({ cut: { depth: Math.min(stock.depth, Math.max(0, Number(value))) } })} />
                  <small>Max {stock.depth} mm, based on stock material</small>
                </label>

                <label className="depth-field">
                  Feed rate
                  <CommitInput type="number" min={1} step={1} value={String(selected.cut.feedRate)} onCommit={(value) => onUpdate({ cut: { feedRate: Math.max(1, Number(value)) } })} />
                  <small>mm/min</small>
                </label>

                <label className="depth-field">
                  Plunge rate
                  <CommitInput type="number" min={1} step={1} value={String(selected.cut.plungeRate)} onCommit={(value) => onUpdate({ cut: { plungeRate: Math.max(1, Number(value)) } })} />
                  <small>mm/min</small>
                </label>

                <label className="depth-field">
                  Depth per pass
                  <CommitInput type="number" min={0.1} max={stock.depth} step={0.1} value={String(selected.cut.depthPerPass)} onCommit={(value) => onUpdate({ cut: { depthPerPass: Math.min(stock.depth, Math.max(0.1, Number(value))) } })} />
                  <small>mm per pass</small>
                </label>

                {selected.cut.operation === 'pocket' && (
                  <label className="depth-field">
                    Step over
                    <CommitInput type="number" min={0.1} max={100} step={0.1} value={String(selected.cut.stepOver ?? 50)} onCommit={(value) => onUpdate({ cut: { stepOver: Math.min(100, Math.max(0.1, Number(value))) } })} />
                    <small>Percentage of bit diameter</small>
                  </label>
                )}

              </div>
            </div>
          )}
        </>
      ) : <p className="empty-state">Import an SVG to begin.</p>}

    </aside>
  )
}
