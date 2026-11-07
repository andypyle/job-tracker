/*
 * Whether the signed-in user is the public demo comes from the backend (GET /account, see
 * useAccount): it's a row in demo_users, which the Neon Auth session and JWT don't carry.
 */

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
