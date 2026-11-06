import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { STATUS_LABELS, STATUS_TONES, type Application, type ApplicationStatus } from '@jobtracker/shared'
import { Alert } from '../components/Alert/Alert'
import { ApplicationDialog } from '../components/ApplicationDialog/ApplicationDialog'
import { Avatar } from '../components/Avatar/Avatar'
import { Badge } from '../components/Badge/Badge'
import { Button } from '../components/Button/Button'
import { Card, CardHeader, CardTitle } from '../components/Card/Card'
import { DescriptionList, DescriptionListItem } from '../components/DescriptionList/DescriptionList'
import { Dialog } from '../components/Dialog/Dialog'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { StatusSelect } from '../components/StatusSelect/StatusSelect'
import { Timeline, TimelineItem } from '../components/Timeline/Timeline'
import { useAuth } from '../hooks/useAuth'
import { useSaveApplication } from '../hooks/useSaveApplication'
import { deleteApplication, getApplication } from '../lib/api'
import { describeChange, displayUrl, fileName, formatTimestamp, historyNewestFirst } from '../lib/applicationDetail'
import { formatDisplayDate, formatFullDate, formatShortDate, toISODate, todayISO, type ISODate } from '../lib/calendarDate'
import { focusRing } from '../lib/classes'
import { cn } from '../lib/cn'
import { isDemoUser } from '../lib/demo'
import { getInitials } from '../lib/initials'
import { statusGroup } from '../lib/statusGroup'
import { toast } from '../lib/toast'
import { useStatusChange } from './JobsListScreen'

export interface ApplicationDetailScreenProps {
  /** Undefined while loading */
  application: Application | undefined
  /** `not-found` for a 404 (deleted, or a bad link); `failed` for anything else */
  error?: 'not-found' | 'failed'
  onStatusChange: (status: ApplicationStatus) => void | Promise<unknown>
  onEdit: () => void
  /** Deletes it; throw to show the message in the dialog. The caller leaves the page after. */
  onDelete: () => Promise<void>
  /** For "Last update Oct 9" (the year shows outside the current one); stories pin it */
  today?: ISODate
}

/** Application detail, without data fetching: header, summary, Details and Status history */
export function ApplicationDetailScreen({
  application,
  error,
  onStatusChange,
  onEdit,
  onDelete,
  today = todayISO(),
}: ApplicationDetailScreenProps) {
  const [deleting, setDeleting] = useState(false)

  if (error) {
    return (
      <PageHeader
        back={{ to: '/jobs/active', label: 'Back to jobs' }}
        title={error === 'not-found' ? 'Application not found' : 'Couldn’t load this application'}
        description={
          error === 'not-found'
            ? 'It may have been deleted, or the link is out of date.'
            : 'Refresh the page to try again.'
        }
      />
    )
  }

  if (!application) return <DetailSkeleton />

  const { job_title, company, status, resume_path, cover_letter_path } = application
  const name = `${job_title} at ${company}`

  return (
    <>
      <PageHeader
        back={{ to: `/jobs/${statusGroup(status)}`, label: 'Back to jobs' }}
        title={job_title}
        description={
          // The applied date gets its own line on phones rather than wrapping mid-date
          <>
            {company}
            <span className="max-md:hidden"> · </span>
            <span className="max-md:block">Applied {formatDisplayDate(application.date_applied)}</span>
          </>
        }
        actions={
          <Button variant="secondary" icon="edit" onClick={onEdit}>
            Edit
          </Button>
        }
      />
      <Content>
        {/* Wraps on phones: "Last update" drops to its own line, 8px under the badges */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Decorative: the company is named in the header */}
          <Avatar size="md" src={application.company_logo_url} initials={getInitials(company)} />
          <StatusSelect value={status} onChange={onStatusChange} applicationName={name} />
          {application.is_referral && (
            <Badge tone="neutral" appearance="outline" size="medium">
              Referral
            </Badge>
          )}
          <p className="text-body-small text-text-muted">
            Last update {formatShortDate(toISODate(new Date(application.updated_at)), today)}
          </p>
        </div>

        <Columns>
          <Card padding="flush" className="min-w-0 flex-1">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <DescriptionList className="px-6 pb-2">
              <DescriptionListItem label="Job post">
                {application.job_post_url && (
                  <ExternalLink href={application.job_post_url} className="break-all">
                    {displayUrl(application.job_post_url)}
                  </ExternalLink>
                )}
              </DescriptionListItem>
              <DescriptionListItem label="Industry">{application.industry}</DescriptionListItem>
              <DescriptionListItem label="Compensation">{application.compensation}</DescriptionListItem>
              <DescriptionListItem label="Applied">{formatFullDate(application.date_applied)}</DescriptionListItem>
              <DescriptionListItem label="Resume">
                {resume_path && <FileLink path={resume_path} url={application.resume_url} />}
              </DescriptionListItem>
              <DescriptionListItem label="Cover letter">
                {cover_letter_path && <FileLink path={cover_letter_path} url={application.cover_letter_url} />}
              </DescriptionListItem>
              <DescriptionListItem label="Notes">
                {application.notes && <span className="whitespace-pre-line">{application.notes}</span>}
              </DescriptionListItem>
            </DescriptionList>
          </Card>

          <Card className="shrink-0 @[60rem]:w-100">
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <StatusHistory application={application} />
          </Card>
        </Columns>

        {/* Low emphasis: a ghost button in the error text color */}
        <Button
          variant="ghost"
          icon="trash"
          className="self-start text-feedback-error-text"
          onClick={() => setDeleting(true)}
        >
          Delete application
        </Button>
      </Content>

      <DeleteDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        applicationName={name}
        onDelete={onDelete}
      />
    </>
  )
}

/** Padding and gaps from the frames: 16px on phones; 32/40/48px and 24px gaps from md */
function Content({ children, ...props }: { children: ReactNode; 'aria-busy'?: boolean }) {
  return (
    <div className="@container flex flex-1 flex-col gap-4 p-4 pb-24 md:gap-6 md:px-10 md:pt-8 md:pb-12" {...props}>
      {children}
    </div>
  )
}

/**
 * Details and Status history side by side once there's room for both (Details needs 32rem to
 * keep its labels inline beside a 400px history), stacked before that
 */
function Columns({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 md:gap-6 @[60rem]:flex-row @[60rem]:items-start">{children}</div>
}

function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('rounded-xs text-text-link underline', focusRing, className)}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * The file's name, linking to its signed URL. The URL expires after an hour, so it comes fresh
 * with each fetch of the application; without one (signing failed) the name shows unlinked.
 */
function FileLink({ path, url }: { path: string; url?: string }) {
  return url ? <ExternalLink href={url}>{fileName(path)}</ExternalLink> : <>{fileName(path)}</>
}

/** Newest first. The app's own changes (the nightly move to Unlikely) are system events, no badge. */
function StatusHistory({ application }: { application: Application }) {
  const history = historyNewestFirst(application.status_history ?? [])
  if (history.length === 0) return <p className="text-body-small text-text-muted">No status changes yet.</p>

  return (
    <Timeline>
      {history.map((change) =>
        change.is_automatic ? (
          <TimelineItem
            key={change.id}
            actor="system"
            time={formatTimestamp(change.changed_at)}
            dateTime={change.changed_at}
          >
            {describeChange(change)}
          </TimelineItem>
        ) : (
          <TimelineItem
            key={change.id}
            badge={<Badge {...STATUS_TONES[change.new_status]}>{STATUS_LABELS[change.new_status]}</Badge>}
            time={formatTimestamp(change.changed_at)}
            dateTime={change.changed_at}
          >
            {describeChange(change)}
          </TimelineItem>
        ),
      )}
    </Timeline>
  )
}

interface DeleteDialogProps {
  open: boolean
  onClose: () => void
  applicationName: string
  onDelete: () => Promise<void>
}

/**
 * The confirmation: a small alertdialog with focus on Cancel. While deleting, both buttons are
 * disabled and Esc does nothing; a failure shows in a danger Alert and the dialog stays open.
 */
function DeleteDialog({ open, onClose, applicationName, onDelete }: DeleteDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  // A fresh start each time it opens
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setError(undefined)
  }

  const confirm = async () => {
    setPending(true)
    setError(undefined)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose()
      }}
      size="small"
      role="alertdialog"
      title="Delete this application?"
      description={`${applicationName} and its status history will be removed. You can’t undo this.`}
      footer={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete application'}
          </Button>
        </>
      }
    >
      {error && <Alert tone="danger">Couldn’t delete it. {error}</Alert>}
    </Dialog>
  )
}

/** The loaded layout's shapes, pulsing like the Stat and row skeletons (Figma: Application detail, loading) */
function DetailSkeleton() {
  const bar = 'rounded-xs bg-bg-skeleton'
  return (
    <>
      <PageHeader
        back={{ to: '/jobs/active', label: 'Back to jobs' }}
        title={
          <>
            <span className="sr-only">Loading application</span>
            <span aria-hidden="true" className={cn('block h-10 w-80 max-w-full animate-pulse-opacity', bar)} />
          </>
        }
      />
      <Content aria-busy>
        <div aria-hidden="true" className="flex animate-pulse-opacity items-center gap-3">
          <div className={cn('size-10', bar)} />
          <div className={cn('h-8 w-30', bar)} />
        </div>
        <Columns>
          <div aria-hidden="true" className="h-90 min-w-0 flex-1 animate-pulse-opacity rounded-sm bg-bg-surface" />
          <div aria-hidden="true" className="h-40 shrink-0 animate-pulse-opacity rounded-sm bg-bg-surface @[60rem]:w-100" />
        </Columns>
      </Content>
    </>
  )
}

/** The `/jobs/detail/:id` route: the screen wired to the API, plus the Edit dialog */
export function ApplicationDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saveApplication = useSaveApplication()
  const changeStatus = useStatusChange()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)

  const query = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
    retry: (failures, error) => !isNotFound(error) && failures < 2,
    // The file links are signed for an hour; refetch before they expire while the page is open
    refetchInterval: 50 * 60 * 1000,
  })
  const application = query.data

  return (
    <>
      <ApplicationDetailScreen
        application={application}
        error={query.isError ? (isNotFound(query.error) ? 'not-found' : 'failed') : undefined}
        onStatusChange={(status) => (application ? changeStatus(application, status) : undefined)}
        onEdit={() => setEditing(true)}
        onDelete={async () => {
          if (!application) return
          await deleteApplication(application.id)
          // Leave first, so the removed query doesn't refetch into a 404 on the way out
          navigate(`/jobs/${statusGroup(application.status)}`, { replace: true })
          queryClient.removeQueries({ queryKey: ['application', application.id] })
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['applications'] }),
            queryClient.invalidateQueries({ queryKey: ['timeline-stats'] }),
          ])
          toast({ tone: 'neutral', title: 'Application deleted', message: `${application.job_title} at ${application.company}` })
        }}
      />
      {application && (
        <ApplicationDialog
          open={editing}
          application={application}
          onClose={() => setEditing(false)}
          onSubmit={async (values) => {
            await saveApplication(values, application)
            setEditing(false)
          }}
          allowUploads={!isDemoUser(user)}
        />
      )}
    </>
  )
}

function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}
