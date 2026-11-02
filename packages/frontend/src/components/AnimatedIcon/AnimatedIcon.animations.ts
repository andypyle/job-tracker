import type { Animation, Interaction } from 'react-useanimations'
import type { IconName } from '../Icon/Icon.paths'

interface IconAnimation {
  load: () => Promise<{ default: Animation }>
  /** Overrides the library default, e.g. so a click-replay icon plays on hover instead */
  interaction?: Interaction
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
  'external-link': { load: () => import('react-useanimations/lib/externalLink') },
  dashboard: { load: () => import('react-useanimations/lib/grid') },
  briefcase: { load: () => import('react-useanimations/lib/briefcase') },
  clock: { load: () => import('react-useanimations/lib/clock') },
  calendar: { load: () => import('react-useanimations/lib/calendar') },
  ban: { load: () => import('react-useanimations/lib/slash') },
  /** Toggle: `active` shows the x */
  menu: { load: () => import('react-useanimations/lib/menu') },
  /** Toggle between eye-off and eye with `active` */
  eye: { load: () => import('react-useanimations/lib/visibility') },
}
