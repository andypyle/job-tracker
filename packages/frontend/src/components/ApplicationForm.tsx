import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Application, ApplicationCreate, ApplicationStatus } from '@jobtracker/shared'
import { STATUS_LABELS } from '@jobtracker/shared'
import {
  createApplication,
  updateApplication,
  uploadFile,
  deleteFile,
  fetchOpenGraph,
} from '../lib/api'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApplicationFormFields extends ApplicationCreate {
  status?: ApplicationStatus
}

export interface ApplicationFormProps {
  /** If provided, the form operates in edit mode. */
  application?: Application
  onSuccess: (application: Application) => void
  onCancel: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return today's date as an ISO date string (YYYY-MM-DD). */
function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function validatePdf(file: File): string | true {
  if (file.type !== 'application/pdf') return 'Only PDF files are allowed.'
  if (file.size > MAX_FILE_BYTES) return 'File must be 10 MB or smaller.'
  return true
}

// ─── Inline spinner (accessible) ────────────────────────────────────────────

function InlineSpinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin align-middle ml-2"
    />
  )
}

// ─── Field wrapper ───────────────────────────────────────────────────────────

function FieldWrapper({
  label,
  htmlFor,
  error,
  children,
  optional,
  labelSuffix,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
  optional?: boolean
  labelSuffix?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium"
        style={{ color: 'var(--color-text)' }}
      >
        {label}
        {optional && (
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>
            (optional)
          </span>
        )}
        {labelSuffix}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── File upload sub-component ───────────────────────────────────────────────

interface FileFieldProps {
  id: string
  label: string
  existingPath?: string
  existingUrl?: string
  onRemoveExisting: () => void
  removingExisting: boolean
  onFileChange: (file: File | null) => void
  selectedFile: File | null
  error?: string
}

function FileField({
  id,
  label,
  existingPath,
  existingUrl,
  onRemoveExisting,
  removingExisting,
  onFileChange,
  selectedFile,
  error,
}: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onFileChange(file)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {label}
        <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>
          (optional, PDF max 10 MB)
        </span>
      </label>

      {/* Show existing file info in edit mode */}
      {existingPath && !selectedFile && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
          style={{
            background: '#F0FDFA',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2">
            {/* PDF icon */}
            <svg
              className="w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {existingUrl ? (
              <a
                href={existingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Current: {existingPath.split('/').pop() ?? 'file.pdf'}
              </a>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>
                Current: {existingPath.split('/').pop() ?? 'file.pdf'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRemoveExisting}
            disabled={removingExisting}
            className="ml-2 text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50 transition-colors duration-150"
            aria-label={`Remove ${label}`}
          >
            {removingExisting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}

      {/* File picker */}
      {(!existingPath || selectedFile) && (
        <div>
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={handleChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="form-input text-left cursor-pointer hover:border-teal-500 transition-colors duration-150"
            style={{ color: selectedFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}
          >
            {selectedFile ? (
              <span className="flex items-center gap-2">
                {/* PDF icon */}
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {selectedFile.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileChange(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  className="ml-auto text-red-400 hover:text-red-600 cursor-pointer transition-colors duration-150"
                  aria-label="Clear selected file"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ) : (
              'Choose PDF file…'
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ApplicationForm({ application, onSuccess, onCancel }: ApplicationFormProps) {
  const isEditMode = Boolean(application)

  // ── React Hook Form ────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormFields>({
    defaultValues: {
      job_post_url: application?.job_post_url ?? '',
      job_title: application?.job_title ?? '',
      company: application?.company ?? '',
      date_applied: application?.date_applied ?? todayIso(),
      status: application?.status,
      industry: application?.industry ?? '',
      compensation: application?.compensation ?? '',
      notes: application?.notes ?? '',
      is_referral: application?.is_referral ?? false,
      company_logo_url: application?.company_logo_url ?? '',
    },
  })

  // ── OpenGraph state ────────────────────────────────────────────────────────
  const [ogLoading, setOgLoading] = useState(false)

  // ── File state ─────────────────────────────────────────────────────────────
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [resumeFileError, setResumeFileError] = useState<string>('')
  const [coverLetterFileError, setCoverLetterFileError] = useState<string>('')

  // Track whether existing files have been removed (edit mode only)
  const [resumeRemoved, setResumeRemoved] = useState(false)
  const [coverLetterRemoved, setCoverLetterRemoved] = useState(false)
  const [removingResume, setRemovingResume] = useState(false)
  const [removingCoverLetter, setRemovingCoverLetter] = useState(false)

  // ── Submit error ───────────────────────────────────────────────────────────
  const [submitError, setSubmitError] = useState<string>('')

  // ── OpenGraph blur handler ─────────────────────────────────────────────────
  async function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    const url = e.target.value.trim()
    if (!url) return

    setOgLoading(true)
    try {
      const og = await fetchOpenGraph(url)
      if (og.title && !getValues('job_title')) {
        setValue('job_title', og.title, { shouldValidate: false, shouldDirty: true })
      }
      if (og.company && !getValues('company')) {
        setValue('company', og.company, { shouldValidate: false, shouldDirty: true })
      }
      if (og.logo_url) {
        setValue('company_logo_url', og.logo_url, { shouldValidate: false, shouldDirty: true })
      }
      if (og.compensation && !getValues('compensation')) {
        setValue('compensation', og.compensation, { shouldValidate: false, shouldDirty: true })
      }
    } catch {
      // Silently ignore all OG errors per spec — never surface to user.
    } finally {
      setOgLoading(false)
    }
  }

  // ── File validation helpers ────────────────────────────────────────────────
  function handleResumeChange(file: File | null) {
    if (file) {
      const result = validatePdf(file)
      if (result !== true) {
        setResumeFileError(result)
        setResumeFile(null)
        return
      }
      setResumeFileError('')
    }
    setResumeFile(file)
  }

  function handleCoverLetterChange(file: File | null) {
    if (file) {
      const result = validatePdf(file)
      if (result !== true) {
        setCoverLetterFileError(result)
        setCoverLetterFile(null)
        return
      }
      setCoverLetterFileError('')
    }
    setCoverLetterFile(file)
  }

  // ── Remove existing file handlers ──────────────────────────────────────────
  async function handleRemoveResume() {
    if (!application) return
    setRemovingResume(true)
    try {
      await deleteFile(application.id, 'resume')
      setResumeRemoved(true)
    } catch {
      // Silently fail — user can retry
    } finally {
      setRemovingResume(false)
    }
  }

  async function handleRemoveCoverLetter() {
    if (!application) return
    setRemovingCoverLetter(true)
    try {
      await deleteFile(application.id, 'cover_letter')
      setCoverLetterRemoved(true)
    } catch {
      // Silently fail — user can retry
    } finally {
      setRemovingCoverLetter(false)
    }
  }

  // ── Form submission ────────────────────────────────────────────────────────
  async function onSubmit(fields: ApplicationFormFields) {
    setSubmitError('')
    try {
      const { status, ...createFields } = fields

      // Strip empty optional strings so the backend receives undefined, not ""
      const payload: ApplicationCreate = {
        ...createFields,
        job_post_url: createFields.job_post_url || undefined,
        company_logo_url: createFields.company_logo_url || undefined,
        industry: createFields.industry || undefined,
        compensation: createFields.compensation || undefined,
        notes: createFields.notes || undefined,
        resume_path: createFields.resume_path || undefined,
        cover_letter_path: createFields.cover_letter_path || undefined,
      }

      let savedApp: Application

      if (isEditMode && application) {
        const updatePayload: typeof payload & { status?: ApplicationStatus } = {
          ...payload,
          ...(status ? { status } : {}),
        }
        savedApp = await updateApplication(application.id, updatePayload)
      } else {
        savedApp = await createApplication(payload)
      }

      // Upload new files if selected
      if (resumeFile) {
        await uploadFile(savedApp.id, 'resume', resumeFile)
      }
      if (coverLetterFile) {
        await uploadFile(savedApp.id, 'cover_letter', coverLetterFile)
      }

      onSuccess(savedApp)
    } catch (err: unknown) {
      // err is unknown; extract message safely
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
    }
  }

  // ── Derived existing file state (edit mode) ────────────────────────────────
  const showExistingResume = isEditMode && !!application?.resume_path && !resumeRemoved
  const showExistingCoverLetter = isEditMode && !!application?.cover_letter_path && !coverLetterRemoved

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">

        {/* Job Post URL */}
        <FieldWrapper
          label="Job Post URL"
          htmlFor="job_post_url"
          optional
          error={errors.job_post_url?.message}
          labelSuffix={ogLoading ? <InlineSpinner /> : null}
        >
          <input
            id="job_post_url"
            type="url"
            autoComplete="off"
            placeholder="https://jobs.example.com/12345"
            className={`form-input ${errors.job_post_url ? 'is-error' : ''}`}
            {...register('job_post_url', {
              onBlur: handleUrlBlur,
              pattern: {
                value: /^https?:\/\/.+/,
                message: 'Must be a valid URL starting with http:// or https://',
              },
            })}
          />
        </FieldWrapper>

        {/* Job Title */}
        <FieldWrapper label="Job Title" htmlFor="job_title" error={errors.job_title?.message}>
          <input
            id="job_title"
            type="text"
            autoComplete="off"
            placeholder="Software Engineer"
            className={`form-input ${errors.job_title ? 'is-error' : ''}`}
            {...register('job_title', { required: 'Job title is required.' })}
          />
        </FieldWrapper>

        {/* Company */}
        <FieldWrapper label="Company" htmlFor="company" error={errors.company?.message}>
          <input
            id="company"
            type="text"
            autoComplete="off"
            placeholder="Acme Corp"
            className={`form-input ${errors.company ? 'is-error' : ''}`}
            {...register('company', { required: 'Company is required.' })}
          />
        </FieldWrapper>

        {/* Date Applied */}
        <FieldWrapper label="Date Applied" htmlFor="date_applied" error={errors.date_applied?.message}>
          <input
            id="date_applied"
            type="date"
            className={`form-input ${errors.date_applied ? 'is-error' : ''}`}
            {...register('date_applied', { required: 'Date applied is required.' })}
          />
        </FieldWrapper>

        {/* Status — only in edit mode */}
        {isEditMode && (
          <FieldWrapper label="Status" htmlFor="status" error={errors.status?.message}>
            <select
              id="status"
              className="form-input cursor-pointer"
              {...register('status')}
            >
              {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </FieldWrapper>
        )}

        {/* Two-column row for Industry + Compensation on wider screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldWrapper label="Industry" htmlFor="industry" optional error={errors.industry?.message}>
            <input
              id="industry"
              type="text"
              autoComplete="off"
              placeholder="Technology"
              className="form-input"
              {...register('industry')}
            />
          </FieldWrapper>

          <FieldWrapper label="Compensation" htmlFor="compensation" optional error={errors.compensation?.message}>
            <input
              id="compensation"
              type="text"
              autoComplete="off"
              placeholder="e.g. $120k + equity"
              className="form-input"
              {...register('compensation')}
            />
          </FieldWrapper>
        </div>

        {/* Notes */}
        <FieldWrapper label="Notes" htmlFor="notes" optional error={errors.notes?.message}>
          <textarea
            id="notes"
            rows={4}
            placeholder="Anything you want to remember about this role…"
            className="form-input resize-y"
            style={{ minHeight: '96px' }}
            {...register('notes')}
          />
        </FieldWrapper>

        {/* Referral checkbox */}
        <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-teal-600 cursor-pointer"
            {...register('is_referral')}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            I was referred for this role
          </span>
        </label>

        {/* Resume upload */}
        <FileField
          id="resume"
          label="Resume"
          existingPath={showExistingResume ? application!.resume_path : undefined}
          existingUrl={showExistingResume ? application!.resume_url : undefined}
          onRemoveExisting={handleRemoveResume}
          removingExisting={removingResume}
          onFileChange={handleResumeChange}
          selectedFile={resumeFile}
          error={resumeFileError}
        />

        {/* Cover letter upload */}
        <FileField
          id="cover_letter"
          label="Cover Letter"
          existingPath={showExistingCoverLetter ? application!.cover_letter_path : undefined}
          existingUrl={showExistingCoverLetter ? application!.cover_letter_url : undefined}
          onRemoveExisting={handleRemoveCoverLetter}
          removingExisting={removingCoverLetter}
          onFileChange={handleCoverLetterChange}
          selectedFile={coverLetterFile}
          error={coverLetterFileError}
        />

        {/* Submit error */}
        {submitError && (
          <p className="text-sm text-red-600 rounded-lg px-3 py-2 bg-red-50 border border-red-200" role="alert">
            {submitError}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer transition-colors duration-150 disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
          >
            {isSubmitting
              ? isEditMode
                ? 'Saving…'
                : 'Adding…'
              : isEditMode
                ? 'Save Changes'
                : 'Add Application'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default ApplicationForm
