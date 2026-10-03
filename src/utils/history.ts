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

export const cloneProjectSnapshot = (snapshot: ProjectSnapshot): ProjectSnapshot => ({
  stock: { ...snapshot.stock },
  objects: snapshot.objects.map((object) => ({ ...object })),
})

export const createHistoryState = (initial: ProjectSnapshot): HistoryState => ({
  past: [],
  present: cloneProjectSnapshot(initial),
  future: [],
})

export const pushHistory = (history: HistoryState, next: ProjectSnapshot): HistoryState => {
  const nextSnapshot = cloneProjectSnapshot(next)
  if (snapshotsEqual(history.present, nextSnapshot)) return history
  return {
    past: [...history.past, cloneProjectSnapshot(history.present)],
    present: nextSnapshot,
    future: [],
  }
}

export const replacePresent = (history: HistoryState, next: ProjectSnapshot): HistoryState => {
  const nextSnapshot = cloneProjectSnapshot(next)
  if (snapshotsEqual(history.present, nextSnapshot)) return history
  return { ...history, present: nextSnapshot }
}

export const commitHistory = (
  history: HistoryState,
  before: ProjectSnapshot,
  after: ProjectSnapshot = history.present,
): HistoryState => {
  const beforeSnapshot = cloneProjectSnapshot(before)
  const afterSnapshot = cloneProjectSnapshot(after)
  if (snapshotsEqual(beforeSnapshot, afterSnapshot)) return history
  return {
    past: [...history.past, beforeSnapshot],
    present: afterSnapshot,
    future: [],
  }
}

export const undoHistory = (history: HistoryState): HistoryState => {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: cloneProjectSnapshot(previous),
    future: [cloneProjectSnapshot(history.present), ...history.future],
  }
}

export const redoHistory = (history: HistoryState): HistoryState => {
  if (history.future.length === 0) return history
  const [next, ...rest] = history.future
  return {
    past: [...history.past, cloneProjectSnapshot(history.present)],
    present: cloneProjectSnapshot(next),
    future: rest,
  }
}
