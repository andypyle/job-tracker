import type { HTMLAttributes, ReactNode } from 'react'

export interface AuthLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** The form, with its own h1: the screen's main content */
  children: ReactNode
}
