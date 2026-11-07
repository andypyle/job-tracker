import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert } from '../components/Alert/Alert'
import { AuthLayout } from '../components/AuthLayout/AuthLayout'
import { Button } from '../components/Button/Button'
import { buttonVariants } from '../components/Button/Button.variants'
import { FormField } from '../components/FormField/FormField'
import { Input } from '../components/Input/Input'
import { useAuth } from '../hooks/useAuth'
import { focusRing } from '../lib/classes'
import { cn } from '../lib/cn'
import { getDemoCredentials } from '../lib/demo'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter an email like name@example.com'),
})

export interface ForgotPasswordScreenProps {
  /**
   * Asks for a reset link, or throws an Error whose message the screen shows above the field.
   * Resolves the same whether or not there's an account, so the screen never says which.
   */
  onRequest: (email: string) => Promise<void>
}

/**
 * Forgot password, without the auth wiring: the email, then a "check your email" view that
 * doesn't say whether the account exists. A failure shows one danger Alert, which takes focus.
 */
export function ForgotPasswordScreen({ onRequest }: ForgotPasswordScreenProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  })

  const [submitError, setSubmitError] = useState<{ message: string } | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (submitError) alertRef.current?.focus()
  }, [submitError])

  const submit = handleSubmit(async ({ email }) => {
    setSubmitError(null)
    const trimmed = email.trim()
    try {
      await onRequest(trimmed)
      setSentTo(trimmed)
    } catch (error) {
      // A new object each time, so the same message focuses the alert again
      setSubmitError({ message: error instanceof Error ? error.message : 'Something went wrong. Try again.' })
    }
  })

  if (sentTo) return <LinkSent email={sentTo} />

  return (
    <AuthLayout>
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-heading-h2 text-text-primary lg:text-heading-h1">Reset your password</h1>
          <p className="text-body-base text-text-muted">
            Enter the email you signed up with and we’ll send you a link to choose a new password.
          </p>
        </div>

        {submitError && (
          <Alert ref={alertRef} tone="danger">
            {submitError.message}
          </Alert>
        )}

        <FormField label="Email" error={errors.email?.message}>
          <Input {...register('email')} type="email" autoComplete="email" inputMode="email" />
        </FormField>

        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>

        <p className="flex flex-wrap justify-center gap-x-1 text-body-small text-text-muted">
          Remembered it?
          <Link to="/login" className={cn('rounded-sm text-label-small text-text-link underline', focusRing)}>
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

/** After a request: the same words whether or not there's an account for the email */
function LinkSent({ email }: { email: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  // The form is gone, so focus would fall to the body; start screen readers at the new heading
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-heading-h2 text-text-primary outline-none lg:text-heading-h1"
          >
            Check your email
          </h1>
          <p className="text-body-base text-text-muted">
            If there’s an account for <span className="font-semibold text-text-primary">{email}</span>, we’ve sent
            it a link to choose a new password. The link works for an hour.
          </p>
        </div>
        <Link to="/login" className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}>
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}

/** The `/forgot-password` route */
export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const demo = getDemoCredentials()

  return (
    <ForgotPasswordScreen
      onRequest={async (email) => {
        // Its password can't change, and its address has no inbox to send to
        if (demo && email.toLowerCase() === demo.email.toLowerCase()) {
          throw new Error('The demo account’s password can’t be changed. Use Try the demo on the sign-in page.')
        }
        const { error } = await requestPasswordReset(email, `${window.location.origin}/reset-password`)
        if (error) throw new Error(error.message)
      }}
    />
  )
}
