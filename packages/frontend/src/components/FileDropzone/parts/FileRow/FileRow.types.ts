import type { HTMLAttributes, ReactNode, Ref } from 'react'

export type FileRowTone = 'default' | 'positive' | 'error'

export interface FileRowProps extends HTMLAttributes<HTMLDivElement> {
  /** default: Uploading and Filled. positive: Complete. error: Error. */
  tone?: FileRowTone
  /** The 20px status icon */
  icon: ReactNode
  /** File name, cut short with an ellipsis */
  fileName: string
  /** The line under the name: size, progress or the error. Colored by `tone`. */
  caption?: ReactNode
  /** Upload progress, 0–100. Shows the bar between the name and the caption. */
  percent?: number
  /** Accessible name for the x button, e.g. "Remove resume.pdf". Omit to hide the button. */
  actionLabel?: string
  onAction?: () => void
  actionRef?: Ref<HTMLButtonElement>
}
