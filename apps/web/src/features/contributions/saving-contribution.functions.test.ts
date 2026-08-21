import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import {
  getSavingContributionContext,
  previewSavingContribution,
  confirmSavingContribution,
  updateSavingContribution,
  deleteSavingContribution,
} from './saving-contribution.functions'
import {
  createSavingContributionInRepository,
  createSavingContributionPreviewToken,
  deleteSavingContributionInRepository,
  getSavingContributionState,
  StaleSavingContributionPreviewError,
  updateSavingContributionInRepository,
  type SavingContributionState,
} from './saving-contribution.repository.server'
import type {
  SavingContributionDraft,
  ConfirmSavingContributionInput,
  UpdateSavingContributionInput,
  DeleteSavingContributionInput,
} from './saving-contribution.schema'
import { buildSavingPreview } from './saving-contribution'

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
          const validatedData =
            validatorFn && arg?.data !== undefined ? validatorFn(arg.data) : arg?.data
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

vi.mock('./saving-contribution.repository.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./saving-contribution.repository.server')>()
  return {
    ...actual,
    getSavingContributionState: vi.fn(),
    createSavingContributionInRepository: vi.fn(),
    updateSavingContributionInRepository: vi.fn(),
    deleteSavingContributionInRepository: vi.fn(),
    createSavingContributionPreviewToken: vi.fn().mockReturnValue('a'.repeat(64)),
  }
})

describe('getSavingContributionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(getSavingContributionContext()).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('passes the authenticated userId and UTC YYYY-MM to repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getSavingContributionState).mockResolvedValue(null)

    const result = await getSavingContributionContext()

    expect(getSavingContributionState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('returns present profile state with context when profile exists', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const mockState: SavingContributionState = {
      source: {
        profile: {
          userId: 'user_456',
          baseCurrency: 'ARS',
          approximateMonthlyIncome: '1000000.00',
          approximateMonthlyExpenses: '500000.00',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '60000.00',
          onboardingCompleted: true,
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
            strategy: 'save',
            status: 'active',
            desiredDate: null,
            completedAt: null,
            emergencyFundMonths: 6,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'g2',
            userId: 'user_456',
            name: 'Vacaciones',
            type: 'purchase',
            targetAmount: '1000000.00',
            currency: 'ARS',
            priority: 'medium',
            strategy: 'save',
            status: 'active',
            desiredDate: null,
            completedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [
          {
            id: 's1',
            userId: 'user_456',
            effectiveMonth: '2026-08-01',
          },
        ],
        allocations: [
          {
            id: 'a1',
            snapshotId: 's1',
            goalId: 'g1',
            percentage: '50.00',
          },
          {
            id: 'a2',
            snapshotId: 's1',
            goalId: 'g2',
            percentage: '50.00',
          },
        ],
      },
      eligibleGoals: [
        { id: 'g2', name: 'Vacaciones', percentage: '100.00' },
      ],
      eligibleGoalsUsd: [
        { id: 'g1', name: 'Reserva', percentage: '100.00' },
      ],
    }

    vi.mocked(getSavingContributionState).mockResolvedValue(mockState)

    const result = await getSavingContributionContext()

    expect(getSavingContributionState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toMatchObject({
      profile: 'present',
      context: expect.objectContaining({
        currentMonth: '2026-08',
        eligibleGoals: [{ id: 'g2', name: 'Vacaciones', percentage: '100.00' }],
        eligibleGoalsUsd: [{ id: 'g1', name: 'Reserva', percentage: '100.00' }],
      }),
    })

    vi.useRealTimers()
  })
})

describe('previewSavingContribution', () => {
  const validArsDraft: SavingContributionDraft = {
    currency: 'ARS',
    amount: '10000.00',
    location: 'Santander',
  }

  const validUsdDraft: SavingContributionDraft = {
    currency: 'USD',
    amount: '100.00',
    location: 'Efectivo',
    arsSpent: '150000.00',
    effectiveRate: '1500.00',
  }

  const mockState: SavingContributionState = {
    source: {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
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
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: 6,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'g2',
          userId: 'user_456',
          name: 'Vacaciones',
          type: 'purchase',
          targetAmount: '1000000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [],
      allocations: [],
    },
    eligibleGoals: [
      { id: 'g2', name: 'Vacaciones', percentage: '100.00' },
    ],
    eligibleGoalsUsd: [
      { id: 'g1', name: 'Reserva', percentage: '100.00' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(previewSavingContribution({ data: validArsDraft })).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('throws when financial profile is missing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getSavingContributionState).mockResolvedValue(null)

    await expect(previewSavingContribution({ data: validArsDraft })).rejects.toThrow(
      'Completá tu perfil financiero antes de registrar un ahorro.',
    )

    vi.useRealTimers()
  })

  it('rejects unsupported currency through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      previewSavingContribution({ data: { currency: 'EUR' as any, amount: '100.00' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('rejects empty or non-positive amount through validator/domain logic', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getSavingContributionState).mockResolvedValue(mockState)

    await expect(
      previewSavingContribution({ data: { currency: 'ARS', amount: '0' } }),
    ).rejects.toThrow()

    await expect(
      previewSavingContribution({ data: { currency: 'ARS', amount: '-500' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('throws when there are no eligible goals for the draft currency', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getSavingContributionState).mockResolvedValue({
      ...mockState,
      eligibleGoals: [],
    })

    await expect(previewSavingContribution({ data: validArsDraft })).rejects.toThrow(
      'No hay objetivos activos para distribuir el ahorro en ARS.',
    )

    vi.useRealTimers()
  })

  it('returns preview result and 64-character token for valid ARS draft', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getSavingContributionState).mockResolvedValue(mockState)
    vi.mocked(createSavingContributionPreviewToken).mockReturnValue('a'.repeat(64))

    const result = await previewSavingContribution({ data: validArsDraft })

    expect(getSavingContributionState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result.previewToken).toBe('a'.repeat(64))
    expect(result.preview.draft.currency).toBe('ARS')
    expect(result.preview.draft.amount).toEqual({ amount: '10000.00', currency: 'ARS' })
    expect(result.preview.allocations).toHaveLength(1)
    expect(result.preview.allocations[0].goalId).toBe('g2')
    expect(result.preview.allocations[0].amount).toEqual({ amount: '10000.00', currency: 'ARS' })

    vi.useRealTimers()
  })

  it('returns preview result and 64-character token for valid USD draft with derived values', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getSavingContributionState).mockResolvedValue(mockState)
    vi.mocked(createSavingContributionPreviewToken).mockReturnValue('b'.repeat(64))

    const result = await previewSavingContribution({ data: validUsdDraft })

    expect(result.previewToken).toBe('b'.repeat(64))
    expect(result.preview.draft.currency).toBe('USD')
    expect(result.preview.draft.amount).toEqual({ amount: '100.00', currency: 'USD' })
    expect(result.preview.draft.arsSpent).toEqual({ amount: '150000.00', currency: 'ARS' })
    expect(result.preview.draft.effectiveRate).toBe('1500.00')
    expect(result.preview.allocations).toHaveLength(1)
    expect(result.preview.allocations[0].goalId).toBe('g1')
    expect(result.preview.allocations[0].amount).toEqual({ amount: '100.00', currency: 'USD' })

    vi.useRealTimers()
  })
})

describe('confirmSavingContribution', () => {
  const validDraft: SavingContributionDraft = {
    currency: 'ARS',
    amount: '10000.00',
    location: 'Santander',
  }
  const validToken = 'a'.repeat(64)
  const staleToken = 'b'.repeat(64)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(
      confirmSavingContribution({ data: { draft: validDraft, previewToken: validToken } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects malformed previewToken through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmSavingContribution({ data: { draft: validDraft, previewToken: 'short-token' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('rejects unsupported currency through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmSavingContribution({
        data: {
          draft: { currency: 'EUR' as any, amount: '100.00' },
          previewToken: validToken,
        },
      }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns created status with contributionId on successful repository persistence', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(createSavingContributionInRepository).mockResolvedValue({
      contributionId: '550e8400-e29b-41d4-a716-446655440000',
    })

    const payload: ConfirmSavingContributionInput = {
      draft: validDraft,
      previewToken: validToken,
    }

    const result = await confirmSavingContribution({ data: payload })

    expect(createSavingContributionInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      currentMonth: '2026-08',
      draft: expect.objectContaining({ currency: 'ARS', amount: '10000.00' }),
      previewToken: validToken,
    })
    expect(result).toEqual({
      status: 'created',
      contributionId: '550e8400-e29b-41d4-a716-446655440000',
    })

    vi.useRealTimers()
  })

  it('returns stale status with refreshed preview when repository throws StaleSavingContributionPreviewError', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const refreshedPreview = {
      preview: buildSavingPreview({
        draft: validDraft,
        eligibleGoals: [{ id: 'g2', name: 'Vacaciones', percentage: '100.00' }],
      }),
      previewToken: 'c'.repeat(64),
    }
    const staleError = new StaleSavingContributionPreviewError(refreshedPreview)
    vi.mocked(createSavingContributionInRepository).mockRejectedValue(staleError)

    const result = await confirmSavingContribution({
      data: { draft: validDraft, previewToken: staleToken },
    })

    expect(result).toEqual({
      status: 'stale',
      preview: refreshedPreview,
    })

    vi.useRealTimers()
  })
})

describe('updateSavingContribution', () => {
  const validDraft: SavingContributionDraft = {
    currency: 'ARS',
    amount: '15000.00',
    location: 'BBVA',
  }
  const validId = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(
      updateSavingContribution({ data: { contributionId: validId, draft: validDraft } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects invalid UUID contributionId through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      updateSavingContribution({ data: { contributionId: 'not-a-uuid', draft: validDraft } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns updated status on successful update in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(updateSavingContributionInRepository).mockResolvedValue(undefined as never)

    const payload: UpdateSavingContributionInput = {
      contributionId: validId,
      draft: validDraft,
    }

    const result = await updateSavingContribution({ data: payload })

    expect(updateSavingContributionInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      contributionId: validId,
      draft: expect.objectContaining({ currency: 'ARS', amount: '15000.00', location: 'BBVA' }),
    })
    expect(result).toEqual({ status: 'updated' })

    vi.useRealTimers()
  })
})

describe('deleteSavingContribution', () => {
  const validId = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(
      deleteSavingContribution({ data: { contributionId: validId } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects invalid UUID contributionId through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      deleteSavingContribution({ data: { contributionId: 'invalid-id' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns deleted status on successful deletion in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(deleteSavingContributionInRepository).mockResolvedValue(undefined as never)

    const payload: DeleteSavingContributionInput = {
      contributionId: validId,
    }

    const result = await deleteSavingContribution({ data: payload })

    expect(deleteSavingContributionInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      contributionId: validId,
    })
    expect(result).toEqual({ status: 'deleted' })

    vi.useRealTimers()
  })
})
