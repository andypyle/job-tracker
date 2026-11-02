import { STATUS_LABELS, STATUS_TONES, type ApplicationStatus } from '@jobtracker/shared'
import type { SelectOption } from '../components/Select/Select.types'

/** The menu order from the Figma StatusSelect pattern */
export const statusOrder: readonly ApplicationStatus[] = [
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Unlikely',
  'Role Eliminated',
]

/** Select options for a status: a Swatch in the menu, and the badge's tone and appearance */
export const statusOptions: readonly SelectOption<ApplicationStatus>[] = statusOrder.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
  tone: STATUS_TONES[status].tone,
  badgeAppearance: STATUS_TONES[status].appearance,
}))
