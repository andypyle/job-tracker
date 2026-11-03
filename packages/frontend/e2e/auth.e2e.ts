import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { demoUser, expect, signIn, test } from './fixtures'
import { supabaseEnv } from './env'

test('signed-out visitors are sent to the login page', async ({ page }) => {
  await page.goto('/jobs/active')
  await expect(page).toHaveURL('/login')
})

test('a new account can register and lands on the dashboard', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`
  try {
    await page.goto('/register')
    await page.getByLabel('Name').fill('Riley Tester')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery-staple')
    await page.getByLabel('Confirm password').fill('correct-horse-battery-staple')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL('/')
    // The sidebar shows who's signed in (the mobile menu has a hidden copy)
    await expect(page.getByRole('complementary').getByText(email)).toBeVisible()
  } finally {
    // Clean up the account the UI created
    const admin = createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, { auth: { persistSession: false } })
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const created = data.users.find((u) => u.email === email)
    if (created) await admin.auth.admin.deleteUser(created.id)
  }
})

test('signing out returns to the login page', async ({ page, user }) => {
  await signIn(page, user)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await page.goto('/')
  await expect(page).toHaveURL('/login')
})

test('the seeded demo account sees its applications', async ({ page }) => {
  await signIn(page, demoUser)
  await page.goto('/jobs/active')
  await expect(page.getByRole('link', { name: 'Senior Product Designer' })).toBeVisible()
  await page.goto('/jobs/rejected')
  await expect(page.getByRole('link', { name: 'UI Engineer' })).toBeVisible()
})

test('a user never sees another user’s applications', async ({ page, user }) => {
  await signIn(page, user)
  await page.goto('/jobs/active')
  await expect(page.getByRole('heading', { level: 2, name: 'Add your first application' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Senior Product Designer' })).toHaveCount(0)
})
