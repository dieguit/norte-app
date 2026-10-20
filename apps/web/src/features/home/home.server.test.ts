import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callFinancialApi } from '../financial/financial.server'
import { getHomeRoadmapServer } from './home.server'

vi.mock('../financial/financial.server', () => ({
  callFinancialApi: vi.fn(),
}))

const sampleRoadmapResponse = {
  roadmap: {
    undatedObjectives: [],
    futureMonths: [],
    currentMonth: {
      month: '2026-08',
      objectives: [],
      oneTimeExpenses: [],
      recurringExpenses: [],
      endingExpenses: [],
      oneTimeIncomes: [],
      recurringIncomes: [],
      contributions: [],
    },
    historyMonths: [],
  },
  completionGoals: [],
}

describe('getHomeRoadmapServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls API and returns validated response', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(
      new Response(JSON.stringify(sampleRoadmapResponse), { status: 200 }),
    )

    const result = await getHomeRoadmapServer('2026-08')
    expect(callFinancialApi).toHaveBeenCalledWith('/home?currentMonth=2026-08')
    expect(result).toEqual(sampleRoadmapResponse)
  })

  it('handles missing profile response', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(
      new Response(JSON.stringify({ profile: 'missing' }), { status: 200 }),
    )

    const result = await getHomeRoadmapServer()
    expect(callFinancialApi).toHaveBeenCalledWith('/home')
    expect(result).toEqual({ profile: 'missing' })
  })

  it('throws on failed request', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Error' }), { status: 500 }),
    )

    await expect(getHomeRoadmapServer('2026-08')).rejects.toThrow(
      'No se pudo cargar la hoja de ruta.',
    )
  })
})
