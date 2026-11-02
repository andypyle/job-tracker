import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Application, ApplicationStatus } from '@jobtracker/shared'
import { fetchOpenGraph, type OpenGraphResult } from '../../lib/api'
import { todayISO } from '../../lib/calendarDate'
import { cn } from '../../lib/cn'
import { statusOptions, statusOrder } from '../../lib/statusOptions'
import { Alert } from '../Alert/Alert'
import { Checkbox } from '../Checkbox/Checkbox'
import { DatePicker } from '../DatePicker/DatePicker'
import { FileDropzone } from '../FileDropzone/FileDropzone'
import type { FileDropzoneFile } from '../FileDropzone/FileDropzone.types'
import { FormField } from '../FormField/FormField'
import { Input } from '../Input/Input'
import { Select } from '../Select/Select'
import { Spinner } from '../Spinner/Spinner'
import { Textarea } from '../Textarea/Textarea'
import type { ApplicationFormProps, ApplicationFormValues } from './ApplicationForm.types'

const invalidDate = 'Enter a date like Oct 2, 2026'

const isWebLink = (text: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(text).protocol)
  } catch {
    return false
  }
}

// A File for a new pick, the saved file's name in Edit, or null for none
type FileValue = FileDropzoneFile | null

const schema = z.object({
  job_post_url: z
    .string()
    .trim()
    .refine((text) => text === '' || isWebLink(text), 'Enter a link that starts with http:// or https://'),
  job_title: z.string().trim().min(1, 'Enter the job title'),
  company: z.string().trim().min(1, 'Enter the company'),
  date_applied: z
    .string()
    .nullable()
    .transform((date, ctx) => {
      if (date) return date
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter the date you applied' })
      return z.NEVER
    }),
  status: z.custom<ApplicationStatus>((value) => statusOrder.includes(value as ApplicationStatus), 'Choose a status'),
  industry: z.string().trim(),
  compensation: z.string().trim(),
  is_referral: z.boolean(),
  notes: z.string().trim(),
  company_logo_url: z.string(),
  resume: z.custom<FileValue>(),
  cover_letter: z.custom<FileValue>(),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

const fileName = (path: string) => path.split('/').pop() ?? path

function toFormInput(application?: Application): FormInput {
  return {
    job_post_url: application?.job_post_url ?? '',
    job_title: application?.job_title ?? '',
    company: application?.company ?? '',
    date_applied: application?.date_applied ?? todayISO(),
    status: application?.status ?? 'Applied',
    industry: application?.industry ?? '',
    compensation: application?.compensation ?? '',
    is_referral: application?.is_referral ?? false,
    notes: application?.notes ?? '',
    company_logo_url: application?.company_logo_url ?? '',
    resume: application?.resume_path ? { name: fileName(application.resume_path) } : null,
    cover_letter: application?.cover_letter_path ? { name: fileName(application.cover_letter_path) } : null,
  }
}

// A new File uploads; clearing a saved file deletes it; anything else leaves it alone
const fileChange = (value: FileValue, savedPath?: string) =>
  value instanceof File ? value : value === null && savedPath ? null : undefined

function toValues(values: FormOutput, application?: Application): ApplicationFormValues {
  // PATCH leaves out what isn't sent, so Edit sends '' to clear a field; Add just leaves it out
  const optional = (text: string) => text || (application ? '' : undefined)
  return {
    application: {
      job_post_url: optional(values.job_post_url),
      job_title: values.job_title,
      company: values.company,
      company_logo_url: optional(values.company_logo_url),
      date_applied: values.date_applied,
      status: values.status,
      industry: optional(values.industry),
      compensation: optional(values.compensation),
      is_referral: values.is_referral,
      notes: optional(values.notes),
    },
    resume: fileChange(values.resume, application?.resume_path),
    coverLetter: fileChange(values.cover_letter, application?.cover_letter_path),
  }
}

// Fields a job link can fill, and how the announcement names them
const fillable = [
  ['job_title', 'title', 'job title'],
  ['company', 'company', 'company'],
  ['compensation', 'compensation', 'compensation'],
] as const satisfies readonly (readonly [keyof FormInput, keyof OpenGraphResult, string])[]

const listOf = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/**
 * The Add and Edit application fields, in Figma's order: two columns once each field gets
 * 240px. Pasting a job link (or leaving the field) looks it up and fills only the fields that
 * are still empty, so nothing typed is overwritten.
 */
export function ApplicationForm({
  id,
  application,
  onSubmit,
  fetchDetails = fetchOpenGraph,
  className,
  ...props
}: ApplicationFormProps) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    getFieldState,
    setError,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    // @hookform/resolvers v3 types the resolver as input = output; the schema's date transform
    // (null in, string out) needs the split, which is what zodResolver returns at runtime
    resolver: zodResolver(schema) as Resolver<FormInput, unknown, FormOutput>,
    // Errors show on blur, then update as you type; submit checks everything and focuses the first
    mode: 'onTouched',
    defaultValues: toFormInput(application),
  })

  // Link lookup: a spinner in the field, and a polite announcement for screen readers
  const [fetching, setFetching] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const lastLookup = useRef(application?.job_post_url ?? '')
  const lookupId = useRef(0)

  const lookUp = async () => {
    const url = getValues('job_post_url').trim()
    if (!isWebLink(url) || url === lastLookup.current) return
    lastLookup.current = url
    // A newer lookup wins over one still in flight
    const current = ++lookupId.current
    setFetching(true)
    setAnnouncement('Getting details')
    let filled: string[] = []
    try {
      const details = await fetchDetails(url)
      if (current !== lookupId.current) return
      // Read the fields now, not when the lookup started, so anything typed meanwhile stays
      for (const [field, key, name] of fillable) {
        const found = details[key]
        if (found && !getValues(field).trim()) {
          setValue(field, found, { shouldDirty: true, shouldValidate: Boolean(getFieldState(field).error) })
          filled.push(name)
        }
      }
      if (details.logo_url && !getValues('company_logo_url')) {
        setValue('company_logo_url', details.logo_url, { shouldDirty: true })
      }
    } catch {
      // Lookups fail quietly: the fields are there to fill in by hand
      filled = []
    }
    if (current !== lookupId.current) return
    setFetching(false)
    setAnnouncement(filled.length ? `Filled in ${listOf(filled)}` : 'No details found for this link')
  }

  // DatePicker keeps its last good value while typed text is bad, so submit checks this too
  const badDateText = useRef(false)

  const [submitError, setSubmitError] = useState<{ message: string } | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (submitError) alertRef.current?.focus()
  }, [submitError])

  const submit = handleSubmit(async (values) => {
    if (badDateText.current) {
      setError('date_applied', { message: invalidDate }, { shouldFocus: true })
      return
    }
    setSubmitError(null)
    try {
      await onSubmit(toValues(values, application))
    } catch (error) {
      // A new object each time, so the same message focuses the alert again
      setSubmitError({ message: error instanceof Error ? error.message : 'Something went wrong. Try again.' })
    }
  })

  const linkField = register('job_post_url', { onBlur: () => void lookUp() })

  return (
    <form id={id} noValidate onSubmit={submit} className={cn('@container', className)} {...props}>
      <div className="grid gap-x-4 gap-y-5 @min-[31rem]:grid-cols-2">
        {submitError && (
          <Alert ref={alertRef} tone="danger" className="@min-[31rem]:col-span-2">
            {submitError.message}
          </Alert>
        )}

        <FormField
          label="Job post URL"
          hint="Paste a link to fill in the title, company and logo."
          error={errors.job_post_url?.message}
          className="@min-[31rem]:col-span-2"
        >
          <Input
            {...linkField}
            // Where a Dialog starts focus: pasting the link is the first step
            data-autofocus
            type="url"
            inputMode="url"
            autoComplete="off"
            leadingIcon="link"
            placeholder="https://"
            // The pasted text lands after the paste event, so look it up on the next task
            onPaste={() => setTimeout(() => void lookUp())}
            trailing={
              fetching ? (
                // Visual only: the live region below announces the lookup
                <span aria-hidden="true" className="flex size-10 items-center justify-center">
                  <Spinner size="md" />
                </span>
              ) : undefined
            }
          />
        </FormField>

        <FormField label="Job title" error={errors.job_title?.message}>
          <Input {...register('job_title')} autoComplete="off" placeholder="e.g. Product Designer" />
        </FormField>
        <FormField label="Company" error={errors.company?.message}>
          <Input {...register('company')} autoComplete="organization" placeholder="Company name" />
        </FormField>

        <Controller
          control={control}
          name="date_applied"
          render={({ field }) => (
            <FormField label="Date applied" error={errors.date_applied?.message}>
              <DatePicker
                ref={field.ref}
                name={field.name}
                value={field.value}
                max={todayISO()}
                onChange={(date) => {
                  badDateText.current = false
                  field.onChange(date)
                }}
                onInvalidInput={() => {
                  badDateText.current = true
                  setError('date_applied', { message: invalidDate })
                }}
                onBlur={field.onBlur}
              />
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <FormField label="Status" error={errors.status?.message}>
              <Select
                ref={field.ref}
                options={statusOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormField>
          )}
        />

        <FormField label="Industry" optional>
          <Input {...register('industry')} autoComplete="off" placeholder="e.g. Healthcare" />
        </FormField>
        <FormField label="Compensation" optional>
          <Input {...register('compensation')} autoComplete="off" placeholder="e.g. $120k + equity" />
        </FormField>

        <Checkbox
          {...register('is_referral')}
          label="This was a referral"
          className="justify-self-start @min-[31rem]:col-span-2"
        />

        <Controller
          control={control}
          name="resume"
          render={({ field }) => (
            <FormField label="Resume" optional>
              <FileDropzone value={field.value} onSelect={field.onChange} onRemove={() => field.onChange(null)} />
            </FormField>
          )}
        />
        <Controller
          control={control}
          name="cover_letter"
          render={({ field }) => (
            <FormField label="Cover letter" optional>
              <FileDropzone value={field.value} onSelect={field.onChange} onRemove={() => field.onChange(null)} />
            </FormField>
          )}
        />

        <FormField label="Notes" optional className="@min-[31rem]:col-span-2">
          <Textarea {...register('notes')} placeholder="Anything you want to remember about this role" />
        </FormField>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </form>
  )
}
