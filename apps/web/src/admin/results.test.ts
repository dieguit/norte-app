import { describe, expect, it, vi, beforeEach } from 'vitest'
import { toAdminResult, getUploadedFiles } from './results'
import { listAdminCsvRows, getAdminCsvRow, getAdminResultDetails, saveAdminReport, setAdminReportSent } from './server'
import { requireAdminSession } from './auth'
import { listDrafts, getDraft, saveDraftReport, setDraftReportSentOn } from '../onboarding/repository'
import { signDownload } from '../onboarding/r2'
import { csvHeaders } from './csv'
import demoReport from '../informe/demo.json'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => {
    let validatorFn: ((input: unknown) => unknown) | undefined
    const builder = {
      validator: vi.fn().mockImplementation((fn) => {
        validatorFn = fn
        return builder
      }),
      handler: vi.fn().mockImplementation((handlerFn) => {
        return vi.fn().mockImplementation(async (arg) => {
          const data = validatorFn ? validatorFn(arg?.data) : arg?.data
          return handlerFn({ ...arg, data })
        })
      }),
    }
    return builder
  }),
}))

vi.mock('./auth', () => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('../onboarding/repository', () => ({
  listDrafts: vi.fn(),
  getDraft: vi.fn(),
  saveDraftReport: vi.fn(),
  setDraftReportSentOn: vi.fn(),
}))

vi.mock('../onboarding/r2', () => ({
  signDownload: vi.fn(),
}))

describe('results mapping', () => {
  it('maps completed and draft results correctly', () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const completedAt = new Date('2026-07-16T12:00:00Z')
    const updatedAt = new Date('2026-07-16T12:30:00Z')

    expect(toAdminResult({ deviceId, answers: { nombre: 'Ana' }, completedAt, updatedAt, report: null, reportSentOn: null }))
      .toMatchObject({ deviceId, name: 'Ana', status: 'completed' })

    expect(toAdminResult({ deviceId, answers: {}, completedAt: null, updatedAt, report: null, reportSentOn: null }))
      .toMatchObject({ name: null, status: 'draft' })
  })

  it('maps report metadata in toAdminResult', () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const updatedAt = new Date('2026-07-16T12:30:00Z')
    const sentOn = new Date('2026-07-16T13:00:00Z')

    expect(toAdminResult({ deviceId, answers: {}, completedAt: null, updatedAt, report: demoReport as any, reportSentOn: sentOn }))
      .toMatchObject({ hasReport: true, reportSentOn: sentOn })

    expect(toAdminResult({ deviceId, answers: {}, completedAt: null, updatedAt, report: null, reportSentOn: null }))
      .toMatchObject({ hasReport: false, reportSentOn: null })
  })

  it('maps only the selected delivery contact in toAdminResult', () => {
    const base = {
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      completedAt: null,
      updatedAt: new Date('2026-07-28T12:00:00Z'),
      report: null,
      reportSentOn: null,
    }

    expect(toAdminResult({
      ...base,
      answers: { contacto_canal: 'WhatsApp', whatsapp: '+54 11 5555-5555', email: 'ana@example.com' },
    })).toMatchObject({ contactMethod: 'WhatsApp', contactValue: '+54 11 5555-5555' })

    expect(toAdminResult({
      ...base,
      answers: { contacto_canal: 'Email', whatsapp: '+54 11 5555-5555', email: 'ana@example.com' },
    })).toMatchObject({ contactMethod: 'Email', contactValue: 'ana@example.com' })

    expect(toAdminResult({ ...base, answers: { contacto_canal: 'SMS', whatsapp: '123' } }))
      .toMatchObject({ contactMethod: null, contactValue: null })
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

describe('getAdminResultDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets a draft with signed URLs for owned uploads', async () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const key = `onboarding/${deviceId}/t1_upload_url/987f6543-e21b-32d1-b654-026614174000`
    vi.mocked(getDraft).mockResolvedValue({
      deviceId,
      answers: { nombre: 'Ana', t1_upload_url: key },
      completedAt: new Date('2026-07-16T12:00:00Z'),
      updatedAt: new Date('2026-07-16T12:00:00Z'),
    } as any)
    vi.mocked(signDownload).mockResolvedValue('https://download.example/statement')

    await expect(getAdminResultDetails({ data: { deviceId } })).resolves.toMatchObject({
      draft: { deviceId, answers: { nombre: 'Ana' } },
      files: { t1_upload_url: 'https://download.example/statement' },
    })
    expect(requireAdminSession).toHaveBeenCalled()
    expect(getDraft).toHaveBeenCalledWith(deviceId)
    expect(signDownload).toHaveBeenCalledWith(key)
  })

  it('returns null when the requested draft does not exist', async () => {
    vi.mocked(getDraft).mockResolvedValue(undefined as any)

    await expect(getAdminResultDetails({
      data: { deviceId: '00000000-0000-0000-0000-000000000000' },
    })).resolves.toBeNull()
  })

  it('rejects an invalid device ID before querying the database', async () => {
    await expect(getAdminResultDetails({ data: { deviceId: 'not-a-uuid' } }))
      .rejects.toThrow()
    expect(getDraft).not.toHaveBeenCalled()
  })
})

describe('saveAdminReport and setAdminReportSent server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves report for draft and returns updated admin result', async () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const updatedDraft = {
      deviceId,
      answers: { nombre: 'Ana' },
      completedAt: new Date('2026-07-16T12:00:00Z'),
      updatedAt: new Date('2026-07-16T12:30:00Z'),
      report: demoReport,
      reportSentOn: null,
    }
    vi.mocked(saveDraftReport).mockResolvedValue(updatedDraft as any)

    const result = await saveAdminReport({ data: { deviceId, report: demoReport as any } })

    expect(requireAdminSession).toHaveBeenCalled()
    expect(saveDraftReport).toHaveBeenCalledWith(deviceId, demoReport)
    expect(result).toMatchObject({ deviceId, name: 'Ana', hasReport: true, reportSentOn: null })
  })

  it('rejects saving report with invalid input before querying database', async () => {
    await expect(saveAdminReport({ data: { deviceId: 'not-a-uuid', report: demoReport as any } })).rejects.toThrow()
    expect(saveDraftReport).not.toHaveBeenCalled()
  })

  it('rejects saving report when draft is not found', async () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    vi.mocked(saveDraftReport).mockResolvedValue(null as any)

    await expect(saveAdminReport({ data: { deviceId, report: demoReport as any } })).rejects.toThrow('Draft not found')
  })

  it('sets report sent status and returns updated admin result', async () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    const sentOn = new Date('2026-07-16T13:00:00Z')
    const updatedDraft = {
      deviceId,
      answers: { nombre: 'Ana' },
      completedAt: new Date('2026-07-16T12:00:00Z'),
      updatedAt: new Date('2026-07-16T13:00:00Z'),
      report: demoReport,
      reportSentOn: sentOn,
    }
    vi.mocked(setDraftReportSentOn).mockResolvedValue(updatedDraft as any)

    const result = await setAdminReportSent({ data: { deviceId, sent: true } })

    expect(requireAdminSession).toHaveBeenCalled()
    expect(setDraftReportSentOn).toHaveBeenCalledWith(deviceId, true)
    expect(result).toMatchObject({ deviceId, name: 'Ana', hasReport: true, reportSentOn: sentOn })
  })

  it('rejects setting report sent status with invalid input before querying database', async () => {
    await expect(setAdminReportSent({ data: { deviceId: 'invalid-uuid', sent: true } })).rejects.toThrow()
    expect(setDraftReportSentOn).not.toHaveBeenCalled()
  })

  it('rejects setting report sent status when draft/report is not found', async () => {
    const deviceId = '123e4567-e89b-12d3-a456-426614174000'
    vi.mocked(setDraftReportSentOn).mockResolvedValue(undefined as any)

    await expect(setAdminReportSent({ data: { deviceId, sent: true } })).rejects.toThrow('Report not found')
  })
})
