import './Grid.css'

type GridProps = {
  maxSpan: number
  direction: 'horizontal' | 'vertical'
  origin: 'bottom-left' | 'center'
}

export function Grid({ maxSpan, direction, origin }: GridProps) {

  const delta = 10;
  const numberOfLines = Math.floor(maxSpan / delta)
  const percentage = 100 / numberOfLines;
  const offset = origin === 'center' ? numberOfLines / 2 : 0;

  return (
    <span>
{[...Array(numberOfLines)].map((_, index) => 
  <span 
    key={index} 
    className={`grid-line ${direction}`} 
    style={{ [direction === 'horizontal' ? 'bottom' : 'left']: `${Math.min((index + 1) * percentage, 100)}%` }}
  >
    <span className={`axis-${direction === 'horizontal' ? 'y' : 'x'}`}>{(index + 1 - offset) * delta}</span>
  </span>
  )
}
</span>
)}
