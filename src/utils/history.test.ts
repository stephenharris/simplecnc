import { describe, expect, it } from 'vitest'
import { commitHistory, createHistoryState, pushHistory, redoHistory, replacePresent, undoHistory } from './history'
import type { SvgObject } from '../types/cnc'

const makeObject = (x: number, y: number): SvgObject => ({
  id: 1,
  name: 'demo.svg / path 1',
  operationName: 'demo path 1',
  src: 'data:image/svg+xml;base64,PHN2Zw==',
  pathData: 'M 0 0 L 10 0 L 10 10 Z',
  viewBoxWidth: 10,
  viewBoxHeight: 10,
  width: 10,
  height: 10,
  x,
  y,
  rotation: 0,
  operation: 'cut-on-path',
  bitId: '1',
  depth: 1.2,
  lockedProportions: true,
  svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M 0 0 L 10 0 L 10 10 Z" /></svg>',
})

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

  it('records live drag updates as one undoable transaction', () => {
    const initial = {
      stock: { width: 400, height: 300, depth: 12 },
      objects: [makeObject(20, 30)],
    }
    const dragged = {
      stock: { ...initial.stock },
      objects: [makeObject(45, 55)],
    }

    const liveHistory = replacePresent(createHistoryState(initial), dragged)
    expect(liveHistory.past).toEqual([])
    expect(liveHistory.present).toEqual(dragged)

    const committed = commitHistory(liveHistory, initial)
    expect(committed.past).toEqual([initial])
    expect(undoHistory(committed).present).toEqual(initial)
    expect(redoHistory(undoHistory(committed)).present).toEqual(dragged)
  })

  it('keeps stored snapshots unchanged when input objects are mutated', () => {
    const initial = {
      stock: { width: 400, height: 300, depth: 12 },
      objects: [makeObject(20, 30)],
    }
    const history = createHistoryState(initial)

    initial.objects[0].x = 99

    expect(history.present.objects[0].x).toBe(20)
  })
})
