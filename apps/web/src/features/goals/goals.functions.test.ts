import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { getGoalsWorkspace } from './goals.functions'
import { getGoalsWorkspaceRows } from './goals.repository.server'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => {
    let validatorFn: ((input: unknown) => unknown) | null = null
    const fnObj = {
      validator: vi.fn().mockImplementation((val) => {
        validatorFn = val
        return fnObj
      }),
      handler: vi.fn().mockImplementation((handlerFn) => {
        return vi.fn(async (arg?: { data?: unknown }) => {
          const validatedData = validatorFn && arg?.data !== undefined ? validatorFn(arg.data) : arg?.data
          return handlerFn({ data: validatedData })
        })
      }),
    }
    return fnObj
  }),
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

vi.mock('./goals.repository.server', () => ({
  getGoalsWorkspaceRows: vi.fn(),
  mapRowsToGoalsWorkspaceSource: vi.fn().mockImplementation((rows) => ({
    profile: {
      userId: rows.profile.userId,
      baseCurrency: rows.profile.baseCurrency,
      approximateMonthlyIncome: rows.profile.approximateMonthlyIncome,
      approximateMonthlyExpenses: rows.profile.approximateMonthlyExpenses,
      expensesKnowledge: rows.profile.expensesKnowledge,
      onboardingCompleted: rows.profile.onboardingCompleted,
    },
    goals: rows.goals.map((g: any) => ({
      ...g,
      createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : String(g.createdAt),
      completedAt: g.completedAt instanceof Date ? g.completedAt.toISOString() : g.completedAt ?? null,
    })),
    savingsPositions: rows.savingsPositions,
    investmentPositions: rows.investmentPositions,
    channels: rows.channels,
    snapshots: rows.snapshots,
    allocations: rows.allocations,
  })),
}))

describe('getGoalsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(getGoalsWorkspace()).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('passes the authenticated userId and UTC YYYY-MM to the repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalsWorkspaceRows).mockResolvedValue(null)

    const result = await getGoalsWorkspace()

    expect(getGoalsWorkspaceRows).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('assembles and returns the goals workspace when profile is present', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const mockRows = {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        onboardingCompleted: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      goals: [
        {
          id: 'g1',
          userId: 'user_456',
          name: 'Reserva',
          type: 'emergency_fund',
          targetAmount: '2000.00',
          currency: 'USD',
          priority: 'high',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: 6,
          saveEnabled: true,
          investEnabled: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      savingsPositions: [
        {
          id: 'sp1',
          goalId: 'g1',
          amount: '500.00',
          currency: 'USD',
          location: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      investmentPositions: [],
      channels: [
        {
          id: 'c1',
          userId: 'user_456',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      snapshots: [
        {
          id: 's1',
          channelId: 'c1',
          monthlyCommitmentAmount: '150000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      allocations: [
        {
          id: 'a1',
          snapshotId: 's1',
          goalId: 'g1',
          percentage: '100.00',
        },
      ],
    }

    vi.mocked(getGoalsWorkspaceRows).mockResolvedValue(mockRows as never)

    const result = await getGoalsWorkspace()

    expect(getGoalsWorkspaceRows).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toMatchObject({
      profile: 'present',
      workspace: {
        groups: [
          {
            status: 'active',
            goals: [
              expect.objectContaining({
                id: 'g1',
                name: 'Reserva',
                actualValue: { amount: '500.00', currency: 'USD' },
              }),
            ],
          },
          { status: 'paused', goals: [] },
          { status: 'completed', goals: [] },
        ],
      },
    })

    vi.useRealTimers()
  })
})
