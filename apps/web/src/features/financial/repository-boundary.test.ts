import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it('keeps the database repository out of browser bundles', async () => {
  const source = await readFile(new URL('./repository.server.ts', import.meta.url), 'utf8')

  expect(source).toMatch(/^import ['"]@tanstack\/react-start\/server-only['"]/)
})
