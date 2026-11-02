import type { ButtonHTMLAttributes } from 'react'
import type { IconName } from '../Icon/Icon.paths'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: IconName
  /** Required accessible name, e.g. "Close" or "Next month" */
  label: string
  /** For toggle icons (`menu`, `eye`): true shows the icon's end state, e.g. the menu's x */
  active?: boolean
}
