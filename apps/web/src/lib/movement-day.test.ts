import { describe, expect, it } from 'vitest'
import { formatDayHeading, formatShortDay, localDay, movementDay } from './movement-day'

describe('localDay', () => {
  it('uses Buenos Aires day near UTC midnight', () => {
    expect(localDay('2026-10-23T00:30:00.000Z')).toBe('2026-10-22')
    expect(localDay('2026-10-23T03:00:00.000Z')).toBe('2026-10-23')
  })
})

describe('movementDay', () => {
  it('keeps createdAt day inside the viewed month', () => {
    expect(movementDay({ createdAt: '2026-10-05T15:00:00.000Z' }, '2026-10')).toBe('2026-10-05')
  })
  it('projects day-of-month into later months for recurring entries', () => {
    expect(movementDay({ createdAt: '2026-09-05T15:00:00.000Z' }, '2026-10')).toBe('2026-10-05')
  })
  it('projects into the effective month when registered later', () => {
    expect(movementDay({ createdAt: '2026-10-02T15:00:00.000Z' }, '2026-09')).toBe('2026-09-02')
  })
  it('clamps to the last day of shorter months', () => {
    expect(movementDay({ createdAt: '2026-10-31T15:00:00.000Z' }, '2026-11')).toBe('2026-11-30')
    expect(movementDay({ createdAt: '2026-01-31T15:00:00.000Z' }, '2027-02')).toBe('2027-02-28')
  })
})

describe('formatters', () => {
  it('formats day heading and short day', () => {
    expect(formatDayHeading('2026-10-23')).toBe('Viernes 23')
    expect(formatShortDay('2026-10-05')).toBe('05 oct')
  })
})
