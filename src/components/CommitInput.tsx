import { useEffect, useRef, useState } from 'react'

export type CommitInputProps = {
  type: 'number' | 'text'
  value: string
  min?: number
  max?: number
  step?: number
  className?: string
  onCommit: (value: string) => void
}

/**
 *  Wrapper ar ound Input that only changes the value when the user
 *  hits enter or the field loses focus. This is useful for inputs that are bound to state,
 *  where you don't want to update the state on every keystroke.
 *  It also handles the case where the user presses escape to cancel the edit.
 */
export function CommitInput({ type, value, min, max, step, className, onCommit }: CommitInputProps) {
  const [draft, setDraft] = useState(value)
  const lastCommitted = useRef(value)
  const skipNextBlurCommit = useRef(false)

  useEffect(() => {
    setDraft(value)
    lastCommitted.current = value
  }, [value])

  const commit = () => {
    if (draft === lastCommitted.current) return
    if (type === 'number' && (draft.trim() === '' || !Number.isFinite(Number(draft)))) {
      setDraft(lastCommitted.current)
      return
    }
    lastCommitted.current = draft
    onCommit(draft)
  }

  return (
    <input
      className={className}
      type={type}
      value={draft}
      min={min}
      max={max}
      step={step}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (skipNextBlurCommit.current) {
            skipNextBlurCommit.current = false
            return
        }
        commit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          skipNextBlurCommit.current = true
          setDraft(lastCommitted.current)
          event.currentTarget.blur()
        }
      }}
    />
  )
}