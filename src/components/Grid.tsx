import './Grid.css'

type GridProps = {
  maxSpan: number
  direction: 'horizontal' | 'vertical'
}

export function Grid({ maxSpan, direction }: GridProps) {

  const numberOfLines = maxSpan / 10;
  const percentage = 100 / numberOfLines;
  return (
    <span>
{[...Array(numberOfLines)].map((_, index) => 
  <span 
    key={index} 
    className={`grid-line ${direction}`} 
    style={{ [direction === 'horizontal' ? 'bottom' : 'left']: `${(index + 1) * percentage}%` }}
  >
    <span className={ `axis-${direction === 'horizontal' ? 'y' : 'x'}` }>{(index + 1)*10}</span> 
  </span>
  )
}
</span>
)}
