import { useQuery } from '@tanstack/react-query'
import { getAccount } from '../lib/api'

/**
 * The signed-in user's account (GET /account): for now, whether they're the public demo.
 * `isDemo` is undefined until it loads, so callers can wait rather than guess: uploads and the
 * account sections stay hidden until it's known. It doesn't change during a session.
 */
export function useAccount() {
  const account = useQuery({ queryKey: ['account'], queryFn: getAccount, staleTime: Infinity })
  return { isDemo: account.data?.is_demo, isError: account.isError }
}
