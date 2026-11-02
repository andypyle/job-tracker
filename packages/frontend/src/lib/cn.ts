import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom theme keys from src/styles/tokens.css. Without this it reads
// `text-heading-h1` as a text color and drops it when a real color like `text-text-muted` follows.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display-hero',
        'display-stat',
        'heading-h1',
        'heading-h2',
        'heading-h3',
        'body-large',
        'body-base',
        'body-small',
        'title-base',
        'label-base',
        'label-small',
        'caption-regular',
        'caption-medium',
        'caption-bold',
      ],
      shadow: ['overlay'],
      blur: ['backdrop'],
      ease: ['bounce'],
      animate: ['spinner', 'pulse-opacity', 'slide-in', 'slide-out', 'pop-in'],
    },
  },
})

// Merge conditional class names, letting later Tailwind classes override conflicting earlier ones
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
