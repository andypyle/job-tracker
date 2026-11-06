import { createClient } from '@supabase/supabase-js'
import { supabaseEnv } from './env'
import { admin, expect, test } from './fixtures'

test('Try the demo signs in to the demo account, whose Settings explain what’s off', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/settings')
  await expect(page.getByRole('region', { name: 'Demo account' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Profile' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Tracking' })).toBeVisible()
})

// A demo account of its own: a password change signs out the account's other sessions, even
// though the guard keeps the password, which would sign out the tests using the seeded one
test('a demo account’s name and password can’t be changed, even straight through Supabase', async ({ user }) => {
  await admin.auth.admin.updateUserById(user.id, { app_metadata: { demo: true } })
  const client = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword(user)
  if (error) throw error

  // Auth may report success: the database guard undoes the change rather than refusing it
  await client.auth.updateUser({ data: { full_name: 'Not the demo' }, password: 'a-different-password' })

  const { data } = await admin.auth.admin.getUserById(user.id)
  expect(data.user?.user_metadata.full_name).toBeUndefined()
  const again = await client.auth.signInWithPassword(user)
  expect(again.error).toBeNull()
})
