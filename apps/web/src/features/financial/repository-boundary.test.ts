import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it.each(['repository.server.ts', 'incomes.repository.server.ts', 'expenses.repository.server.ts'])(
  'keeps %s database repository out of browser bundles',
  async (filename) => {
    const source = await readFile(new URL(`./${filename}`, import.meta.url), 'utf8')

    expect(source).toMatch(/^import ['"]@tanstack\/react-start\/server-only['"]/)
  },
)
