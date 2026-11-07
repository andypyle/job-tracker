import { expect, signIn, signInWithForm, sql, test } from './fixtures'

test('the sidebar opens Settings, and a new name shows there and survives a reload', async ({ page, user }) => {
  await signIn(page, user)
  const sidebar = page.getByRole('complementary')
  await sidebar.getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL('/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()

  const profile = page.getByRole('region', { name: 'Profile' })
  await profile.getByLabel('Full name').fill('Morgan Example')
  await profile.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Name saved')).toBeVisible()
  await expect(sidebar.getByText('Morgan Example')).toBeVisible()

  await page.reload()
  await expect(profile.getByLabel('Full name')).toHaveValue('Morgan Example')
})

test('the Unlikely cutoff saves, and Never is stored as null', async ({ page, user }) => {
  await signIn(page, user)
  await page.goto('/settings')
  const tracking = page.getByRole('region', { name: 'Tracking' })
  const select = tracking.getByRole('combobox', { name: 'Move to Unlikely after' })
  // A new user has the default
  await expect(select).toHaveText('14 days')

  await select.click()
  await page.getByRole('option', { name: 'Never' }).click()
  await tracking.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Applications stay in Applied until you move them.')).toBeVisible()

  const rows = await sql('SELECT unlikely_after_days FROM user_settings WHERE user_id = $1', [user.id])
  expect(rows).toEqual([{ unlikely_after_days: null }])

  await page.reload()
  await expect(select).toHaveText('Never')

  await select.click()
  await page.getByRole('option', { name: '30 days' }).click()
  await tracking.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Applications move to Unlikely after 30 days in Applied.')).toBeVisible()
  await page.reload()
  await expect(select).toHaveText('30 days')
})

test('a new password works at the next sign-in', async ({ page, user }) => {
  await signIn(page, user)
  await page.goto('/settings')
  const section = page.getByRole('region', { name: 'Password' })
  const password = `new-${user.password}`
  await section.getByLabel('Current password').fill(user.password)
  await section.getByLabel('New password', { exact: true }).fill(password)
  await section.getByLabel('Confirm new password').fill(password)
  await section.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed')).toBeVisible()

  await page.getByRole('complementary').getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await signInWithForm(page, { email: user.email, password })
})

test('deleting the account removes the user and their applications, then signs out', async ({ page, user }) => {
  await sql(
    `INSERT INTO applications (user_id, job_title, company, date_applied) VALUES ($1, 'Platform Engineer', 'Example Corp', '2026-10-01')`,
    [user.id],
  )

  await signIn(page, user)
  await page.goto('/settings')
  await page.getByRole('region', { name: 'Delete account' }).getByRole('button', { name: 'Delete account' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Delete your account?' })
  await expect(dialog).toContainText('Your 1 application')
  const confirm = dialog.getByRole('button', { name: 'Delete account' })
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel('Type your email to confirm').fill(user.email)
  await confirm.click()

  await expect(page).toHaveURL('/login')
  expect(await sql('SELECT id FROM neon_auth."user" WHERE id = $1', [user.id])).toEqual([])
  expect(await sql('SELECT id FROM applications WHERE user_id = $1', [user.id])).toEqual([])

  // The old session is gone: the app sends you back to sign in
  await page.goto('/settings')
  await expect(page).toHaveURL('/login')
})
