import { useRef, type PointerEvent } from 'react'
import type { Point, Stock, SvgObject } from '../types/cnc'
import './Canvas.css'
import { AxisAlignedBoundingBox } from '../utils/geometry'
import { getDepthColor } from '../utils/color'

type CanvasProps = {
  objects: SvgObject[]
  selectedIds: number[]
  stock: Stock
  zoom: number
  onZoomChange: (zoom: number) => void
  onSelect: (id: number, additive: boolean) => void
  onGestureStart: () => void
  onMove: (ids: number[], delta: Point, startPositions?: Record<number, Point>) => void
  onGestureEnd: () => void
  onUpdate: (changes: Partial<SvgObject>, live?: boolean) => void
}

export function Canvas({ objects, selectedIds, stock, zoom, onZoomChange, onSelect, onGestureStart, onMove, onGestureEnd, onUpdate }: CanvasProps) {

  const selectedObjects = objects.filter((item) => selectedIds.includes(item.id))
  const axisAlignedBox = new AxisAlignedBoundingBox(selectedObjects);
  const lockedProportions = selectedObjects.some((item) => item.lockedProportions);
  const hasDragged = useRef(false)


  const beginDrag = (event: PointerEvent<HTMLDivElement>, object: SvgObject) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    hasDragged.current = false
    const startX = event.clientX
    const startY = event.clientY
    const rect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    const ids = selectedIds.includes(object.id) ? selectedIds : [object.id]
    const startPositions = Object.fromEntries(
      objects.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }]),
    ) as Record<number, Point>
    onGestureStart()
    let hasMoved = false
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (!hasMoved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <= 3) return
      hasMoved = true
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * stock.width
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * stock.height
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 3) {
        hasDragged.current = true
      }
      onMove(ids, { x: deltaX, y: -deltaY }, startPositions)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      onGestureEnd()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const beginResize = (event: PointerEvent<HTMLElement>, corner: string) => {
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const stockDom = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!stockDom) return
    onGestureStart()

    const startBounds = {
      x: Number.isFinite(axisAlignedBox.getMinX()) ? axisAlignedBox.getMinX() : 0,
      y: Number.isFinite(axisAlignedBox.getMinY()) ? axisAlignedBox.getMinY() : 0,
      width: Math.max(0.001, axisAlignedBox.getWidth()),
      height: Math.max(0.001, axisAlignedBox.getHeight()),
    }
    const move = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / stockDom.width) * stock.width
      const deltaY = ((moveEvent.clientY - startY) / stockDom.height) * stock.height
      const resizeFromRight = corner.includes('r')
      const resizeFromTop = corner.includes('t')

      // New width is the delta of the x-axis movement, adjsuted for direction
      // New height is similiar, if locked proportions we calculate it based on the new width.
      let height = Math.max(12, startBounds.height + (resizeFromTop ? -deltaY : deltaY));
      const width = Math.max(12, startBounds.width + (resizeFromRight ? deltaX : -deltaX));
      
      if (lockedProportions) {
        const aspectRatio = startBounds.width / startBounds.height;
        height = width / aspectRatio;
      }
      
      // The corner opposite the one being dragged is the anchor point, so we we may need to calculate
      // the new co-ordinates of the lower-left corner of the selection based on the new width and height.
      const nextX = resizeFromRight ? startBounds.x : startBounds.x + (startBounds.width - width)
      const nextY = resizeFromTop ? startBounds.y : startBounds.y + (startBounds.height - height)

      const changes = {
        width,
        height,
        x: nextX,
        y: nextY,
      }
      
      onUpdate(changes, true)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      onGestureEnd()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
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
            
            {selectedIds.length > 0 && <div 
              className='axis-aligned-selection-box'
              style={{
                left: `${axisAlignedBox.getMinX() / stock.width * 100}%`,
                bottom: `${axisAlignedBox.getMinY() / stock.height * 100}%`,
                width: `${axisAlignedBox.getWidth() / stock.width * 100}%`, 
                height: `${axisAlignedBox.getHeight() / stock.height * 100}%`
              }}
            >
                  <i className="handle tl" onPointerDown={(event) => beginResize(event, 'tl')} />
                  <i className="handle tr" onPointerDown={(event) => beginResize(event, 'tr')} />
                  <i className="handle bl" onPointerDown={(event) => beginResize(event, 'bl')} />
                  <i className="handle br" onPointerDown={(event) => beginResize(event, 'br')} />
              </div>}
            
            {objects.map((object) => (
              <div
                key={object.id}
                className={`canvas-object ${selectedIds.includes(object.id) ? 'active' : ''}`}
                onPointerDown={(event) => {
                  const additive = event.shiftKey || event.metaKey || event.ctrlKey
                  console.log('onPointerDown', object.id, additive, 'beginDrag');
                  //onSelect(object.id, additive)
                  beginDrag(event, object)
                }}
                onPointerUp={(event) => {
                  if (!hasDragged.current) {
                    const additive = event.shiftKey || event.metaKey || event.ctrlKey
                    onSelect(object.id, additive)
                  }
                }}
                style={{ 
                  color: object.operation === 'pocket' ? getDepthColor(object.depth, stock.depth) : 'transparent',
                  left: `${object.x / stock.width * 100}%`, 
                  bottom: `${object.y / stock.height * 100}%`, 
                  width: `${object.width / stock.width * 100}%`, 
                  height: `${object.height / stock.height * 100}%`, 
                  transform: `rotate(${-object.rotation}deg)`,
               }}
              >
                <div
                  className={`operation-${object.operation}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                  dangerouslySetInnerHTML={{ __html: object.svg }}
                />

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
