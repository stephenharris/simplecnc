import './Grid.css'

type GridProps = {
  maxSpan: number
  direction: 'horizontal' | 'vertical'
}

export function Grid({ maxSpan, direction }: GridProps) {

  const delta = 10;
  const numberOfLines = Math.floor(maxSpan / delta)
  const percentage = 100 / numberOfLines;
  return (
    <span>
{[...Array(numberOfLines)].map((_, index) => 
  <span 
    key={index} 
    className={`grid-line ${direction}`} 
    style={{ [direction === 'horizontal' ? 'bottom' : 'left']: `${Math.min((index + 1) * percentage, 100)}%` }}
  >
    <span className={`axis-${direction === 'horizontal' ? 'y' : 'x'}`}>{(index + 1) * delta}</span>
  </span>
  )
}
</span>
)}
