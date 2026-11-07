import { assertDisposable } from './fixtures'

/** Runs once before any test: refuse a database with real users (see fixtures.ts) */
export default async function globalSetup() {
  await assertDisposable()
}
