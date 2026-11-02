import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'

interface RegisterFormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>()

  const passwordValue = watch('password')

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    const { error } = await signUp(values.fullName, values.email, values.password)
    if (error) {
      setServerError(error.message)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
            style={{ backgroundColor: '#D1FAE5' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Check your email
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            We sent you a confirmation link. Click it to activate your account,
            then return here to sign in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-150 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="w-full max-w-sm">
        {/* App brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
              aria-hidden="true"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Create your account
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Start tracking your job applications today
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          {serverError && (
            <div
              className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Full name */}
            <div>
              <label
                htmlFor="register-full-name"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Full name
              </label>
              <input
                id="register-full-name"
                type="text"
                autoComplete="name"
                className={`form-input${errors.fullName ? ' is-error' : ''}`}
                {...register('fullName', {
                  validate: (value) => value.trim() !== '' || 'Name is required',
                })}
              />
              {errors.fullName && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                className={`form-input${errors.email ? ' is-error' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                className={`form-input${errors.password ? ' is-error' : ''}`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Confirm password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                className={`form-input${errors.confirmPassword ? ' is-error' : ''}`}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === passwordValue || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg text-white text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 mt-2"
              style={{ backgroundColor: isSubmitting ? 'var(--color-cta-hover)' : 'var(--color-cta)' }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'var(--color-cta-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'var(--color-cta)'
                }
              }}
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p
          className="mt-6 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium transition-colors duration-150"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
