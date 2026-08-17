import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it('keeps informe server handlers server-only', async () => {
  const source = await readFile(new URL('./informe.server.ts', import.meta.url), 'utf8')

  expect(source).toMatch(/^import ['"]@tanstack\/react-start\/server-only['"]$/m)
})
