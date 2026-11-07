import type { AuthUser } from '../hooks/useAuth'

/**
 * The user's name, collected at sign-up. Falls back to the part of the email before the @ when
 * the name is blank. Returns '' when there's neither.
 */
export function getDisplayName(user: Pick<AuthUser, 'email' | 'name'> | null | undefined): string {
  const name = user?.name
  if (typeof name === 'string' && name.trim()) return name.trim().replace(/\s+/g, ' ')
  return user?.email?.split('@')[0] ?? ''
}

/** The first word of the display name, for "Welcome, {first name}". */
export function getFirstName(user: Pick<AuthUser, 'email' | 'name'> | null | undefined): string {
  return getDisplayName(user).split(' ')[0]
}
