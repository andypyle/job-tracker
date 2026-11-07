import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
import { neonEnv } from './env'

export interface TestUser {
  id: string
  email: string
  password: string
  /** The session cookie from sign-up, so a test can start signed in without the form */
  session: Cookie
}

type Cookie = Parameters<BrowserContext['addCookies']>[0][number]

/** The seeded demo account on the dev branch. Read-only: tests that change data use `user`. */
export const demoUser = { email: 'demo@example.com', password: 'demo-password' }

/** Neon Auth only answers trusted origins; the branch allows localhost by default */
const ORIGIN = 'http://localhost:4173'

/** Runs one statement on the branch, as the database owner. */
export async function sql<Row extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  // Neon's strings say sslmode=require, which pg treats as verify-full and warns about; say so
  const client = new pg.Client({ connectionString: neonEnv.DATABASE_URL.replace('sslmode=require', 'sslmode=verify-full') })
  await client.connect()
  try {
    return (await client.query<Row>(text, values)).rows
  } finally {
    await client.end()
  }
}

/**
 * Refuses a database with real-looking users: only e2e-… test users, smoke-… users and the demo
 * belong on an E2E branch. Stops a run against production, or a copy of it, before it starts.
 */
export async function assertDisposable() {
  const [{ others }] = await sql<{ others: string }>(
    `SELECT count(*) AS others FROM neon_auth."user"
     WHERE email NOT LIKE 'e2e-%' AND email NOT LIKE 'smoke-%' AND email <> $1`,
    [demoUser.email],
  )
  if (Number(others) > 0) {
    throw new Error('This database has real users. Run the E2E tests on a throwaway branch of dev (see e2e/env.ts).')
  }
}

const authBase = neonEnv.NEON_AUTH_BASE_URL.replace(/\/$/, '')

/**
 * Calls the branch's Neon Auth directly, as a browser on the E2E origin would. Neon Auth answers
 * bursts of sign-ins and sign-ups (about ten at once) with 429 for a while, so this backs off and
 * retries rather than failing the test.
 */
export async function authRequest(path: string, body?: unknown, cookie?: string) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${authBase}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status !== 429 || attempt === 6) {
      return { response, cookie: response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ') }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))
  }
}

/** The session cookie from a Neon Auth response, in the shape Playwright's addCookies takes */
function sessionCookie(response: Response): Cookie {
  const header = response.headers.getSetCookie().find((c) => c.includes('session_token='))
  if (!header) throw new Error('Neon Auth sent no session cookie')
  const [pair] = header.split(';')
  const separator = pair.indexOf('=')
  return {
    name: pair.slice(0, separator),
    value: pair.slice(separator + 1),
    domain: new URL(authBase).hostname,
    path: '/',
    httpOnly: true,
    secure: true,
    // The app and Neon Auth are different sites
    sameSite: 'None',
    // Neon Auth's cookies are partitioned (CHIPS), keyed by the app's site. Without the same key
    // this would be a second cookie that sign-out doesn't clear, and a later sign-in would send
    // both: the server reads the stale one and the user looks signed out.
    partitionKey: `${new URL(ORIGIN).protocol}//${new URL(ORIGIN).hostname}`,
  }
}

/** Signs a user up through Neon Auth. Returns their id and session cookie. */
export async function createUser(email: string, password: string, name = 'E2E Tester') {
  const { response } = await authRequest('/sign-up/email', { name, email, password })
  if (!response.ok) throw new Error(`Sign-up failed: ${response.status} ${await response.text()}`)
  const { user } = (await response.json()) as { user: { id: string } }
  return { id: user.id, session: sessionCookie(response) }
}

/** Deletes users and, through the cascade, their sessions, applications, history and settings */
export async function deleteUsers(where: { ids?: string[]; emails?: string[] }) {
  if (where.ids?.length) await sql('DELETE FROM neon_auth."user" WHERE id = ANY($1::uuid[])', [where.ids])
  if (where.emails?.length) await sql('DELETE FROM neon_auth."user" WHERE email = ANY($1::text[])', [where.emails])
}

/**
 * Starts the page signed in as a test user, with the session from their sign-up. Skips the form,
 * and the Neon Auth rate limit that a form sign-in per test runs into.
 */
export async function signIn(page: Page, user: TestUser) {
  await page.context().addCookies([user.session])
  await page.goto('/')
  await expect(page).toHaveURL('/')
}

/** Signs in through the Login form, for tests about signing in */
export async function signInWithForm(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
}

export const test = base.extend<{ user: TestUser }>({
  // A user of its own for each test; deleting it cascades to its applications
  user: async ({}, use) => {
    const email = `e2e-${randomUUID()}@example.com`
    const password = `pw-${randomUUID()}`
    const { id, session } = await createUser(email, password)
    await use({ id, email, password, session })
    await deleteUsers({ ids: [id] })
  },
})

export { expect }
