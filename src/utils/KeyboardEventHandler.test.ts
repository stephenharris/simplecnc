import { describe, expect, it, vi } from 'vitest'
import { KeyboardEventHandler } from './KeyboardEventHandler'

const createKeyboardEvent = (
  key: string,
  options: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {},
) => {
  let defaultPrevented = false
  return {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    preventDefault: () => {
      defaultPrevented = true
    },
    get defaultPrevented() {
      return defaultPrevented
    },
  } as KeyboardEvent
}

describe('keyboard event handler', () => {
  it('dispatches Delete without requiring a modifier', () => {
    const onDelete = vi.fn()
    const handler = new KeyboardEventHandler({
      onCtrlC: vi.fn(),
      onCtrlV: vi.fn(),
      onDelete,
      onCtrlY: vi.fn(),
      onCtrlZ: vi.fn(),
    })
    const event = createKeyboardEvent('Delete')

    handler.handleKeyDown(event)

    expect(onDelete).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('dispatches copy, paste, undo, and redo shortcuts for Ctrl/Cmd modifiers', () => {
    const onCtrlC = vi.fn()
    const onCtrlV = vi.fn()
    const onCtrlY = vi.fn()
    const onCtrlZ = vi.fn()
    const handler = new KeyboardEventHandler({
      onCtrlC,
      onCtrlV,
      onDelete: vi.fn(),
      onCtrlY,
      onCtrlZ,
    })

    handler.handleKeyDown(createKeyboardEvent('c', { ctrlKey: true }))
    handler.handleKeyDown(createKeyboardEvent('v', { metaKey: true }))
    handler.handleKeyDown(createKeyboardEvent('z', { ctrlKey: true }))
    handler.handleKeyDown(createKeyboardEvent('y', { metaKey: true }))
    handler.handleKeyDown(createKeyboardEvent('z', { ctrlKey: true, shiftKey: true }))

    expect(onCtrlC).toHaveBeenCalledOnce()
    expect(onCtrlV).toHaveBeenCalledOnce()
    expect(onCtrlZ).toHaveBeenCalledOnce()
    expect(onCtrlY).toHaveBeenCalledTimes(2)
  })

  it('ignores unrelated keys and unmodified undo/redo keys', () => {
    const onCtrlC = vi.fn()
    const onCtrlV = vi.fn()
    const onDelete = vi.fn()
    const onCtrlY = vi.fn()
    const onCtrlZ = vi.fn()
    const handler = new KeyboardEventHandler({ onCtrlC, onCtrlV, onDelete, onCtrlY, onCtrlZ })

    handler.handleKeyDown(createKeyboardEvent('z'))
    handler.handleKeyDown(createKeyboardEvent('x', { ctrlKey: true }))

    expect(onCtrlC).not.toHaveBeenCalled()
    expect(onCtrlV).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
    expect(onCtrlY).not.toHaveBeenCalled()
    expect(onCtrlZ).not.toHaveBeenCalled()
  })
})
