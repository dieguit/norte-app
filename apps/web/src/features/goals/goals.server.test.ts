import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callFinancialApi } from '../financial/financial.server'
import {
  getGoalsWorkspaceServer,
  getGoalCreationContextServer,
} from './goals.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('../financial/auth.server', () => ({
  requireFinancialUser: vi.fn(),
}))
vi.mock('../financial/financial.server', () => ({
  callFinancialApi: vi.fn(),
  throwFinancialApiError: vi.fn(async (_response: Response, fallback: string) => {
    throw new Error(fallback)
  }),
}))

describe('goals.server API adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and validates goals workspace from API', async () => {
    const mockWorkspace = {
      profile: 'present' as const,
      workspace: {
        financialSummary: {
          month: '2026-10',
          income: { amount: '1000.00', currency: 'ARS' as const },
          expenses: { amount: '500.00', currency: 'ARS' as const },
          balance: { amount: '500.00', currency: 'ARS' as const },
          dedicationPercentage: '50.00',
          contribution: { amount: '250.00', currency: 'ARS' as const },
        },
        groups: [],
      },
    }
    vi.mocked(callFinancialApi).mockResolvedValue(
      new Response(JSON.stringify(mockWorkspace), { status: 200 }),
    )

    const result = await getGoalsWorkspaceServer()
    expect(callFinancialApi).toHaveBeenCalledWith('/goals')
    expect(result).toEqual(mockWorkspace)
  })

  it('fetches goal creation context from API', async () => {
    const mockPlan = {
      profile: 'present' as const,
      context: {
        currentMonth: '2026-10',
        expensesKnowledge: 'known' as const,
        hasEmergencyFund: false,
      },
    }
    vi.mocked(callFinancialApi).mockResolvedValue(
      new Response(JSON.stringify(mockPlan), { status: 200 }),
    )

    const result = await getGoalCreationContextServer()
    expect(callFinancialApi).toHaveBeenCalledWith('/goals/plan')
    expect(result).toEqual({ profile: 'present', context: mockPlan.context })
  })
})
