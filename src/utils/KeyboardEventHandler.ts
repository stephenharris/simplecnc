type KeyboardEventActions = {
  onCtrlC: () => void
  onCtrlV: () => void
  onDelete: () => void
  onCtrlY: () => void
  onCtrlZ: () => void
}

export class KeyboardEventHandler {
  private readonly actions: KeyboardEventActions

  constructor(actions: KeyboardEventActions) {
    this.actions = actions
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    if (key === 'delete') {
      this.onDelete(event)
      return
    }

    if (!event.metaKey && !event.ctrlKey) return

    if (key === 'c') {
      this.onCtrlC(event)
    } else if (key === 'v') {
      this.onCtrlV(event)
    } else if (key === 'z' && !event.shiftKey) {
      this.onCtrlZ(event)
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      this.onCtrlY(event)
    }
  }

  onCtrlC(event: KeyboardEvent) {
    event.preventDefault()
    this.actions.onCtrlC()
  }

  onCtrlV(event: KeyboardEvent) {
    event.preventDefault()
    this.actions.onCtrlV()
  }

  onDelete(event: KeyboardEvent) {
    event.preventDefault()
    this.actions.onDelete()
  }

  onCtrlY(event: KeyboardEvent) {
    event.preventDefault()
    this.actions.onCtrlY()
  }

  onCtrlZ(event: KeyboardEvent) {
    event.preventDefault()
    this.actions.onCtrlZ()
  }
}
