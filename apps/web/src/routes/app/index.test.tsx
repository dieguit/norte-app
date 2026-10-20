import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHomeRoadmap } from '../../features/home/home.functions'
import { loadHomeRoadmap } from './index'

vi.mock('../../features/home/home.functions', () => ({
  getHomeRoadmap: vi.fn(),
}))

describe('loadHomeRoadmap', () => {
  const eligibleGoal: any = {
    id: 'goal-eligible',
    completionEligible: true,
    status: 'active',
    projection: { status: 'available', completionMonth: '2026-08' },
    contributions: [],
  }

  const sampleRoadmap: any = {
    undatedObjectives: [],
    futureMonths: [],
    currentMonth: {
      month: '2026-08',
      objectives: [eligibleGoal],
      oneTimeExpenses: [],
      recurringExpenses: [],
      endingExpenses: [],
      oneTimeIncomes: [],
      recurringIncomes: [],
      contributions: [],
    },
    historyMonths: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads home roadmap from server function for present profile', async () => {
    vi.mocked(getHomeRoadmap).mockResolvedValue({
      roadmap: sampleRoadmap,
      completionGoals: [eligibleGoal],
    })

    const result = await loadHomeRoadmap('present', '2026-08')

    expect(result).not.toBeNull()
    if (!result) throw new Error('Expected present-profile home data.')
    expect(getHomeRoadmap).toHaveBeenCalledWith({ data: { currentMonth: '2026-08' } })
    expect(result.roadmap.currentMonth.month).toBe('2026-08')
    expect(result.completionGoals).toEqual([eligibleGoal])
  })

  it('does not load roadmap workspaces before onboarding', async () => {
    await expect(loadHomeRoadmap('missing', '2026-08')).resolves.toBeNull()
    expect(getHomeRoadmap).not.toHaveBeenCalled()
  })

  it('rejects inconsistent missing workspace data for a present profile', async () => {
    vi.mocked(getHomeRoadmap).mockResolvedValue({ profile: 'missing' })
    await expect(loadHomeRoadmap('present', '2026-08')).rejects.toThrow(
      'Roadmap data is unavailable.',
    )
  })
})
