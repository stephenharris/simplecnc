import type { PointerEvent } from 'react'
import type { Point, Stock, SvgObject } from '../types/cnc'
import './Canvas.css'

type CanvasProps = {
  objects: SvgObject[]
  selectedId: number | null
  stock: Stock
  zoom: number
  onZoomChange: (zoom: number) => void
  onSelect: (id: number) => void
  onMove: (id: number, point: Point) => void
  onResize: (id: number, changes: Pick<SvgObject, 'width' | 'height' | 'x' | 'y'>) => void
}

export function Canvas({ objects, selectedId, stock, zoom, onZoomChange, onSelect, onMove, onResize }: CanvasProps) {
  const beginDrag = (event: PointerEvent<HTMLDivElement>, object: SvgObject) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startY = event.clientY
    const initialX = object.x
    const initialY = object.y
    const rect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    const move = (moveEvent: globalThis.PointerEvent) => onMove(object.id, {
      x: initialX + ((moveEvent.clientX - startX) / rect.width) * stock.width,
      y: initialY - ((moveEvent.clientY - startY) / rect.height) * stock.height
    })
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
    const startWidth = object.width
    const startHeight = object.height
    const startObjectX = object.x
    const startObjectY = object.y
    const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!rect || startWidth <= 0 || startHeight <= 0) return
    const move = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * stock.width
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * stock.height
      const resizeFromLeft = corner.includes('l')
      const resizeFromTop = corner.includes('t')
      const aspectRatio = startWidth / startHeight
      const width = Math.max(12, startWidth + (resizeFromLeft ? -deltaX : deltaX))
      const height = Math.max(12, startHeight + (resizeFromTop ? -deltaY : deltaY))
      const lockedScale = Math.max(
        0.12,
        Math.max(width / startWidth, height / startHeight),
      )
      const resizedWidth = object.lockedProportions ? Math.max(12, startWidth * lockedScale) : width
      const resizedHeight = object.lockedProportions ? Math.max(12, resizedWidth / aspectRatio) : height
      onResize(object.id, {
        width: resizedWidth,
        height: resizedHeight,
        x: resizeFromLeft ? startObjectX + startWidth - resizedWidth : startObjectX,
        y: resizeFromTop ? startObjectY : startObjectY + startHeight - resizedHeight,
      })
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
                className={`canvas-object ${object.id === selectedId ? 'active' : ''}`}
                onPointerDown={(event) => { onSelect(object.id); beginDrag(event, object) }}
                style={{ left: `${object.x / stock.width * 100}%`, bottom: `${object.y / stock.height * 100}%`, width: `${object.width / stock.width * 100}%`, height: `${object.height / stock.height * 100}%`, transform: `rotate(${object.rotation}deg)` }}
              >
                <img
                  src={object.src}
                  alt={object.name}
                  style={object.sourceViewBoxWidth && object.pathBoundsWidth ? {
                    position: 'absolute',
                    width: `${object.sourceViewBoxWidth / object.pathBoundsWidth * 100}%`,
                    height: `${(object.sourceViewBoxHeight ?? object.sourceViewBoxWidth) / (object.pathBoundsHeight ?? object.pathBoundsWidth) * 100}%`,
                    left: `${-((object.pathBoundsX ?? 0) - (object.sourceViewBoxX ?? 0)) / object.pathBoundsWidth * 100}%`,
                    top: `${-((object.pathBoundsY ?? 0) - (object.sourceViewBoxY ?? 0)) / (object.pathBoundsHeight ?? object.pathBoundsWidth) * 100}%`,
                  } : undefined}
                />
                {object.id === selectedId && <>
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
