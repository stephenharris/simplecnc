import { describe, expect, it } from 'vitest'
import { createHistoryState, pushHistory, redoHistory, undoHistory } from './history'

describe('history state', () => {
  it('can undo and redo project snapshots', () => {
    const initial = {
      stock: { width: 400, height: 300, depth: 12 },
      objects: [],
    }

    const first = {
      stock: { width: 400, height: 300, depth: 12 },
      objects: [{
        id: 1,
        name: 'demo.svg / path 1',
        operationName: 'demo path 1',
        src: 'data:image/svg+xml;base64,PHN2Zw==',
        pathData: 'M 0 0 L 10 0 L 10 10 Z',
        viewBoxWidth: 10,
        viewBoxHeight: 10,
        width: 10,
        height: 10,
        x: 20,
        y: 30,
        rotation: 0,
        operation: 'cut-on-path' as const,
        bitId: '1',
        depth: 1.2,
        lockedProportions: true,
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M 0 0 L 10 0 L 10 10 Z" /></svg>',
      }],
    }

    const history = pushHistory(createHistoryState(initial), first)
    const undone = undoHistory(history)
    const redone = redoHistory(undone)

    expect(history.past).toEqual([initial])
    expect(undone.present).toEqual(initial)
    expect(redone.present).toEqual(first)
  })
})
