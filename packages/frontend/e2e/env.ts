/**
 * The Neon branch the E2E tests run against: its Postgres, Neon Auth and Object Storage, as
 * scripts/neon_branch.py prints them (CI branches `dev` once per run). Locally, make one with
 *
 *   python3 scripts/neon_branch.py create --parent dev --name e2e-$USER --storage-credential > /tmp/e2e.env
 *   set -a; . /tmp/e2e.env; set +a
 *
 * and delete it afterwards. The tests create and delete users and reset the demo account, so
 * fixtures.ts refuses a database that holds anyone but test users and the demo (see assertDisposable).
 */
const REQUIRED = [
  'DATABASE_URL',
  'NEON_AUTH_BASE_URL',
  'AWS_ENDPOINT_URL_S3',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
] as const

function readNeonEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name])
  if (missing.length) {
    throw new Error(
      `E2E tests run against a throwaway Neon branch; missing ${missing.join(', ')}. See e2e/env.ts for how to make one.`,
    )
  }
  const env = Object.fromEntries(REQUIRED.map((name) => [name, process.env[name] as string])) as Record<
    (typeof REQUIRED)[number],
    string
  >
  return { ...env, AWS_REGION: process.env.AWS_REGION ?? 'us-east-1' }
}

export const neonEnv = readNeonEnv()
