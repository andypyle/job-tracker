import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'

declare global {
  interface Window { __env__?: Record<string, string> }
}

const authUrl = window.__env__?.VITE_NEON_AUTH_URL || import.meta.env.VITE_NEON_AUTH_URL as string

if (!authUrl) {
  throw new Error('Missing VITE_NEON_AUTH_URL: the branch’s Neon Auth URL, ending in /auth. Set it in .env')
}

/**
 * Neon Auth (Managed Better Auth): sign-in state only. All data goes through the FastAPI backend
 * via lib/api.ts. Better Auth's method set (`signIn.email`, `useSession`, `changePassword`…),
 * not the Supabase-compatible adapter.
 */
export const authClient = createAuthClient(authUrl, { adapter: BetterAuthReactAdapter() })

/**
 * The JWT for the backend. Neon's wrapper puts it on `session.token` (from the `set-auth-jwt`
 * header) and caches the session until the JWT expires, so this refetches about every 15 minutes.
 * Null when signed out.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await authClient.getSession()
  return data?.session.token ?? null
}
