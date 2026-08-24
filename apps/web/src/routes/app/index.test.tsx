import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFinancesWorkspace } from '../../features/financial/financial.functions'
import { getGoalsWorkspace } from '../../features/goals/goals.functions'
import { loadHomeRoadmap } from './index'

vi.mock('../../features/financial/financial.functions', () => ({
  getFinancesWorkspace: vi.fn(),
}))

vi.mock('../../features/goals/goals.functions', () => ({
  getGoalsWorkspace: vi.fn(),
}))

describe('loadHomeRoadmap', () => {
  const goals: any = {
    groups: [],
    availableCurrencies: [],
  }
  const finances: any = {
    incomes: { incomes: [] },
    expenses: { expenses: [] },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads existing goals and finances in parallel and builds the roadmap', async () => {
    vi.mocked(getGoalsWorkspace).mockResolvedValue({ profile: 'present', workspace: goals })
    vi.mocked(getFinancesWorkspace).mockResolvedValue(finances)

    const roadmap = await loadHomeRoadmap('present', '2026-08')

    expect(getGoalsWorkspace).toHaveBeenCalledOnce()
    expect(getFinancesWorkspace).toHaveBeenCalledOnce()
    expect(roadmap?.currentMonth.month).toBe('2026-08')
  })

  it('does not load roadmap workspaces before onboarding', async () => {
    await expect(loadHomeRoadmap('missing', '2026-08')).resolves.toBeNull()
    expect(getGoalsWorkspace).not.toHaveBeenCalled()
    expect(getFinancesWorkspace).not.toHaveBeenCalled()
  })

  it('rejects inconsistent missing workspace data for a present profile', async () => {
    vi.mocked(getGoalsWorkspace).mockResolvedValue({ profile: 'missing' } as any)
    vi.mocked(getFinancesWorkspace).mockResolvedValue(null)
    await expect(loadHomeRoadmap('present', '2026-08')).rejects.toThrow('Roadmap data is unavailable.')
  })
})
