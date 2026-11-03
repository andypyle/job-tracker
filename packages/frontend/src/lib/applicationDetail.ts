import { STATUS_LABELS, type StatusChange } from '@jobtracker/shared'

/** Most recent first; at the same moment, the creation row goes last */
export function historyNewestFirst(history: readonly StatusChange[]): StatusChange[] {
  return [...history].sort(
    (a, b) =>
      b.changed_at.localeCompare(a.changed_at) || Number(a.old_status === null) - Number(b.old_status === null),
  )
}

/** The event line for a status change: "Moved from Applied to Interviewing" */
export function describeChange({ old_status, new_status, is_automatic }: StatusChange): string {
  if (old_status === null) return 'Application created'
  if (is_automatic && new_status === 'Unlikely') return 'Marked Unlikely after no status change in Applied'
  if (is_automatic) return `Moved to ${STATUS_LABELS[new_status]} automatically`
  return `Moved from ${STATUS_LABELS[old_status]} to ${STATUS_LABELS[new_status]}`
}

const timestampFormatters = {
  date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }),
}

/** "Oct 9, 2026 · 3:14 PM", in local time */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  // Newer ICU puts a narrow no-break space before AM/PM; a plain space reads (and tests) the same
  const time = timestampFormatters.time.format(date).replace(/ /g, ' ')
  return `${timestampFormatters.date.format(date)} · ${time}`
}

/** "jobs.northwindlabs.com/designer-412": the link without its protocol, www or trailing slash */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/** The file's name from its storage path: "user/app/resume.pdf" is "resume.pdf" */
export function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
