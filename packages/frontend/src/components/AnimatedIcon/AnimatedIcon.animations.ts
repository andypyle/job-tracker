import type { Animation, Interaction } from 'react-useanimations'
import type { IconName } from '../Icon/Icon.paths'

interface IconAnimation {
  load: () => Promise<{ default: Animation }>
  /** Overrides the library default, e.g. so a click-replay icon plays on hover instead */
  interaction?: Interaction
  /** Default playback speed, for Lotties that run long next to our motion tokens */
  speed?: number
}

// Icons that animate when they sit on an interactive element. Each is a dynamic import,
// so an icon's Lottie data (about 2 kB) is only downloaded once something renders it.
// Icons without an entry stay static. `plus`, `x` and `search` are left out on purpose:
// useAnimations only has them as morphs (plusToX, searchToX), which would change their meaning.
// Each entry's resting frame is checked against the Figma glyph in the AnimatedIcon stories.
export const iconAnimations: Partial<Record<IconName, IconAnimation>> = {
  'arrow-left': { load: () => import('react-useanimations/lib/arrowLeft') },
  'chevron-down': { load: () => import('react-useanimations/lib/chevronDown') },
  'chevron-up': { load: () => import('react-useanimations/lib/chevronUp') },
  'chevron-left': { load: () => import('react-useanimations/lib/chevronLeft') },
  'chevron-right': { load: () => import('react-useanimations/lib/chevronRight') },
  // edit3 is the Figma pencil-with-underline; `edit` rests on a different pencil
  edit: { load: () => import('react-useanimations/lib/edit3'), interaction: 'hover-replay' },
  // The lid rests slightly lower and narrower than the Figma glyph
  trash: { load: () => import('react-useanimations/lib/trash') },
  'log-out': { load: () => import('react-useanimations/lib/logOut'), interaction: 'hover-replay' },
  upload: { load: () => import('react-useanimations/lib/upload') },
  'check-circle': { load: () => import('react-useanimations/lib/check') },
  'external-link': { load: () => import('react-useanimations/lib/externalLink') },
  dashboard: { load: () => import('react-useanimations/lib/grid') },
  briefcase: { load: () => import('react-useanimations/lib/briefcase') },
  clock: { load: () => import('react-useanimations/lib/clock') },
  calendar: { load: () => import('react-useanimations/lib/calendar') },
  settings: { load: () => import('react-useanimations/lib/settings'), interaction: 'hover-replay' },
  ban: { load: () => import('react-useanimations/lib/slash') },
  /**
   * Toggle: `active` shows the x. menu2, because `menu` ends on a burger, not an x. A toggle
   * plays the whole 2s timeline (forward or back), so 6.5× brings each morph to about 300ms, in
   * step with a panel opening over duration/slow.
   */
  menu: { load: () => import('react-useanimations/lib/menu2'), speed: 6.5 },
  /** Toggle between eye-off and eye with `active` */
  eye: { load: () => import('react-useanimations/lib/visibility') },
}

// Loaded animations, shared by every instance so later mounts render animated straight away
export const loadedAnimations = new Map<IconName, Animation>()

/**
 * Loads an icon's animation, or resolves undefined for static icons and failed chunks. Also
 * for warming one up ahead of time, e.g. an icon that autoplays the moment it mounts.
 */
export function loadIconAnimation(name: IconName): Promise<Animation | undefined> {
  const cached = loadedAnimations.get(name)
  const entry = iconAnimations[name]
  if (cached || !entry) return Promise.resolve(cached)
  return entry.load().then(
    (module) => {
      loadedAnimations.set(name, module.default)
      return module.default
    },
    () => undefined, // Keep the static icon if the chunk fails to load
  )
}
