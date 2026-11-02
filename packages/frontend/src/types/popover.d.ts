// @types/react 18 predates the Popover API. React 18 passes the lowercase attribute through
// to the DOM unchanged, so only the type is missing.
import 'react'

declare module 'react' {
  interface HTMLAttributes<T> {
    popover?: 'auto' | 'manual' | 'hint' | ''
  }
}
