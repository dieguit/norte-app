import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('goals server boundaries', () => {
  it.each(['goals.server.ts', 'goals.repository.server.ts'])(
    'keeps %s server-only with server-only banner',
    async (filename) => {
      const source = await readFile(new URL(`./${filename}`, import.meta.url), 'utf8')

      expect(source).toMatch(/^import ['"]@tanstack\/react-start\/server-only['"]/)
    },
  )

  it('ensures domain logic file goals.ts never imports server-only modules', async () => {
    const source = await readFile(new URL('./goals.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/\.server/)
    expect(source).not.toMatch(/@tanstack\/react-start\/server-only/)
  })

  it('ensures no route files import *.server modules directly', async () => {
    const routesDir = new URL('../../routes', import.meta.url).pathname
    async function scanDir(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true })
      const files: string[] = []
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...(await scanDir(fullPath)))
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath)
        }
      }
      return files
    }

    const routeFiles = await scanDir(routesDir)
    for (const filePath of routeFiles) {
      const content = await readFile(filePath, 'utf8')
      expect(content).not.toMatch(/from\s+['"][^'"]*\.server(\.ts)?['"]/)
    }
  })
})
