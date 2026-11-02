import type { HTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { cardVariants } from './Card.variants'

/**
 * A section of related content. Children are an optional CardHeader (a CardTitle and at most
 * one Button or IconButton), then the body. The section is named by its CardTitle.
 */
export interface CardProps extends HTMLAttributes<HTMLElement>, VariantProps<typeof cardVariants> {}

export type CardPadding = NonNullable<CardProps['padding']>
