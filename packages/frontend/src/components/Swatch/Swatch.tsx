import { cn } from '../../lib/cn'
import type { SwatchProps } from './Swatch.types'
import { swatchVariants } from './Swatch.variants'

/** A 12px tone chip for leading slots (Option, chart legends). Decorative: the text beside it carries the meaning. */
export function Swatch({ className, tone, ...props }: SwatchProps) {
  return <span aria-hidden className={cn(swatchVariants({ tone }), className)} {...props} />
}
