import type { InputHTMLAttributes, ReactNode } from 'react'
import type { IconName } from '../Icon/Icon.paths'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Static 16px icon before the text, in text/muted */
  leadingIcon?: IconName
  /** An action inside the end of the field, usually an IconButton with `className="size-10"` */
  trailing?: ReactNode
  /** Classes for the field box (width, margins). The ref and other props go to the `<input>`. */
  className?: string
}
