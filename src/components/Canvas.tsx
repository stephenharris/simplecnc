import type { PointerEvent } from 'react'
import type { Point, Stock, SvgObject } from '../types/cnc'
import './Canvas.css'

type CanvasProps = {
  objects: SvgObject[]
  selectedIds: number[]
  stock: Stock
  zoom: number
  onZoomChange: (zoom: number) => void
  onSelect: (id: number, additive: boolean) => void
  onMove: (ids: number[], delta: Point, startPositions?: Record<number, Point>) => void
  onResize: (
    ids: number[],
    changes: Pick<SvgObject, 'width' | 'height' | 'x' | 'y'>,
    startBounds?: { x: number, y: number, width: number, height: number },
    startSelection?: SvgObject[],
  ) => void
}

export function Canvas({ objects, selectedIds, stock, zoom, onZoomChange, onSelect, onMove, onResize }: CanvasProps) {
  const beginDrag = (event: PointerEvent<HTMLDivElement>, object: SvgObject) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startY = event.clientY
    const rect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    const ids = selectedIds.includes(object.id) ? selectedIds : [object.id]
    const startPositions = Object.fromEntries(
      objects.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }]),
    ) as Record<number, Point>
    const move = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * stock.width
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * stock.height
      onMove(ids, { x: deltaX, y: -deltaY }, startPositions)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  const beginResize = (event: PointerEvent<HTMLElement>, object: SvgObject, corner: string) => {
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!rect) return

    const ids = selectedIds.length > 0 ? selectedIds : [object.id]
    const selectedObjects = objects.filter((item) => ids.includes(item.id))
    const group = selectedObjects.reduce((bounds, item) => {
      const left = Math.min(bounds.x, item.x)
      const bottom = Math.min(bounds.y, item.y)
      const right = Math.max(bounds.x + bounds.width, item.x + item.width)
      const top = Math.max(bounds.y + bounds.height, item.y + item.height)
      return { x: left, y: bottom, width: right - left, height: top - bottom }
    }, { x: selectedObjects[0].x, y: selectedObjects[0].y, width: 0, height: 0 })
    
    const startSelection = selectedObjects.map((item) => ({ ...item }))
    const startBounds = {
      x: Number.isFinite(group.x) ? group.x : 0,
      y: Number.isFinite(group.y) ? group.y : 0,
      width: Math.max(0.001, group.width),
      height: Math.max(0.001, group.height),
    }
    const move = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * stock.width
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * stock.height
      const resizeFromRight = corner.includes('r')
      const resizeFromTop = corner.includes('t')

      // New width is the delta of the x-axis movement, adjsuted for direction
      // New height is similiar, if locked proportions we calculate it based on the new width.
      let height = Math.max(12, startBounds.height + (resizeFromTop ? -deltaY : deltaY));
      const width = Math.max(12, startBounds.width + (resizeFromRight ? deltaX : -deltaX));
      const lockedProportions = selectedObjects.some((item) => item.lockedProportions);
  
      if (lockedProportions) {
        const aspectRatio = startBounds.width / startBounds.height;
        height = width / aspectRatio;
      }
      
      // The corner opposite the one being dragged is the anchor point, so we we may need to calculate
      // the new co-ordinates of the lower-left corner of the selection based on the new width and height.
      const nextX = resizeFromRight ? startBounds.x : startBounds.x + (startBounds.width - width)
      const nextY = resizeFromTop ? startBounds.y : startBounds.y + (startBounds.height - height)

      const nextObject = {
        width,
        height,
        x: nextX,
        y: nextY,
      }
      onResize(ids, nextObject, startBounds, startSelection)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  return (
    <section className="canvas-area">
      <div className="canvas-toolbar">
        <div className="zoom-control">
          <button type="button" onClick={() => onZoomChange(Math.max(50, zoom - 10))}>−</button>
          <span>{zoom}%</span>
          <button type="button" onClick={() => onZoomChange(Math.min(150, zoom + 10))}>＋</button>
          <button className="fit-button" type="button" onClick={() => onZoomChange(100)}>Fit</button>
        </div>
      </div>

      <div className="canvas-scroll">
        <div className="workbench" style={{ width: `${Math.min(760, stock.width * 1.45) * zoom / 100}px`, aspectRatio: `${stock.width} / ${stock.height}` }}>
          <div className="stock-label">STOCK / {stock.width} × {stock.height} MM</div>
          <div className="stock-surface">
            {[...Array(9)].map((_, index) => <span key={index} className="grid-line" style={{ left: `${(index + 1) * 10}%` }} />)}
            {[...Array(5)].map((_, index) => <span key={index} className="grid-line horizontal" style={{ bottom: `${(index + 1) * 16.666}%` }} />)}
            {objects.map((object) => (
              <div
                key={object.id}
                className={`canvas-object ${selectedIds.includes(object.id) ? 'active' : ''}`}
                onPointerDown={(event) => {
                  const additive = event.shiftKey || event.metaKey || event.ctrlKey
                  onSelect(object.id, additive)
                  beginDrag(event, object)
                }}
                style={{ left: `${object.x / stock.width * 100}%`, bottom: `${object.y / stock.height * 100}%`, width: `${object.width / stock.width * 100}%`, height: `${object.height / stock.height * 100}%`, transform: `rotate(${-object.rotation}deg)` }}
              >
                <img
                  src={object.src}
                  alt={object.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
                {selectedIds.includes(object.id) && <>
                  <i className="handle tl" onPointerDown={(event) => beginResize(event, object, 'tl')} />
                  <i className="handle tr" onPointerDown={(event) => beginResize(event, object, 'tr')} />
                  <i className="handle bl" onPointerDown={(event) => beginResize(event, object, 'bl')} />
                  <i className="handle br" onPointerDown={(event) => beginResize(event, object, 'br')} />
                </>}
              </div>
            ))}
          </div>
          <span className="axis-x">X 0 <b>{stock.width / 2}</b> {stock.width} mm</span>
          <span className="axis-y">Y {stock.height}<b>{stock.height / 2}</b>0</span>
        </div>
      </div>

    </section>
  )
}
