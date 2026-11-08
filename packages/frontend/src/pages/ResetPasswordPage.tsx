import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert } from '../components/Alert/Alert'
import { AuthLayout } from '../components/AuthLayout/AuthLayout'
import { Button } from '../components/Button/Button'
import { buttonVariants } from '../components/Button/Button.variants'
import { FormField } from '../components/FormField/FormField'
import { PasswordInput } from '../components/PasswordInput/PasswordInput'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/cn'
import { MIN_PASSWORD_LENGTH, passwordPair } from '../lib/passwords'

export interface ResetPasswordScreenProps {
  /**
   * From the emailed link. Undefined when there isn't one, or when Neon Auth already found it
   * used or expired (`?error=INVALID_TOKEN`): the screen then offers a new link instead of the form.
   */
  token?: string
  /** `reset`, or `invalid-token` when the link has been used or has expired. Throw for anything else. */
  onReset: (token: string, password: string) => Promise<'reset' | 'invalid-token'>
}

type View = 'form' | 'expired' | 'done'

/**
 * Choose a new password, from the link in the reset email: the new password twice, then a
 * "password changed" view. A used or expired link gets a way to ask for a new one.
 */
export function ResetPasswordScreen({ token, onReset }: ResetPasswordScreenProps) {
  const [view, setView] = useState<View>(token ? 'form' : 'expired')
  const {
    register,
    handleSubmit,
    trigger,
    getFieldState,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<z.infer<typeof passwordPair>>({
    resolver: zodResolver(passwordPair),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  })

  const [submitError, setSubmitError] = useState<{ message: string } | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (submitError) alertRef.current?.focus()
  }, [submitError])

  const submit = handleSubmit(async ({ password }) => {
    if (!token) return
    setSubmitError(null)
    try {
      setView((await onReset(token, password)) === 'reset' ? 'done' : 'expired')
    } catch (error) {
      setSubmitError({ message: error instanceof Error ? error.message : 'Something went wrong. Try again.' })
    }
  })

  if (view === 'expired') {
    return (
      <Outcome
        title="This link has expired"
        message="Reset links work once, for an hour. Ask for a new one and use the latest email."
        action={{ to: '/forgot-password', label: 'Send a new link' }}
      />
    )
  }
  if (view === 'done') {
    return (
      <Outcome
        title="Password changed"
        message="Sign in with your new password."
        action={{ to: '/login', label: 'Go to sign in' }}
      />
    )
  }

  return (
    <AuthLayout>
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-heading-h2 text-text-primary lg:text-heading-h1">Choose a new password</h1>
          <p className="text-body-base text-text-muted">You’ll use it the next time you sign in.</p>
        </div>

        {submitError && (
          <Alert ref={alertRef} tone="danger">
            {submitError.message}
          </Alert>
        )}

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

        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </AuthLayout>
  )
}

/** A result in place of the form: a heading (which takes focus), a line, and one way on */
function Outcome({ title, message, action }: { title: string; message: string; action: { to: string; label: string } }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [title])

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-heading-h2 text-text-primary outline-none lg:text-heading-h1"
          >
            {title}
          </h1>
          <p className="text-body-base text-text-muted">{message}</p>
        </div>
        <Link to={action.to} className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}>
          {action.label}
        </Link>
      </div>
    </AuthLayout>
  )
}

/** The `/reset-password` route, which the reset email's link lands on */
export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [params] = useSearchParams()
  // Neon Auth sends ?error=INVALID_TOKEN instead of a token for a used or expired link
  const token = params.get('error') ? undefined : params.get('token') ?? undefined

  return (
    <ResetPasswordScreen
      token={token}
      onReset={async (resetToken, password) => {
        const { error } = await resetPassword(resetToken, password)
        if (error?.code === 'INVALID_TOKEN') return 'invalid-token'
        if (error) throw new Error(error.message)
        return 'reset'
      }}
    />
  )
}
