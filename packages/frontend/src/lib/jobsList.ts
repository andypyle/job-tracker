import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { plural } from './dashboard'

/** The Active list's groups, in Figma's order */
export const activeGroups: readonly { status: ApplicationStatus; label: string }[] = [
  { status: 'Interviewing', label: 'Interviewing' },
  { status: 'Offer', label: 'Offers' },
  { status: 'Applied', label: 'Applied' },
]

/** Case-insensitive match on the job title or company; an empty query matches everything */
export function matchesSearch(application: Application, query: string): boolean {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return true
  return (
    application.job_title.toLocaleLowerCase().includes(q) || application.company.toLocaleLowerCase().includes(q)
  )
}

/** Most recently applied first; same-day applications by when they were added */
export function newestFirst(a: Application, b: Application): number {
  return b.date_applied.localeCompare(a.date_applied) || b.created_at.localeCompare(a.created_at)
}

/** "14 in progress · 2 interviewing · 1 offer", leaving out groups with none */
export function describeActive(applications: Application[]): string {
  const count = (status: ApplicationStatus) => applications.filter((a) => a.status === status).length
  const interviewing = count('Interviewing')
  const offers = count('Offer')
  return [
    `${applications.length} in progress`,
    interviewing > 0 && `${interviewing} interviewing`,
    offers > 0 && plural(offers, 'offer'),
  ]
    .filter(Boolean)
    .join(' · ')
}
