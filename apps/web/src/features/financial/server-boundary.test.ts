import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it.each(['auth.server.ts', 'financial.server.ts', 'incomes.server.ts', 'expenses.server.ts'])('keeps %s server-only', async (filename) => {
  const source = await readFile(new URL(`./${filename}`, import.meta.url), 'utf8')

  expect(source).toMatch(/^import ['"]@tanstack\/react-start\/server-only['"]/)
})
