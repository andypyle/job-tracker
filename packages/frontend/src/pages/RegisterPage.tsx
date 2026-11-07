import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert } from '../components/Alert/Alert'
import { AuthLayout } from '../components/AuthLayout/AuthLayout'
import { Button } from '../components/Button/Button'
import { buttonVariants } from '../components/Button/Button.variants'
import { FormField } from '../components/FormField/FormField'
import { Input } from '../components/Input/Input'
import { PasswordInput } from '../components/PasswordInput/PasswordInput'
import { focusRing } from '../lib/classes'
import { cn } from '../lib/cn'
import { useAuth } from '../hooks/useAuth'
import { MIN_PASSWORD_LENGTH, passwordPair } from '../lib/passwords'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name'),
    email: z.string().trim().min(1, 'Enter your email').email('Enter an email like name@example.com'),
  })
  .and(passwordPair)

type SignUpValues = z.infer<typeof schema>

/**
 * What a sign-up came to. `signed-in` needs nothing from the screen (the page navigates);
 * `check-email` means the email has to be verified first (off on Neon Auth unless "Verify email at
 * sign-up" is turned on); `email-taken` marks the email field.
 */
export type SignUpResult = 'signed-in' | 'check-email' | 'email-taken'

export interface SignUpScreenProps {
  /** Creates the account, or throws an Error whose message the screen shows above the fields */
  onSignUp: (name: string, email: string, password: string) => Promise<SignUpResult>
}

const emailTaken = 'There’s already an account with this email. Sign in instead?'

/**
 * The Sign up screen without the auth wiring. Fields show errors on blur or submit, and
 * submitting moves focus to the first invalid one. An email that's already registered is a
 * field error; any other failure is one danger Alert, which takes focus.
 */
export function SignUpScreen({ onSignUp }: SignUpScreenProps) {
  const {
    register,
    handleSubmit,
    setError,
    trigger,
    getFieldState,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<SignUpValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const [submitError, setSubmitError] = useState<{ message: string } | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (submitError) alertRef.current?.focus()
  }, [submitError])

  const submit = handleSubmit(async ({ name, email, password }) => {
    setSubmitError(null)
    try {
      const result = await onSignUp(name, email, password)
      if (result === 'email-taken') setError('email', { message: emailTaken }, { shouldFocus: true })
      if (result === 'check-email') setSentTo(email)
    } catch (error) {
      // A new object each time, so the same message focuses the alert again
      setSubmitError({ message: error instanceof Error ? error.message : 'Something went wrong. Try again.' })
    }
  })

  if (sentTo) return <CheckEmail email={sentTo} />

  return (
    <AuthLayout>
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-heading-h2 text-text-primary lg:text-heading-h1">Create your account</h1>
          <p className="text-body-base text-text-muted">A few details and you’re in.</p>
        </div>

        {submitError && (
          <Alert ref={alertRef} tone="danger">
            {submitError.message}
          </Alert>
        )}

        <FormField label="Name" error={errors.name?.message}>
          <Input {...register('name')} autoComplete="name" />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input {...register('email')} type="email" autoComplete="email" inputMode="email" />
        </FormField>
        <FormField
          label="Password"
          hint={`Use at least ${MIN_PASSWORD_LENGTH} characters.`}
          error={errors.password?.message}
        >
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
        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput {...register('confirmPassword')} autoComplete="new-password" />
        </FormField>

        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="flex flex-wrap justify-center gap-x-1 text-body-small text-text-muted">
          Already have an account?
          <Link to="/login" className={cn('rounded-sm text-label-small text-text-link underline', focusRing)}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

/** Shown when Supabase wants the email confirmed before the first sign-in (Figma: Sign up, check your email) */
function CheckEmail({ email }: { email: string }) {
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
            We sent a link to <span className="font-semibold text-text-primary">{email}</span>. Open it to finish
            setting up your account, then sign in.
          </p>
        </div>
        <Link to="/login" className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}>
          Go to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  return (
    <SignUpScreen
      onSignUp={async (name, email, password) => {
        const { signedIn, error } = await signUp(name, email, password)
        if (error?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || error?.code === 'USER_ALREADY_EXISTS') {
          return 'email-taken'
        }
        if (error) throw new Error(error.message)
        if (signedIn) {
          navigate('/')
          return 'signed-in'
        }
        return 'check-email'
      }}
    />
  )
}
