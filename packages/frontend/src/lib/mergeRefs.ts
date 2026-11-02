import type { MutableRefObject, Ref, RefCallback } from 'react'

/** One callback ref that sets every ref given, for components that need their own ref as well as the caller's */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      // React types object refs from useRef<T>(null) as read-only; they are writable at runtime
      else if (ref) (ref as MutableRefObject<T | null>).current = node
    }
  }
}
