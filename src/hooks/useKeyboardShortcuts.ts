import { useEffect } from 'react'
import { KeyboardEventHandler } from '../utils/KeyboardEventHandler'

type KeyboardShortcutActions = {
  copySelected: () => void
  pasteCopied: () => void
  deleteSelected: () => void
  undo: () => void
  redo: () => void
}

export function useKeyboardShortcuts({ copySelected, pasteCopied, deleteSelected, undo, redo }: KeyboardShortcutActions) {
  useEffect(() => {
    const keyboardEventHandler = new KeyboardEventHandler({
      onCtrlC: copySelected,
      onCtrlV: pasteCopied,
      onDelete: deleteSelected,
      onCtrlY: redo,
      onCtrlZ: undo,
    })

    window.addEventListener('keydown', keyboardEventHandler.handleKeyDown)
    return () => window.removeEventListener('keydown', keyboardEventHandler.handleKeyDown)
  }, [copySelected, deleteSelected, pasteCopied, redo, undo])
}
