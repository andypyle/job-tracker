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
  signOut: () => Promise<void>
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

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  }
}
