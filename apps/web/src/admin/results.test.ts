import { describe, expect, it, vi, beforeEach } from 'vitest'
import { toAdminResult, getUploadedFiles } from './results'
import { listAdminCsvRows, getAdminCsvRow } from './server'
import { requireAdminSession } from './auth'
import { listDrafts, getDraft } from '../onboarding/repository'
import { csvHeaders } from './csv'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockReturnValue({
    validator: vi.fn().mockReturnThis(),
    handler: vi.fn().mockImplementation((handlerFn) => {
      return vi.fn().mockImplementation((arg) => handlerFn(arg))
    }),
  }),
}))

vi.mock('./auth', () => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('../onboarding/repository', () => ({
  listDrafts: vi.fn(),
  getDraft: vi.fn(),
}))

describe('results mapping', () => {
  it('maps completed and draft results correctly', () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const completedAt = new Date('2026-07-16T12:00:00Z')
    const updatedAt = new Date('2026-07-16T12:30:00Z')

    expect(toAdminResult({ deviceId, answers: { nombre: 'Ana' }, completedAt, updatedAt }))
      .toMatchObject({ deviceId, name: 'Ana', status: 'completed' })

    expect(toAdminResult({ deviceId, answers: {}, completedAt: null, updatedAt }))
      .toMatchObject({ name: null, status: 'draft' })
  })

  it('extracts uploaded files correctly', () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const key = `onboarding/${deviceId}/t1_upload_url/987f6543-e21b-32d1-b654-026614174000`

    expect(getUploadedFiles({ t1_upload_url: key })).toEqual([
      { fieldId: 't1_upload_url', label: 'Subir foto o archivo', key },
    ])
  })
})

describe('CSV export server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only completed draft csv rows', async () => {
    const deviceId1 = '123e4567-e89b-12d3-a456-426614174000'
    const deviceId2 = '789e4567-e89b-12d3-a456-426614174000'
    const completedAt = new Date('2026-07-16T12:00:00Z')

    vi.mocked(listDrafts).mockResolvedValue([
      {
        deviceId: deviceId1,
        answers: { nombre: 'Ana' },
        completedAt,
        updatedAt: completedAt,
      },
      {
        deviceId: deviceId2,
        answers: { nombre: 'Juan' },
        completedAt: null,
        updatedAt: completedAt,
      },
    ] as any)

    const result = await listAdminCsvRows()

    expect(requireAdminSession).toHaveBeenCalled()
    expect(listDrafts).toHaveBeenCalled()
    expect(result).toMatchObject({
      headers: csvHeaders,
      rows: [
        expect.objectContaining({
          nombre: 'Ana',
          timestamp: completedAt.toISOString(),
        }),
      ],
    })
    expect(result.rows.some((row) => row.nombre === 'Juan')).toBe(false)
  })

  it('gets completed draft csv row by device ID', async () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const completedAt = new Date('2026-07-16T12:00:00Z')

    vi.mocked(getDraft).mockResolvedValue({
      deviceId,
      answers: { nombre: 'Ana' },
      completedAt,
      updatedAt: completedAt,
    } as any)

    const result = await getAdminCsvRow({ data: { deviceId } })

    expect(requireAdminSession).toHaveBeenCalled()
    expect(getDraft).toHaveBeenCalledWith(deviceId)
    expect(result).toMatchObject({
      headers: csvHeaders,
      rows: [
        expect.objectContaining({
          nombre: 'Ana',
          timestamp: completedAt.toISOString(),
        }),
      ],
    })
  })

  it('rejects getting incomplete draft csv row', async () => {
    const deviceId = '789e4567-e89b-12d3-a456-426614174000'

    vi.mocked(getDraft).mockResolvedValue({
      deviceId,
      answers: { nombre: 'Juan' },
      completedAt: null,
      updatedAt: new Date(),
    } as any)

    await expect(getAdminCsvRow({ data: { deviceId } })).rejects.toThrow(
      'Completed draft not found',
    )
    expect(requireAdminSession).toHaveBeenCalled()
    expect(getDraft).toHaveBeenCalledWith(deviceId)
  })

  it('rejects getting non-existent draft csv row', async () => {
    const deviceId = '00000000-0000-0000-0000-000000000000'

    vi.mocked(getDraft).mockResolvedValue(null as any)

    await expect(getAdminCsvRow({ data: { deviceId } })).rejects.toThrow(
      'Completed draft not found',
    )
    expect(requireAdminSession).toHaveBeenCalled()
    expect(getDraft).toHaveBeenCalledWith(deviceId)
  })
})
