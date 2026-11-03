import { execSync } from 'node:child_process'
import path from 'node:path'

/**
 * The local Supabase stack's URL and keys, from `supabase status` in the repo root.
 * E2E tests create and delete users, so they refuse to run against anything but localhost.
 */
function readSupabaseEnv() {
  const output = execSync('pnpm exec supabase status -o env', {
    cwd: path.resolve(import.meta.dirname, '../../..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const vars = Object.fromEntries(
    output
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map(([, key, value]) => [key, value]),
  )
  const url = vars.API_URL
  if (!url || !vars.ANON_KEY || !vars.SERVICE_ROLE_KEY) {
    throw new Error('Local Supabase isn’t running. Start it from the repo root with `pnpm exec supabase start`.')
  }
  const { hostname } = new URL(url)
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(`E2E tests only run against a local Supabase, not ${url}`)
  }
  return { url, anonKey: vars.ANON_KEY, serviceRoleKey: vars.SERVICE_ROLE_KEY }
}

export const supabaseEnv = readSupabaseEnv()
