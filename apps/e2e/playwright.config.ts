import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

process.loadEnvFile(path.join(import.meta.dirname, '.env.test'))
const { VITE_CLERK_PUBLISHABLE_KEY: pk = '', CLERK_SECRET_KEY: sk = '' } = process.env
if (!pk.startsWith('pk_test_') || !sk.startsWith('sk_test_')) throw new Error('E2E requires Clerk development keys')

// The e2e compose stack owns this database; it is disposable by construction.
const databaseUrl = 'postgres://norte:norte@localhost:5435/norte_test'
Object.assign(process.env, {
  DATABASE_URL: databaseUrl,
  E2E_ALLOW_DISPOSABLE_DATABASE: '1',
  E2E_DISPOSABLE_DATABASE_URL: databaseUrl,
})

export const AUTH_FILE = path.join(import.meta.dirname, '.auth/user.json')

export default defineConfig({
  testDir: path.join(import.meta.dirname, 'tests'),
  globalSetup: path.join(import.meta.dirname, 'tests/global-setup.ts'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    locale: 'es-AR',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'app',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'docker compose --profile e2e --env-file apps/e2e/.env.test up --build postgres-e2e api-e2e web-e2e',
    cwd: path.join(import.meta.dirname, '../..'),
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
    timeout: 600_000,
  },
})
