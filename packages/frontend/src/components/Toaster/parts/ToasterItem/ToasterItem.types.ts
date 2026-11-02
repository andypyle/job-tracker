import type { RefCallback } from 'react'
import type { ToastRecord } from '../../../../lib/toast'

export interface ToasterItemProps {
  record: ToastRecord
  /** The stack is hovered or focused: hold the timer */
  paused: boolean
  /** Registers the element with the Toaster, which runs the enter, exit and FLIP motion */
  itemRef: RefCallback<HTMLDivElement>
}
