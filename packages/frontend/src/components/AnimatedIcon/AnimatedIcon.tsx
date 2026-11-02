import { useEffect, useReducer } from 'react'
import UseAnimations, { type Animation, type EventProps } from 'react-useanimations'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { IconName } from '../Icon/Icon.paths'
import { iconAnimations } from './AnimatedIcon.animations'
import type { AnimatedIconHandlers, AnimatedIconProps } from './AnimatedIcon.types'

// Loaded animations, shared by every instance so later mounts render animated straight away
const loaded = new Map<IconName, Animation>()

function useIconAnimation(name: IconName) {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const entry = iconAnimations[name]
    if (!entry || loaded.has(name)) return
    let current = true
    entry
      .load()
      .then((module) => {
        loaded.set(name, module.default)
        if (current) rerender()
      })
      .catch(() => {
        // Keep the static icon if the chunk fails to load
      })
    return () => {
      current = false
    }
  }, [name])
  return loaded.get(name)
}

// useAnimations draws on a 32px frame with the 24px glyph inset by 4px. Rendering the frame
// at 4/3 of the glyph size with a negative margin matches the static Icon's footprint.
export function AnimatedIcon<T extends HTMLElement>({
  name,
  size = 24,
  active,
  interaction,
  className,
  render,
  ...handlers
}: AnimatedIconProps<T>) {
  const animation = useIconAnimation(name)

  if (!animation) {
    return render(handlers, <Icon name={name} size={size} className={className} />)
  }

  return (
    <UseAnimations
      animation={animation}
      size={(size * 4) / 3}
      active={active}
      interaction={interaction ?? iconAnimations[name]?.interaction}
      // The library types handlers for HTMLElement; ours are for the specific element T
      {...(handlers as Partial<EventProps>)}
      render={(eventProps, { style, className: animationClassName, ...animationProps }) =>
        render(
          eventProps as AnimatedIconHandlers<T>,
          <span
            {...animationProps}
            className={cn('inline-block shrink-0', animationClassName, className)}
            style={{ ...style, margin: -size / 6 }}
          />,
        )
      }
    />
  )
}
