import { describe, expect, it } from 'vitest'
import { getNextCalendarMonth, getPreviousCalendarMonth } from './calendar'

describe('calendar helpers', () => {
  it('uses the first day of the next UTC calendar month', () => {
    expect(getNextCalendarMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2027-01')
    expect(getNextCalendarMonth(new Date('2026-06-15T12:00:00Z'))).toBe('2026-07')
  })

  it('uses the previous UTC calendar month', () => {
    expect(getPreviousCalendarMonth(new Date('2026-08-21T18:00:00Z'))).toBe('2026-07')
    expect(getPreviousCalendarMonth(new Date('2026-01-01T00:00:00Z'))).toBe('2025-12')
  })

  it('defaults to current time when no date is supplied for getPreviousCalendarMonth', () => {
    const prev = getPreviousCalendarMonth()
    expect(prev).toMatch(/^\d{4}-\d{2}$/)
  })
})
