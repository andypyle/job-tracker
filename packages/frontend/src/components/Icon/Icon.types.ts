import type { SVGAttributes } from 'react'
import type { IconName } from './Icon.paths'

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  name: IconName
  /** Width and height in px. Defaults to 24, the Figma grid. */
  size?: number
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  label?: string
}
