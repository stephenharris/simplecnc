import type { ChangeEvent, RefObject } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import './LeftSidebar.css'

type LeftSidebarProps = {
  objects: SvgObject[]
  stock: Stock
  fileInput: RefObject<HTMLInputElement | null>
  onImport: (event: ChangeEvent<HTMLInputElement>) => void
  onSelect: (id: number) => void
  onStockChange: (changes: Partial<Stock>) => void
  onStockPreset: (value: string) => void
  selectedId: number | null
}

export function LeftSidebar({ objects, stock, fileInput, onImport, onSelect, onStockChange, onStockPreset, selectedId }: LeftSidebarProps) {
  return (
    <aside className="sidebar left-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / INPUT</span>
          <h2>Objects</h2>
        </div>
        <span className="object-count">{objects.length.toString().padStart(2, '0')}</span>
      </div>

      <button className="import-button" type="button" onClick={() => fileInput.current?.click()}>
        <span>＋</span> Import SVG
      </button>
      <input id="svg-import-input" ref={fileInput} type="file" accept=".svg,image/svg+xml" multiple hidden onChange={onImport} />

    {objects.length > 0 && (    
      <div className="object-list">
        {objects.map((object, index) => (
          <button
            className={`object-row ${object.id === selectedId ? 'selected' : ''}`}
            key={object.id}
            type="button"
            onClick={() => onSelect(object.id)}
          >
            <span className="object-index">0{index + 1}</span>
            <span className="thumb"><img src={object.src} alt="" /></span>
            <span className="object-name">
              {object.name}
              <small>{object.width.toFixed(0)} × {object.height.toFixed(0)} mm</small>
            </span>
            <span className="visibility">◉</span>
          </button>
        ))}
      </div>
    )}
    
      <div className="sidebar-section">
        <span className="eyebrow">02 / STOCK</span>
        <label>
          Preset
          <select defaultValue="400x300" onChange={(event) => onStockPreset(event.target.value)}>
            <option value="400x300">Desktop 400 × 300</option>
            <option value="600x400">Large 600 × 400</option>
            <option value="custom">Custom dimensions</option>
          </select>
        </label>
        <div className="field-grid">
          <label>
            Width
            <input type="number" value={stock.width} onChange={(event) => onStockChange({ width: Number(event.target.value) })} />
          </label>
          <label>
            Height
            <input type="number" value={stock.height} onChange={(event) => onStockChange({ height: Number(event.target.value) })} />
          </label>
        </div>
        <label className="stock-depth">
          Material depth
          <input type="number" min="0" value={stock.depth} onChange={(event) => onStockChange({ depth: Math.max(0, Number(event.target.value)) })} />
          <small>Maximum cut depth for this stock</small>
        </label>
      </div>
    </aside>
  )
}
