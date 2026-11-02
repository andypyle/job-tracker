import { Link } from 'react-router-dom'
import { formatShortDate } from '../../lib/calendarDate'
import { getInitials } from '../../lib/initials'
import { Avatar } from '../Avatar/Avatar'
import { Badge } from '../Badge/Badge'
import { ListItem, ListItemText, ListItemTitle } from '../ListItem/ListItem'
import { StatusSelect } from '../StatusSelect/StatusSelect'
import type { ApplicationCardProps } from './ApplicationCard.types'

export { ApplicationCardSkeleton } from './parts/ApplicationCardSkeleton/ApplicationCardSkeleton'

/**
 * One application in a list: the company avatar, title, company and a meta line, with the
 * status Select and an optional Referral badge on the right. The whole row links to the
 * application; the status Select stays its own control.
 */
export function ApplicationCard({
  application,
  onStatusChange,
  to = `/jobs/detail/${application.id}`,
  selected,
  ...props
}: ApplicationCardProps) {
  const { job_title, company, compensation, company_logo_url, date_applied, status, is_referral } = application
  // The nightly job only moves Applied to Unlikely, so date_applied is the last activity
  const when =
    status === 'Unlikely'
      ? `No activity since ${formatShortDate(date_applied)}`
      : `Applied ${formatShortDate(date_applied)}`

  return (
    <ListItem selected={selected} {...props}>
      {/* Decorative: the company name is in the row */}
      <Avatar size="md" src={company_logo_url} initials={getInitials(company)} />
      <ListItemText>
        <ListItemTitle>
          <Link to={to} aria-current={selected ? 'page' : undefined}>
            {job_title}
          </Link>
        </ListItemTitle>
        <p>{company}</p>
        <p className="text-caption-regular">
          {/* The phone frame leaves compensation out, so the meta line stays one line */}
          {compensation && <span className="max-md:hidden">{`${compensation} · `}</span>}
          {when}
        </p>
      </ListItemText>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusSelect value={status} onChange={onStatusChange} applicationName={`${job_title} at ${company}`} />
        {is_referral && (
          <Badge tone="neutral" appearance="outline">
            Referral
          </Badge>
        )}
      </div>
    </ListItem>
  )
}
