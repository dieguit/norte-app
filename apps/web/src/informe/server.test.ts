import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicReport } from './server'
import { getDraft } from '../onboarding/repository'
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

vi.mock('../onboarding/repository', () => ({ getDraft: vi.fn() }))

describe('getPublicReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the stored report for a draft', async () => {
    vi.mocked(getDraft).mockResolvedValue({ report: demoReport } as never)

    await expect(getPublicReport({ data: { deviceId: 'real-device' } })).resolves.toEqual(demoReport)
    expect(getDraft).toHaveBeenCalledWith('real-device')
  })

  it('returns null when the draft is missing or has no report', async () => {
    vi.mocked(getDraft).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ report: null } as never)

    await expect(getPublicReport({ data: { deviceId: 'missing' } })).resolves.toBeNull()
    await expect(getPublicReport({ data: { deviceId: 'empty' } })).resolves.toBeNull()
  })
})
