import { authRequest, expect, sql, test } from './fixtures'

test('Try the demo signs in to the demo account, whose Settings explain what’s off', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/settings')
  await expect(page.getByRole('region', { name: 'Demo account' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Profile' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Tracking' })).toBeVisible()
})

// A demo account of its own, so the seeded one stays untouched for the other tests
test('a demo account’s name and password can’t be changed, even straight through Neon Auth', async ({ user }) => {
  await sql('INSERT INTO demo_users (user_id) VALUES ($1)', [user.id])
  const signedIn = await authRequest('/sign-in/email', { email: user.email, password: user.password })
  expect(signedIn.response.ok).toBe(true)

  // Neon Auth reports success: the database guard undoes the change rather than refusing it
  const renamed = await authRequest('/update-user', { name: 'Not the demo' }, signedIn.cookie)
  expect(renamed.response.ok).toBe(true)
  const changed = await authRequest(
    '/change-password',
    { currentPassword: user.password, newPassword: 'a-different-password', revokeOtherSessions: false },
    signedIn.cookie,
  )
  expect(changed.response.ok).toBe(true)

  const [row] = await sql<{ name: string }>('SELECT name FROM neon_auth."user" WHERE id = $1', [user.id])
  expect(row.name).toBe('E2E Tester')
  const again = await authRequest('/sign-in/email', { email: user.email, password: user.password })
  expect(again.response.ok).toBe(true)
  const changedTo = await authRequest('/sign-in/email', { email: user.email, password: 'a-different-password' })
  expect(changedTo.response.status).toBe(401)
})
