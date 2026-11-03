import { useState, useEffect } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface SignUpResult {
  user: User | null
  /** Null when Supabase wants the email confirmed first */
  session: Session | null
  error: AuthError | null
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  /** Stores `fullName` in `user_metadata.full_name`; read it with `getDisplayName`. */
  signUp: (fullName: string, email: string, password: string) => Promise<SignUpResult>
  /**
   * Ends the session. `local` only forgets it in this browser, for when the server-side session
   * is already gone (a deleted account).
   */
  signOut: (scope?: 'global' | 'local') => Promise<void>
  /** Saves `fullName` to `user_metadata.full_name`. Every useAuth user sees the change. */
  updateName: (fullName: string) => Promise<{ error: AuthError | null }>
  /**
   * Starts an email change. With secure email change on, Supabase emails a link to the current
   * and the new address, and the change applies once both are opened.
   */
  updateEmail: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Initialize from existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    // Subscribe to auth state changes to keep user/session in sync
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    // Unsubscribe on cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (
    fullName: string,
    email: string,
    password: string,
  ): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    return { user: data.user, session: data.session, error }
  }

  const signOut = async (scope: 'global' | 'local' = 'global'): Promise<void> => {
    await supabase.auth.signOut({ scope })
  }

  const updateName = async (fullName: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
    return { error }
  }

  const updateEmail = async (email: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({ email: email.trim() })
    return { error }
  }

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    updateName,
    updateEmail,
    updatePassword,
  }
}
