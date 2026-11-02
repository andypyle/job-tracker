import type {
  FocusEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactElement,
  ReactNode,
} from 'react'
import type { Interaction } from 'react-useanimations'
import type { IconName } from '../Icon/Icon.paths'

/** Handlers the animation needs on the interactive element. Yours run first. */
export interface AnimatedIconHandlers<T extends HTMLElement> {
  onClick?: MouseEventHandler<T>
  onMouseEnter?: MouseEventHandler<T>
  onMouseLeave?: MouseEventHandler<T>
  onPointerEnter?: PointerEventHandler<T>
  onFocus?: FocusEventHandler<T>
  onBlur?: FocusEventHandler<T>
}

export interface AnimatedIconProps<T extends HTMLElement> extends AnimatedIconHandlers<T> {
  name: IconName
  /** Glyph size in px, same as Icon. Defaults to 24. */
  size?: number
  /** For toggle icons (`menu`, `eye`): true shows the end state */
  active?: boolean
  /** Overrides the icon's default interaction, e.g. 'hover' */
  interaction?: Interaction
  /** Classes for the icon itself */
  className?: string
  /**
   * Renders the interactive element that owns the animation, so hovering or focusing
   * anywhere on it plays the icon. Spread `handlers` on the element and place `icon` inside.
   */
  render: (handlers: AnimatedIconHandlers<T>, icon: ReactNode) => ReactElement
}
