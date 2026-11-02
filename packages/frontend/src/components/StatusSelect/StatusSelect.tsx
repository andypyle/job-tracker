import { useEffect, useState } from 'react'
import { STATUS_LABELS, STATUS_TONES, type ApplicationStatus } from '@jobtracker/shared'
import { toast } from '../../lib/toast'
import { Select } from '../Select/Select'
import type { SelectOption } from '../Select/Select.types'
import type { StatusSelectProps } from './StatusSelect.types'

// The menu order from the Figma StatusSelect pattern
const order: ApplicationStatus[] = ['Applied', 'Interviewing', 'Offer', 'Rejected', 'Unlikely', 'Role Eliminated']

const options: SelectOption<ApplicationStatus>[] = order.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
  tone: STATUS_TONES[status].tone,
  badgeAppearance: STATUS_TONES[status].appearance,
}))

/**
 * The editable status: a badge Select drawn with the app's status tones.
 * After a change it shows a neutral toast with Undo.
 */
export function StatusSelect({
  value,
  onChange,
  applicationName,
  'aria-label': ariaLabel,
  disabled,
  className,
}: StatusSelectProps) {
  // A saving or saved status, shown until `value` catches up, so the badge doesn't flick back
  const [pending, setPending] = useState<ApplicationStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const shown = pending ?? value

  useEffect(() => setPending(null), [value])

  const save = async (next: ApplicationStatus, previous: ApplicationStatus, undoable: boolean) => {
    const result = onChange(next)
    if (result instanceof Promise) {
      setPending(next)
      setBusy(true)
      try {
        await result
      } catch {
        // The caller reports the error; the badge goes back
        setPending(null)
        return
      } finally {
        setBusy(false)
      }
    }
    if (undoable) {
      toast({
        title: `Moved to ${STATUS_LABELS[next]}`,
        message: applicationName,
        action: { label: 'Undo', onClick: () => void save(previous, next, false) },
      })
    }
  }

  return (
    <Select
      appearance="badge"
      options={options}
      value={shown}
      onChange={(next) => void save(next, shown, true)}
      busy={busy}
      disabled={disabled}
      aria-label={ariaLabel ?? (applicationName ? `Status: ${applicationName}` : 'Status')}
      className={className}
    />
  )
}
