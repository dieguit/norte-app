import { existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const envFile = path.join(import.meta.dirname, '.env.test')
if (existsSync(envFile)) process.loadEnvFile(envFile)

export const AUTH_FILE = path.join(import.meta.dirname, '.auth/user.json')

export default defineConfig({
  testDir: path.join(import.meta.dirname, 'tests'),
  globalSetup: path.join(import.meta.dirname, 'tests/global-setup.ts'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
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
  webServer: [
    {
      command: 'pnpm --filter @repo/web build && pnpm --filter @repo/web start',
      url: 'http://localhost:3100',
      env: { PORT: '3100' },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
