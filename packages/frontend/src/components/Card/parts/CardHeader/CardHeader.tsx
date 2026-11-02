import { cn } from '../../../../lib/cn'
import { useCardContext } from '../../Card.context'
import type { CardHeaderProps } from './CardHeader.types'

/** The title row: a CardTitle, then at most one Button or IconButton at the end */
export function CardHeader({ className, ...props }: CardHeaderProps) {
  const { padding } = useCardContext()

  return (
    <div
      className={cn(
        'flex items-center gap-4',
        // Flush: the header pads itself and draws a 1px border/subtle line above the body. The
        // line takes 1px of the bottom padding, as Figma's inside stroke does: 60px in all.
        padding === 'flush' && 'border-b border-border-subtle px-6 pt-4 pb-[calc(--spacing(4)-1px)]',
        className,
      )}
      {...props}
    />
  )
}
