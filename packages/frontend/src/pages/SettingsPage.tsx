import { useEffect, useRef, useState, type FormEventHandler, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { UnlikelyAfterDays, UserSettings } from '@jobtracker/shared'
import { Alert } from '../components/Alert/Alert'
import { Avatar } from '../components/Avatar/Avatar'
import { Button } from '../components/Button/Button'
import { Card, CardHeader, CardTitle } from '../components/Card/Card'
import { Dialog } from '../components/Dialog/Dialog'
import { FormField } from '../components/FormField/FormField'
import { Input } from '../components/Input/Input'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { PasswordInput } from '../components/PasswordInput/PasswordInput'
import { Select } from '../components/Select/Select'
import { useApplicationCounts } from '../hooks/useApplicationCounts'
import { useAccount } from '../hooks/useAccount'
import { useAuth } from '../hooks/useAuth'
import { deleteAccount, getSettings, updateSettings } from '../lib/api'
import { getInitials } from '../lib/initials'
import { MIN_PASSWORD_LENGTH, passwordPair } from '../lib/passwords'
import {
  describeUnlikelyAfter,
  fromUnlikelyAfterValue,
  toUnlikelyAfterValue,
  unlikelyAfterOptions,
  type UnlikelyAfterValue,
} from '../lib/settings'
import { toast } from '../lib/toast'
import { getDisplayName } from '../lib/userName'

export interface SettingsScreenProps {
  /** The display name, as the sidebar shows it */
  name: string
  /** Shown read-only: Neon Auth doesn't allow email changes */
  email: string
  /** Undefined while loading */
  settings: UserSettings | undefined
  /** The settings couldn't load: Tracking says so instead of showing its form */
  settingsError?: boolean
  /** For the Delete account copy; undefined while the counts load */
  applicationCount?: number
  /** The public demo account: a note replaces Profile, Password and Delete account */
  demo?: boolean
  /** Not yet known whether this is the demo: only Tracking shows until it is */
  accountLoading?: boolean
  /** Saves the name; throw to show the message in the section */
  onSaveName: (name: string) => Promise<void>
  /** `wrong-password` marks the current-password field. Throw for anything else. */
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<'changed' | 'wrong-password'>
  onSaveTracking: (days: UnlikelyAfterDays | null) => Promise<void>
  /** Deletes the account; throw to show the message in the dialog. The caller leaves the page after. */
  onDeleteAccount: () => Promise<void>
}

/**
 * Settings, without the wiring: one Card per section, each its own form with its own Primary
 * save. Fields check on blur and on submit; a failed save shows a danger Alert in that section,
 * which takes focus. Success is the caller's toast.
 */
export function SettingsScreen({
  name,
  email,
  settings,
  settingsError,
  applicationCount,
  demo,
  accountLoading,
  onSaveName,
  onChangePassword,
  onSaveTracking,
  onDeleteAccount,
}: SettingsScreenProps) {
  return (
    <>
      <PageHeader
        appearance="plain"
        title="Settings"
        description="Your profile, how you sign in, and how the tracker handles quiet applications."
      />
      {/* One 720px column from md, as in the frames; full width with 16px sides below */}
      <div className="flex flex-col gap-4 p-4 pb-24 md:max-w-[calc(45rem+--spacing(20))] md:gap-6 md:px-10 md:pt-8 md:pb-12">
        {accountLoading ? (
          <TrackingSection settings={settings} error={settingsError} onSave={onSaveTracking} />
        ) : demo ? (
          <>
            <DemoAccountSection />
            <TrackingSection settings={settings} error={settingsError} onSave={onSaveTracking} />
          </>
        ) : (
          <>
            <ProfileSection name={name} email={email} onSave={onSaveName} />
            <PasswordSection onChange={onChangePassword} />
            <TrackingSection settings={settings} error={settingsError} onSave={onSaveTracking} />
            <DeleteAccountSection email={email} applicationCount={applicationCount} onDelete={onDeleteAccount} />
          </>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** A failed save: the message, as a new object each time so the same message refocuses the Alert */
function useSubmitError() {
  const [error, setError] = useState<{ message: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) ref.current?.focus()
  }, [error])
  const fail = (err: unknown) => setError({ message: err instanceof Error ? err.message : 'Something went wrong. Try again.' })
  return { error, ref, fail, clear: () => setError(null) }
}

interface SectionProps {
  title: string
  onSubmit: FormEventHandler<HTMLFormElement>
  submitError: ReturnType<typeof useSubmitError>
  /** The Primary button's label, and while saving */
  action: string
  pendingAction: string
  pending: boolean
  disabled?: boolean
  children: ReactNode
}

/** A Card holding one form: the fields, then its Primary button at the end */
function Section({ title, onSubmit, submitError, action, pendingAction, pending, disabled, children }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {submitError.error && (
          <Alert ref={submitError.ref} tone="danger">
            {submitError.error.message}
          </Alert>
        )}
        {children}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={pending || disabled}>
            {pending ? pendingAction : action}
          </Button>
        </div>
      </form>
    </Card>
  )
}

/** In place of the account sections, which the demo account can't use */
function DemoAccountSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo account</CardTitle>
      </CardHeader>
      <p className="text-body-small text-text-muted">
        You’re in the shared demo, so the name, email, password and account can’t be changed, and file uploads are
        off. Add, edit and delete applications as you like: everything resets to the sample data each night.
      </p>
    </Card>
  )
}

const nameSchema = z.object({ name: z.string().trim().min(1, 'Enter your name') })

function ProfileSection({ name, email, onSave }: { name: string; email: string; onSave: (name: string) => Promise<void> }) {
  const submitError = useSubmitError()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    mode: 'onTouched',
    // Follows the saved name, so it matches the sidebar after a save
    values: { name },
  })

  const submit = handleSubmit(async (values) => {
    submitError.clear()
    try {
      await onSave(values.name.trim())
    } catch (err) {
      submitError.fail(err)
    }
  })

  return (
    <Section title="Profile" onSubmit={submit} submitError={submitError} action="Save name" pendingAction="Saving…" pending={isSubmitting}>
      <div className="flex items-start gap-4">
        {/* Previews the initials as you type; centered on the input (label 20 + gap 8 + half of 48, less half of 56) */}
        <Avatar size="lg" initials={getInitials(watch('name')) || getInitials(name)} className="mt-6 shrink-0" />
        <FormField
          label="Full name"
          hint="Shown in the sidebar and used for your initials."
          error={errors.name?.message}
          className="min-w-0 flex-1"
        >
          <Input {...register('name')} autoComplete="name" />
        </FormField>
      </div>
      <p className="text-body-small text-text-muted">
        You sign in as <span className="text-text-primary">{email}</span>. Email addresses can’t be changed.
      </p>
    </Section>
  )
}

const passwordChange = z.object({ currentPassword: z.string().min(1, 'Enter your current password') }).and(passwordPair)

function PasswordSection({
  onChange,
}: {
  onChange: (currentPassword: string, newPassword: string) => Promise<'changed' | 'wrong-password'>
}) {
  const submitError = useSubmitError()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    trigger,
    getFieldState,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<z.infer<typeof passwordChange>>({
    resolver: zodResolver(passwordChange),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  })

  const submit = handleSubmit(async ({ currentPassword, password }) => {
    submitError.clear()
    if (password === currentPassword) {
      setError('password', { message: 'That’s your current password. Choose a new one.' }, { shouldFocus: true })
      return
    }
    try {
      const result = await onChange(currentPassword, password)
      if (result === 'wrong-password') {
        setError('currentPassword', { message: 'That’s not your current password.' }, { shouldFocus: true })
      } else {
        reset()
      }
    } catch (err) {
      submitError.fail(err)
    }
  })

  return (
    <Section title="Password" onSubmit={submit} submitError={submitError} action="Change password" pendingAction="Changing…" pending={isSubmitting}>
      {/* One column's width, lined up with New password below */}
      <FormField label="Current password" error={errors.currentPassword?.message} className="sm:max-w-[calc(50%-0.5rem)]">
        <PasswordInput {...register('currentPassword')} autoComplete="current-password" />
      </FormField>
      {/* Side by side while each gets 240px, as in the frames; stacked on phones */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-5 *:min-w-60 *:flex-1">
        <FormField label="New password" hint={`Use at least ${MIN_PASSWORD_LENGTH} characters.`} error={errors.password?.message}>
          <PasswordInput
            {...register('password', {
              // Keep the match check current once the confirm field is showing its state
              onChange: () => {
                if (isSubmitted || getFieldState('confirmPassword').isTouched) void trigger('confirmPassword')
              },
            })}
            autoComplete="new-password"
          />
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          <PasswordInput {...register('confirmPassword')} autoComplete="new-password" />
        </FormField>
      </div>
    </Section>
  )
}

function TrackingSection({
  settings,
  error,
  onSave,
}: {
  settings: UserSettings | undefined
  error?: boolean
  onSave: (days: UnlikelyAfterDays | null) => Promise<void>
}) {
  const submitError = useSubmitError()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ unlikelyAfter: UnlikelyAfterValue | null }>({
    values: { unlikelyAfter: settings ? toUnlikelyAfterValue(settings.unlikely_after_days) : null },
  })

  const submit = handleSubmit(async ({ unlikelyAfter }) => {
    if (!unlikelyAfter) return
    submitError.clear()
    try {
      await onSave(fromUnlikelyAfterValue(unlikelyAfter))
    } catch (err) {
      submitError.fail(err)
    }
  })

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
        </CardHeader>
        <Alert tone="danger">Couldn’t load this setting. Refresh the page to try again.</Alert>
      </Card>
    )
  }

  const loading = settings === undefined
  return (
    <Section
      title="Tracking"
      onSubmit={submit}
      submitError={submitError}
      action="Save"
      pendingAction="Saving…"
      pending={isSubmitting}
      disabled={loading}
    >
      <Controller
        control={control}
        name="unlikelyAfter"
        render={({ field }) => (
          <FormField
            label="Move to Unlikely after"
            hint="Each night, applications still in Applied this long move to Unlikely. You can move them back any time."
            className="max-w-80"
          >
            <Select
              ref={field.ref}
              options={unlikelyAfterOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={loading ? 'Loading…' : undefined}
              disabled={loading}
            />
          </FormField>
        )}
      />
    </Section>
  )
}

function DeleteAccountSection({
  email,
  applicationCount,
  onDelete,
}: {
  email: string
  applicationCount?: number
  onDelete: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const applications =
    applicationCount === undefined
      ? 'all your applications'
      : applicationCount === 1
        ? 'your 1 application'
        : `all ${applicationCount} applications`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-5">
        <p className="text-body-small text-text-muted">
          Deletes your account, {applications}, their status history and every uploaded résumé and cover letter. You
          can’t undo this.
        </p>
        <div className="flex justify-end">
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
      </div>
      <DeleteAccountDialog
        open={open}
        onClose={() => setOpen(false)}
        email={email}
        applicationCount={applicationCount}
        onDelete={onDelete}
      />
    </Card>
  )
}

interface DeleteAccountDialogProps {
  open: boolean
  onClose: () => void
  email: string
  applicationCount?: number
  onDelete: () => Promise<void>
}

/**
 * The confirmation: Delete stays disabled until the typed email matches. Focus starts in the
 * field, since typing is the next step and can't delete anything by itself. While deleting,
 * both buttons are disabled and Esc does nothing; a failure shows in a danger Alert.
 */
function DeleteAccountDialog({ open, onClose, email, applicationCount, onDelete }: DeleteAccountDialogProps) {
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  // A fresh start each time it opens
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTyped('')
      setError(undefined)
    }
  }

  const matches = typed.trim().toLowerCase() === email.toLowerCase()
  const confirm = async () => {
    if (!matches) return
    setPending(true)
    setError(undefined)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setPending(false)
    }
  }

  const what =
    applicationCount === undefined
      ? 'Your applications'
      : applicationCount === 1
        ? 'Your 1 application'
        : `Your ${applicationCount} applications`

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose()
      }}
      size="small"
      role="alertdialog"
      title="Delete your account?"
      description={`${what}, their status history and every uploaded file will be deleted. You can’t undo this.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={!matches || pending}>
            {pending ? 'Deleting…' : 'Delete account'}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void confirm()
        }}
      >
        {error && <Alert tone="danger">Couldn’t delete your account. {error}</Alert>}
        <FormField label="Type your email to confirm">
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={email}
            type="email"
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
            data-autofocus
          />
        </FormField>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** The `/settings` route: the screen wired to Neon Auth, the account and settings APIs and the counts */
export function SettingsPage() {
  const { user, updateName, changePassword, signOut } = useAuth()
  const { isDemo } = useAccount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoading: countsLoading, ...counts } = useApplicationCounts()
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })

  return (
    <SettingsScreen
      name={getDisplayName(user)}
      email={user?.email ?? ''}
      settings={settings.data}
      settingsError={settings.isError}
      applicationCount={countsLoading ? undefined : counts.active + counts.unlikely + counts.rejected}
      demo={isDemo}
      accountLoading={isDemo === undefined}
      onSaveName={async (name) => {
        const { error } = await updateName(name)
        if (error) throw new Error(error.message)
        toast({ tone: 'positive', title: 'Name saved', message: name })
      }}
      onChangePassword={async (currentPassword, newPassword) => {
        const { error } = await changePassword(currentPassword, newPassword)
        if (error?.code === 'INVALID_PASSWORD') return 'wrong-password'
        if (error) throw new Error(error.message)
        toast({ tone: 'positive', title: 'Password changed' })
        return 'changed'
      }}
      onSaveTracking={async (days) => {
        const saved = await updateSettings({ unlikely_after_days: days })
        queryClient.setQueryData(['settings'], saved)
        toast({ tone: 'positive', title: 'Setting saved', message: describeUnlikelyAfter(saved.unlikely_after_days) })
      }}
      onDeleteAccount={async () => {
        await deleteAccount()
        // The server-side session went with the user; this forgets it here
        await signOut()
        queryClient.clear()
        navigate('/login', { replace: true })
      }}
    />
  )
}
