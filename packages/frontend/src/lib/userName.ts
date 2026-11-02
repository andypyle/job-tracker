import type { User } from '@supabase/supabase-js'

/**
 * The user's name from `user_metadata.full_name`, collected at sign-up.
 * Accounts made before that fall back to the part of the email before the @.
 * Returns '' when there's neither.
 */
export function getDisplayName(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): string {
  const fullName: unknown = user?.user_metadata?.full_name
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim().replace(/\s+/g, ' ')
  return user?.email?.split('@')[0] ?? ''
}

/** The first word of the display name, for "Welcome, {first name}". */
export function getFirstName(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): string {
  return getDisplayName(user).split(' ')[0]
}
