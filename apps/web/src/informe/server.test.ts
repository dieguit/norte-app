import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicReport, markPublicReportCtaClicked } from './server'
import { getDraft, markDraftCtaClicked } from '../onboarding/repository'
import demoReport from './demo.json'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => {
    let validator: ((input: unknown) => unknown) | undefined
    const builder = {
      validator: vi.fn().mockImplementation((fn) => {
        validator = fn
        return builder
      }),
      handler: vi.fn().mockImplementation((handler) => vi.fn(async (arg) =>
        handler({ ...arg, data: validator ? validator(arg?.data) : arg?.data }),
      )),
    }
    return builder
  }),
}))

vi.mock('../onboarding/repository', () => ({
  getDraft: vi.fn(),
  markDraftCtaClicked: vi.fn(),
}))

describe('getPublicReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns only the report and CTA timestamp for a stored report', async () => {
    const ctaClickedOn = new Date('2026-07-28T12:00:00Z')
    vi.mocked(getDraft).mockResolvedValue({ report: demoReport, ctaClickedOn } as never)

    await expect(getPublicReport({ data: { deviceId: 'real-device' } })).resolves.toEqual({
      report: demoReport,
      ctaClickedOn,
    })
    expect(getDraft).toHaveBeenCalledWith('real-device')
  })

  it('returns null when the draft is missing or has no report', async () => {
    vi.mocked(getDraft).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ report: null } as never)

    await expect(getPublicReport({ data: { deviceId: 'missing' } })).resolves.toBeNull()
    await expect(getPublicReport({ data: { deviceId: 'empty' } })).resolves.toBeNull()
  })

  it('marks the CTA and returns the first stored timestamp', async () => {
    const ctaClickedOn = new Date('2026-07-28T12:00:00Z')
    vi.mocked(markDraftCtaClicked).mockResolvedValue({ report: demoReport, ctaClickedOn } as never)

    await expect(markPublicReportCtaClicked({ data: { deviceId: 'real-device' } })).resolves.toEqual({ ctaClickedOn })
    expect(markDraftCtaClicked).toHaveBeenCalledWith('real-device')
  })

  it('rejects a click for a missing report', async () => {
    vi.mocked(markDraftCtaClicked).mockResolvedValue(undefined as never)

    await expect(markPublicReportCtaClicked({ data: { deviceId: 'missing' } })).rejects.toThrow('Report not found')
  })
})
