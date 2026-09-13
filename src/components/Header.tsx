import './Header.css'

type HeaderProps = {
  onGenerateGCode: () => void
}

export function Header({ onGenerateGCode }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">⌁</span>
        <span>
          <strong>SimpleCNC</strong>
        </span>
      </div>
      <button className="export-button" type="button" onClick={onGenerateGCode}>
        Generate G-code <span>→</span>
      </button>
    </header>
  )
}
