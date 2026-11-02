import { useEffect } from 'react'
import { cn } from '../../../../lib/cn'
import { useCardContext } from '../../Card.context'
import type { CardTitleProps } from './CardTitle.types'

/** Heading/H3 in text/primary. Names the Card's section. */
export function CardTitle({ className, as: Heading = 'h2', ...props }: CardTitleProps) {
  const { titleId, setHasTitle } = useCardContext()

  useEffect(() => {
    setHasTitle(true)
    return () => setHasTitle(false)
  }, [setHasTitle])

  return (
    <Heading
      id={titleId}
      className={cn('min-w-0 flex-1 font-display text-heading-h3 break-words text-text-primary', className)}
      {...props}
    />
  )
}
