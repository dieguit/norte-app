import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicReportServer, markPublicReportCtaClickedServer } from './informe.server'
import { getDraft, markDraftCtaClicked } from '@/features/onboarding/repository.server'
import demoReport from './demo.json'

vi.mock('@/features/onboarding/repository.server', () => ({
  getDraft: vi.fn(),
  markDraftCtaClicked: vi.fn(),
}))

describe('informe server handlers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the stored report and CTA timestamp', async () => {
    const ctaClickedOn = new Date('2026-07-28T12:00:00Z')
    vi.mocked(getDraft).mockResolvedValue({ report: demoReport, ctaClickedOn } as never)

    await expect(getPublicReportServer('real-device')).resolves.toEqual({
      report: demoReport,
      ctaClickedOn,
    })
    expect(getDraft).toHaveBeenCalledWith('real-device')
  })

  it('returns null when the draft has no report', async () => {
    vi.mocked(getDraft).mockResolvedValue(undefined as never)

    await expect(getPublicReportServer('missing')).resolves.toBeNull()
  })

  it('returns the CTA timestamp after marking the report', async () => {
    const ctaClickedOn = new Date('2026-07-28T12:00:00Z')
    vi.mocked(markDraftCtaClicked).mockResolvedValue({ report: demoReport, ctaClickedOn } as never)

    await expect(markPublicReportCtaClickedServer('real-device')).resolves.toEqual({ ctaClickedOn })
    expect(markDraftCtaClicked).toHaveBeenCalledWith('real-device')
  })

  it('rejects a CTA when the report is missing', async () => {
    vi.mocked(markDraftCtaClicked).mockResolvedValue(undefined as never)

    await expect(markPublicReportCtaClickedServer('missing')).rejects.toThrow('Report not found')
  })
})
