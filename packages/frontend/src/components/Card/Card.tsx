import { useId, useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { CardContext } from './Card.context'
import type { CardProps } from './Card.types'
import { cardVariants } from './Card.variants'

export { CardHeader } from './parts/CardHeader/CardHeader'
export { CardTitle } from './parts/CardTitle/CardTitle'

export function Card({ className, padding, ...props }: CardProps) {
  const titleId = useId()
  const [hasTitle, setHasTitle] = useState(false)
  const context = useMemo(
    () => ({ padding: padding ?? 'default', titleId, setHasTitle }),
    [padding, titleId],
  )

  return (
    <CardContext.Provider value={context}>
      <section
        aria-labelledby={hasTitle ? titleId : undefined}
        className={cn(cardVariants({ padding }), className)}
        {...props}
      />
    </CardContext.Provider>
  )
}
