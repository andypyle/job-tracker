import { useEffect, useReducer } from 'react'
import UseAnimations, { type EventProps } from 'react-useanimations'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon/Icon'
import type { IconName } from '../Icon/Icon.paths'
import { iconAnimations, loadedAnimations, loadIconAnimation } from './AnimatedIcon.animations'
import type { AnimatedIconHandlers, AnimatedIconProps } from './AnimatedIcon.types'

function useIconAnimation(name: IconName) {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (loadedAnimations.has(name)) return
    let current = true
    void loadIconAnimation(name).then((animation) => {
      if (animation && current) rerender()
    })
    return () => {
      current = false
    }
  }, [name])
  return loadedAnimations.get(name)
}

// useAnimations draws on a 32px frame with the 24px glyph inset by 4px. Rendering the frame
// at 4/3 of the glyph size with a negative margin matches the static Icon's footprint.
export function AnimatedIcon<T extends HTMLElement>({
  name,
  size = 24,
  active,
  interaction,
  autoplay,
  speed,
  className,
  render,
  ...handlers
}: AnimatedIconProps<T>) {
  const animation = useIconAnimation(name)
  // The library honors reduced motion for loops, but an explicit autoplay overrides it
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  if (!animation) {
    return render(handlers, <Icon name={name} size={size} className={className} />)
  }

  return (
    <UseAnimations
      animation={animation}
      size={(size * 4) / 3}
      active={active}
      interaction={interaction ?? iconAnimations[name]?.interaction}
      autoplay={autoplay && !reducedMotion}
      speed={speed}
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
