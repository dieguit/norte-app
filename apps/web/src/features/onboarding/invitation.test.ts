import { describe, expect, it } from 'vitest'
import { getInvitedDeviceId } from './invitation'

describe('getInvitedDeviceId', () => {
  it('returns a valid invitation UUID', () => {
    expect(getInvitedDeviceId('6f0a7482-29a0-4c03-a3e1-256add2f91a8')).toBe('6f0a7482-29a0-4c03-a3e1-256add2f91a8')
  })

  it.each([undefined, '', 'not-a-uuid'])('ignores an invalid public invitation value: %s', (value) => {
    expect(getInvitedDeviceId(value)).toBeNull()
  })
})
