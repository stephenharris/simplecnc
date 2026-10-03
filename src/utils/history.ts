import type { Stock, SvgObject } from '../types/cnc'

export type ProjectSnapshot = {
  stock: Stock
  objects: SvgObject[]
}

export type HistoryState = {
  past: ProjectSnapshot[]
  present: ProjectSnapshot
  future: ProjectSnapshot[]
}

const snapshotsEqual = (left: ProjectSnapshot, right: ProjectSnapshot) => JSON.stringify(left) === JSON.stringify(right)

export const createHistoryState = (initial: ProjectSnapshot): HistoryState => ({
  past: [],
  present: initial,
  future: [],
})

export const pushHistory = (history: HistoryState, next: ProjectSnapshot): HistoryState => {
  if (snapshotsEqual(history.present, next)) return history
  return {
    past: [...history.past, history.present],
    present: next,
    future: [],
  }
}

export const undoHistory = (history: HistoryState): HistoryState => {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export const redoHistory = (history: HistoryState): HistoryState => {
  if (history.future.length === 0) return history
  const [next, ...rest] = history.future
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  }
}
