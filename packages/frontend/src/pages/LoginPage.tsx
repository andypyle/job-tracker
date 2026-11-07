import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert } from '../components/Alert/Alert'
import { AuthLayout } from '../components/AuthLayout/AuthLayout'
import { Button } from '../components/Button/Button'
import { FormField } from '../components/FormField/FormField'
import { Input } from '../components/Input/Input'
import { PasswordInput } from '../components/PasswordInput/PasswordInput'
import { focusRing } from '../lib/classes'
import { cn } from '../lib/cn'
import { getDemoCredentials } from '../lib/demo'
import { useAuth, type AuthFailure } from '../hooks/useAuth'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter an email like name@example.com'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginValues = z.infer<typeof schema>

export interface LoginScreenProps {
  /** Signs in, or throws an Error whose message the screen shows above the fields */
  onSignIn: (email: string, password: string) => Promise<void>
  /** Signs in to the demo account, or throws like `onSignIn`. Leave out to hide "Try the demo". */
  onTryDemo?: () => Promise<void>
}

/**
 * The Login screen without the auth wiring. A failed sign-in shows one danger Alert (which
 * takes focus), keeps the email and clears the password; the fields themselves show no error.
 */
export function LoginScreen({ onSignIn, onTryDemo }: LoginScreenProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const [submitError, setSubmitError] = useState<{ message: string } | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (submitError) alertRef.current?.focus()
  }, [submitError])

  // A new object each time, so the same message focuses the alert again
  const fail = (error: unknown) =>
    setSubmitError({ message: error instanceof Error ? error.message : 'Something went wrong. Try again.' })

  const submit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null)
    try {
      await onSignIn(email, password)
    } catch (error) {
      setValue('password', '')
      fail(error)
    }
  })

  const [openingDemo, setOpeningDemo] = useState(false)
  const tryDemo = async () => {
    if (!onTryDemo) return
    setSubmitError(null)
    setOpeningDemo(true)
    try {
      await onTryDemo()
    } catch (error) {
      fail(error)
      setOpeningDemo(false)
    }
  }

  return (
    <AuthLayout>
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-heading-h2 text-text-primary lg:text-heading-h1">Sign in</h1>
          <p className="text-body-base text-text-muted">Welcome back. Pick up where you left off.</p>
        </div>

        {submitError && (
          <Alert ref={alertRef} tone="danger">
            {submitError.message}
          </Alert>
        )}

        <FormField label="Email" error={errors.email?.message}>
          <Input {...register('email')} type="email" autoComplete="email" inputMode="email" />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <PasswordInput {...register('password')} autoComplete="current-password" placeholder="Password" />
        </FormField>

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="primary" disabled={isSubmitting || openingDemo} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
          {onTryDemo && (
            <Button variant="secondary" onClick={tryDemo} disabled={isSubmitting || openingDemo} className="w-full">
              {openingDemo ? 'Opening the demo…' : 'Try the demo'}
            </Button>
          )}
        </div>

        <p className="flex flex-wrap justify-center gap-x-1 text-body-small text-text-muted">
          Don’t have an account?
          <Link to="/register" className={cn('rounded-sm text-label-small text-text-link underline', focusRing)}>
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

// Neon Auth's wording for wrong credentials is terse; Figma's says what to do next
function signInMessage(error: AuthFailure) {
  return error.code === 'INVALID_EMAIL_OR_PASSWORD'
    ? 'That email and password don’t match. Check them and try again.'
    : error.message
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const demo = getDemoCredentials()

  return (
    <LoginScreen
      onSignIn={async (email, password) => {
        const { error } = await signIn(email, password)
        if (error) throw new Error(signInMessage(error))
        navigate('/')
      }}
      onTryDemo={
        demo &&
        (async () => {
          const { error } = await signIn(demo.email, demo.password)
          if (error) throw new Error('The demo isn’t available right now. Try again later.')
          navigate('/')
        })
      }
    />
  )
}
