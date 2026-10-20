import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(path) ? [path] : []
  })
}

describe('API owns financial persistence', () => {
  it('retains only the typed legacy onboarding schema', () => {
    const source = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf8')
    expect([...source.matchAll(/export (?:const|type) (\w+)/g)].map((match) => match[1]))
      .toEqual(['onboardingDrafts', 'OnboardingDraft'])
    expect(source).toContain('$type<OnboardingAnswers>()')
    expect(source).toContain('$type<Report>()')
  })

  it('has no financial DB imports (including type imports) or API-source product imports', () => {
    const violations: string[] = []
    for (const file of sourceFiles(resolve(root, 'src'))) {
      if (/\.(test|spec)\./.test(file)) continue
      const path = relative(resolve(root, 'src'), file)
      const legacy = path.startsWith('db/') || [
        'features/onboarding/repository.server.ts', 'features/admin/results.ts',
      ].includes(path)
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/(?:from\s*|import\s*\(|require\s*\(|import\s*)['"]([^'"]+)['"]/g)) {
        const specifier = match[1]!
        const target = specifier.startsWith('.') ? resolve(dirname(file), specifier)
          : /^[@#]\//.test(specifier) ? resolve(root, 'src', specifier.slice(2)) : specifier
        if (/(?:^|\/)api\/(?:src|test)(?:\/|$)/.test(target) || /^@repo\/api(?:\/|$)/.test(specifier) ||
          (!legacy && target.startsWith(resolve(root, 'src/db')))) violations.push(`${path}: ${specifier}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('has no writable web migration registry', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    for (const script of ['db:generate', 'db:migrate', 'db:push']) expect(pkg.scripts[script]).toBeUndefined()
    expect(existsSync(resolve(root, 'drizzle.config.ts'))).toBe(false)
    expect(existsSync(resolve(root, 'drizzle'))).toBe(false)
  })

  it('keeps the transitive /app source graph outside legacy persistence', () => {
    const visited = new Set<string>()
    function visit(file: string) {
      if (visited.has(file)) return
      visited.add(file)
      expect(relative(root, file)).not.toMatch(/^src\/db\/|^src\/features\/(onboarding|admin)\//)
      for (const match of readFileSync(file, 'utf8').matchAll(/(?:from\s*|import\s*\(|require\s*\(|import\s*)['"]([^'"]+)['"]/g)) {
        const specifier = match[1]!
        const target = specifier.startsWith('.') ? resolve(dirname(file), specifier)
          : /^[@#]\//.test(specifier) ? resolve(root, 'src', specifier.slice(2)) : undefined
        if (!target) continue
        const dependency = [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]
          .find((path) => /\.[jt]sx?$/.test(path) && existsSync(path))
        if (dependency) visit(dependency)
      }
    }
    for (const file of sourceFiles(resolve(root, 'src/routes/app'))) {
      if (!/\.(test|spec)\.|test-support\./.test(file)) visit(file)
    }
  })

  it('never exposes test fixture connections through API product code', () => {
    for (const file of sourceFiles(resolve(root, '../api/src'))) {
      if (/\.(test|spec)\./.test(file)) continue
      expect(readFileSync(file, 'utf8')).not.toMatch(/(?:from\s*|import\s*\()['"][^'"]*(?:\/test\/|fixture-database)/)
    }
  })
});
