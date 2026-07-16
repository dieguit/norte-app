import { describe, expect, it } from 'vitest'
import { hasValidAdminCredentials } from './auth'

describe('hasValidAdminCredentials', () => {
  it('accepts the configured temporary credentials', () => {
    expect(hasValidAdminCredentials({ username: 'admin', password: 'N0rt3!' })).toBe(true)
  })

  it('rejects an invalid username or password', () => {
    expect(hasValidAdminCredentials({ username: 'other', password: 'N0rt3!' })).toBe(false)
    expect(hasValidAdminCredentials({ username: 'admin', password: 'wrong' })).toBe(false)
  })
})
