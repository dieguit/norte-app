import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('keeps Norte typography utilities next to text colors', () => {
    expect(cn('text-caption', 'text-subtle-foreground')).toBe('text-caption text-subtle-foreground')
    expect(cn('text-body', 'text-heading')).toBe('text-heading')
  })
})
