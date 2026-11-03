import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { test as base, expect, type Page } from '@playwright/test'
import { supabaseEnv } from './env'

export interface TestUser {
  id: string
  email: string
  password: string
}

/** The seeded account (supabase/seed.sql). Read-only: tests that change data use `user`. */
export const demoUser = { email: 'demo@example.com', password: 'demo-password' }

const admin = createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function signIn(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
}

export const test = base.extend<{ user: TestUser }>({
  // A confirmed user of its own for each test; deleting it cascades to its applications
  user: async ({}, use) => {
    const email = `e2e-${randomUUID()}@example.com`
    const password = `pw-${randomUUID()}`
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    await use({ id: data.user.id, email, password })
    await admin.auth.admin.deleteUser(data.user.id)
  },
})

export { expect }
