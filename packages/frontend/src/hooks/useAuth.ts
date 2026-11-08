import { authClient } from '../lib/auth'

/** The signed-in user, as the app uses it. `name` is required at sign-up. */
export interface AuthUser {
  id: string
  name: string
  email: string
}

/** A failed auth call. `code` is Neon Auth's (Better Auth's), e.g. INVALID_EMAIL_OR_PASSWORD. */
export interface AuthFailure {
  code?: string
  message: string
}

type Result = Promise<{ error: AuthFailure | null }>

interface UseAuthReturn {
  user: AuthUser | null
  /** True until the first session check finishes */
  loading: boolean
  signIn: (email: string, password: string) => Result
  /** `signedIn` is false when Neon Auth wants the email verified first */
  signUp: (name: string, email: string, password: string) => Promise<{ signedIn: boolean; error: AuthFailure | null }>
  /**
   * Ends the session. After the account is deleted the server-side session is already gone, so
   * a failure is ignored and the session is re-read, which comes back empty.
   */
  signOut: () => Promise<void>
  /** Saves the name. Every useAuth user sees the change. */
  updateName: (name: string) => Result
  /** Neon Auth needs the current password to set a new one. Other sessions stay signed in. */
  changePassword: (currentPassword: string, newPassword: string) => Result
  /**
   * Emails a reset link if there's an account for `email`, and answers the same either way, so
   * it doesn't reveal who has one. The link opens `redirectTo?token=…`, or `?error=INVALID_TOKEN`
   * once it's used or expired (after an hour).
   */
  requestPasswordReset: (email: string, redirectTo: string) => Result
  /** Sets a new password with the token from the link. INVALID_TOKEN when it's used or expired. */
  resetPassword: (token: string, newPassword: string) => Result
}

function failure(error: { code?: string; message?: string; statusText?: string } | null | undefined): AuthFailure | null {
  if (!error) return null
  return { code: error.code, message: error.message || error.statusText || 'Something went wrong. Try again.' }
}

/**
 * Calls an auth method that may also throw: Neon's wrapper throws on an HTTP error. Its thrown
 * error's `code` is a Supabase-style one (INVALID_TOKEN becomes bad_jwt); Better Auth's own code,
 * which the callers check, is on `.error.code`.
 */
async function attempt<T>(call: () => Promise<{ data: T; error: Parameters<typeof failure>[0] }>) {
  try {
    const { data, error } = await call()
    return { data, error: failure(error) }
  } catch (err) {
    const thrown = err as { code?: string; message?: string; error?: { code?: string; message?: string } } | undefined
    return {
      data: null,
      error: failure({
        code: thrown?.error?.code ?? thrown?.code,
        message: thrown?.error?.message ?? thrown?.message,
      }),
    }
  }
}

/** Sign-in state from Neon Auth (Managed Better Auth), shared by every component that uses it */
export function useAuth(): UseAuthReturn {
  const session = authClient.useSession()
  const sessionUser = session.data?.user
  const user = sessionUser ? { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email } : null

  return {
    user,
    loading: session.isPending,

    // Each waits for the session to refresh before resolving, so a caller that navigates to a
    // protected route right after doesn't find the old (signed-out) state and bounce back
    signIn: async (email, password) => {
      const { error } = await attempt(() => authClient.signIn.email({ email, password }))
      if (!error) await session.refetch()
      return { error }
    },

    signUp: async (name, email, password) => {
      const { data, error } = await attempt(() => authClient.signUp.email({ name: name.trim(), email, password }))
      // No token: the branch requires a verified email before the first sign-in
      const signedIn = Boolean(data && 'token' in data && data.token)
      if (signedIn) await session.refetch()
      return { signedIn, error }
    },

    signOut: async () => {
      await attempt(() => authClient.signOut())
      await session.refetch()
    },

    updateName: async (name) => {
      const { error } = await attempt(() => authClient.updateUser({ name: name.trim() }))
      if (!error) await session.refetch()
      return { error }
    },

    changePassword: async (currentPassword, newPassword) => {
      const { error } = await attempt(() =>
        authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false }),
      )
      return { error }
    },

    requestPasswordReset: async (email, redirectTo) => {
      const { error } = await attempt(() => authClient.requestPasswordReset({ email, redirectTo }))
      return { error }
    },

    resetPassword: async (token, newPassword) => {
      const { error } = await attempt(() => authClient.resetPassword({ token, newPassword }))
      return { error }
    },
  }
}
