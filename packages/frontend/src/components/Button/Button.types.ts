import type { ButtonHTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { IconName } from '../Icon/Icon.paths'
import type { buttonVariants } from './Button.variants'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Leading icon, drawn at 20px in the label color */
  icon?: IconName
}
