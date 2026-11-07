import { randomUUID } from 'node:crypto'
import { createUser, deleteUsers, expect, signInWithForm, sql, test } from './fixtures'

/**
 * The emailed link carries a token, which Neon Auth keeps in neon_auth.verification as
 * `reset-password:<token>` with the user's id as the value. Reading it there stands in for
 * opening the email; the link itself redirects to /reset-password?token=<token>.
 */
async function latestResetToken(userId: string) {
  const rows = await sql<{ identifier: string }>(
    `SELECT identifier FROM neon_auth.verification
     WHERE identifier LIKE 'reset-password:%' AND value = $1
     ORDER BY "createdAt" DESC LIMIT 1`,
    [userId],
  )
  expect(rows, 'Neon Auth stored a reset token').toHaveLength(1)
  return rows[0].identifier.slice('reset-password:'.length)
}

test('a forgotten password can be reset from the emailed link, once', async ({ page }) => {
  // Resend's test inbox: really sent, never delivered anywhere
  const email = `delivered+e2e-${randomUUID()}@resend.dev`
  const { id } = await createUser(email, 'the-old-password')
  try {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL('/forgot-password')
    // The URL changes before the new page renders; Login's Email field is still there until it does
    await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible()

    const token = await latestResetToken(id)
    await page.goto(`/reset-password?token=${token}`)
    await page.getByLabel('New password', { exact: true }).fill('the-new-password')
    await page.getByLabel('Confirm new password').fill('the-new-password')
    await page.getByRole('button', { name: 'Set new password' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Password changed' })).toBeVisible()

    // The link works once
    await page.goto(`/reset-password?token=${token}`)
    await page.getByLabel('New password', { exact: true }).fill('yet-another-password')
    await page.getByLabel('Confirm new password').fill('yet-another-password')
    await page.getByRole('button', { name: 'Set new password' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'This link has expired' })).toBeVisible()

    await signInWithForm(page, { email, password: 'the-new-password' })
  } finally {
    await deleteUsers({ ids: [id] })
  }
})

test('a reset link Neon Auth has already rejected offers a new one', async ({ page }) => {
  await page.goto('/reset-password?error=INVALID_TOKEN')
  await expect(page.getByRole('heading', { level: 1, name: 'This link has expired' })).toBeVisible()
  await page.getByRole('link', { name: 'Send a new link' }).click()
  await expect(page).toHaveURL('/forgot-password')
})
