import { defineConfig, devices } from '@playwright/test'
import { supabaseEnv } from './e2e/env'
import { demoUser } from './e2e/fixtures'

// End-to-end tests against the real stack: a local Supabase (`supabase start` from the repo root),
// the FastAPI backend and a production build of the frontend. Ports differ from the dev servers
// (8000, 5173) so both can run at once.
const FRONTEND_URL = 'http://localhost:4173'
const API_URL = 'http://localhost:8001'

export default defineConfig({
  testDir: './e2e',
  // *.e2e.ts, so Vitest (which collects *.spec.ts and *.test.ts) leaves them alone
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Uses whichever Python is active: the backend's .venv locally, setup-python in CI
      command: 'python -m uvicorn app.main:app --port 8001',
      cwd: '../../backend',
      url: `${API_URL}/health`,
      env: {
        SUPABASE_URL: supabaseEnv.url,
        SUPABASE_ANON_KEY: supabaseEnv.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: supabaseEnv.serviceRoleKey,
        FRONTEND_URL,
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      // vite build skips tsc; the CI frontend job typechecks
      command: 'pnpm exec vite build && pnpm exec vite preview --port 4173 --strictPort',
      url: FRONTEND_URL,
      env: {
        VITE_SUPABASE_URL: supabaseEnv.url,
        VITE_SUPABASE_ANON_KEY: supabaseEnv.anonKey,
        VITE_API_BASE_URL: API_URL,
        VITE_DEMO_EMAIL: demoUser.email,
        VITE_DEMO_PASSWORD: demoUser.password,
      },
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
