import type { User } from '@supabase/supabase-js'

/**
 * The public demo account: `app_metadata.demo` is true. Only the service role can set it.
 * Its profile, email and password can't change, uploads are off, and its data resets nightly.
 */
export function isDemoUser(user: Pick<User, 'app_metadata'> | null | undefined): boolean {
  return user?.app_metadata?.demo === true
}

/**
 * The demo account's sign-in, for Login's "Try the demo". Undefined unless both
 * VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD are set, which hides the button.
 */
export function getDemoCredentials(
  env: Record<string, string | undefined> = {
    VITE_DEMO_EMAIL: window.__env__?.VITE_DEMO_EMAIL || (import.meta.env.VITE_DEMO_EMAIL as string | undefined),
    VITE_DEMO_PASSWORD: window.__env__?.VITE_DEMO_PASSWORD || (import.meta.env.VITE_DEMO_PASSWORD as string | undefined),
  },
): { email: string; password: string } | undefined {
  const email = env.VITE_DEMO_EMAIL
  const password = env.VITE_DEMO_PASSWORD
  return email && password ? { email, password } : undefined
}
