import type { HTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { swatchVariants } from './Swatch.variants'

export interface SwatchProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof swatchVariants> {}
