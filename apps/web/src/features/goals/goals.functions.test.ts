import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { callFinancialApi } from '../financial/financial.server'
import {
  confirmAllocationChange,
  confirmGoalCreation,
  confirmGoalEdit,
  confirmGoalLifecycle,
  confirmGoalCompletion,
  getAllocationChangeContext,
  getGoalCreationContext,
  getGoalEditContext,
  getGoalLifecycleContext,
  getGoalsWorkspace,
  getGoalCompletionContext,
  previewAllocationChange,
  previewGoalCreation,
  previewGoalEdit,
  previewGoalLifecycle,
  previewGoalCompletion,
} from './goals.functions'
import {
  confirmGoalCompletionServer,
  getGoalCompletionContextServer,
  previewGoalCompletionServer,
} from './goals.server'
import type { GoalCreationDraft } from './goal-creation.schema'
import type { AllocationChangeDraft } from './allocation-change.schema'

const serverRegistrations = vi.hoisted(() => [] as Array<{
  method?: string
  validator: ((input: unknown) => unknown) | null
  handler: unknown
}>)

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation((options?: { method?: string }) => {
    let validatorFn: ((input: unknown) => unknown) | null = null
    const registration = {
      method: options?.method,
      validator: null as ((input: unknown) => unknown) | null,
      handler: null as unknown,
    }
    const fnObj = {
      validator: vi.fn().mockImplementation((val) => {
        validatorFn = val
        registration.validator = val
        return fnObj
      }),
      handler: vi.fn().mockImplementation((handlerFn) => {
        registration.handler = handlerFn
        serverRegistrations.push(registration)
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

vi.mock('../financial/financial.server', () => ({
  callFinancialApi: vi.fn(),
  throwFinancialApiError: vi.fn(async (response: Response, fallback: string) => {
    const message = (await response.json().catch(() => null))?.message
    throw new Error(Array.isArray(message) ? message[0] : typeof message === 'string' ? message : fallback)
  }),
}))

const completionGoalId = '11111111-1111-4111-8111-111111111111'
const completionPlaceId = '22222222-2222-4222-8222-222222222222'

const completionPreviewData = {
  goalId: completionGoalId,
  withdrawals: [{ placeId: completionPlaceId, amount: '100.00' }],
  allocations: [],
}

describe('getGoalsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies the missing-profile response through the existing no-argument function', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => ({ profile: 'missing' }) } as Response)
    await expect(getGoalsWorkspace()).resolves.toEqual({ profile: 'missing' })
    expect(callFinancialApi).toHaveBeenCalledWith('/goals')
  })

  it('validates the complete API workspace response and rejects malformed JSON', async () => {
    const response = { profile: 'present', workspace: { financialSummary: {
      month: '2026-08', income: { amount: '0.00', currency: 'ARS' }, expenses: { amount: '0.00', currency: 'ARS' },
      balance: { amount: '0.00', currency: 'ARS' }, dedicationPercentage: '90.00', contribution: { amount: '0.00', currency: 'ARS' },
    }, groups: ['active', 'paused', 'completed'].map((status) => ({ status, goals: [] })) } };
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => response } as Response)
    await expect(getGoalsWorkspace()).resolves.toEqual(response)
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => ({ profile: 'present' }) } as Response)
    await expect(getGoalsWorkspace()).rejects.toThrow()
  })
})

describe('getGoalCreationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxies and validates the API context response', async () => {
    const context = { profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: true } }
    const common = { ...context, allocationContext: { currentMonth: '2026-08', financialSummary: {
      month: '2026-08', income: { amount: '0.00', currency: 'ARS' }, expenses: { amount: '0.00', currency: 'ARS' },
      balance: { amount: '0.00', currency: 'ARS' }, dedicationPercentage: '90.00', contribution: { amount: '0.00', currency: 'ARS' },
    }, activeGoals: [] } }
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => common } as Response)
    await expect(getGoalCreationContext()).resolves.toEqual(context)
    expect(callFinancialApi).toHaveBeenCalledWith('/goals/plan')
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => ({ profile: 'present' }) } as Response)
    await expect(getGoalCreationContext()).rejects.toThrow()
  })
})

const mockProposal = {
  normalizedGoal: {
    name: 'Viaje al sur',
    type: 'purchase' as const,
    targetAmount: { amount: '2000.00', currency: 'USD' as const },
    currency: 'USD' as const,
    priority: 'medium' as const,
    strategy: 'save' as const,
  },
  allocation: {
    effectiveMonth: '2026-08',
    entries: [
      { goalId: 'pending-goal', goalName: 'Viaje al sur', percentage: '60.00', pending: true },
      { goalId: 'g1', goalName: 'Fondo de emergencia', percentage: '40.00', pending: false },
    ],
    totalPercentage: '100.00',
  },
  impacts: [
    { goalId: 'pending-goal', goalName: 'Viaje al sur', before: { status: 'not_created' as const }, after: { status: 'target_unavailable' as const } },
    { goalId: 'g1', goalName: 'Fondo de emergencia', before: { status: 'existing' as const, projection: { status: 'target_unavailable' as const }, allocatedMonthlyAmounts: [] }, after: { status: 'target_unavailable' as const } },
  ],
  proposedSource: {
    goals: [],
    savingsPositions: [],
    investmentPositions: [],
    snapshots: [],
    allocations: [],
  },
}

describe('previewGoalCreation', () => {
  const validDraft: GoalCreationDraft = {
    type: 'purchase',
    name: 'Viaje al sur',
    targetAmount: '2000.00',
    currency: 'USD',
    desiredMonth: '2027-01',
    priority: 'medium',
    strategy: 'save',
    annualReturnRate: '',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [
      { goalId: 'g1', percentage: '40.00' },
      { goalId: 'pending-goal', percentage: '60.00' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the API missing-profile validation message', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: false, json: async () => ({ message: ['Completá tu perfil financiero antes de crear un objetivo.'] }) } as Response)
    await expect(previewGoalCreation({ data: validDraft })).rejects.toThrow('Completá tu perfil financiero antes de crear un objetivo.')
  })

  it('rejects invalid draft input through validator / schema rejection', async () => {
    const invalidDraft = {
      ...validDraft,
      allocations: [
        { goalId: 'g1', percentage: '30.00' },
        { goalId: 'pending-goal', percentage: '50.00' },
      ],
    }

    await expect(previewGoalCreation({ data: invalidDraft })).rejects.toThrow()

  })

  it('returns read-only proposal and a 64-character preview token without persisting data', async () => {
    const response = { proposal: mockProposal, previewToken: 'a'.repeat(64) }
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => response } as Response)
    const result = await previewGoalCreation({ data: validDraft })

    expect(callFinancialApi).toHaveBeenCalledWith('/goals/preview', expect.objectContaining({ method: 'POST' }))
    expect(result.previewToken).toMatch(/^[a-f0-9]{64}$/)
    expect(result.proposal.normalizedGoal.name).toBe('Viaje al sur')
    expect(result.proposal.normalizedGoal.type).toBe('purchase')
    expect(result.proposal.normalizedGoal.targetAmount).toEqual({
      amount: '2000.00',
      currency: 'USD',
    })
    expect(result.proposal.allocation.entries).toHaveLength(2)
    expect(result.proposal.impacts).toHaveLength(2)

  })
})

describe('confirmGoalCreation', () => {
  const validToken = 'a'.repeat(64)
  const staleToken = 'b'.repeat(64)

  const validDraft: GoalCreationDraft = {
    type: 'purchase',
    name: 'Viaje al sur',
    targetAmount: '2000.00',
    currency: 'USD',
    desiredMonth: '2027-01',
    priority: 'medium',
    strategy: 'save',
    annualReturnRate: '',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [
      { goalId: 'g1', percentage: '40.00' },
      { goalId: 'pending-goal', percentage: '60.00' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid payload or malformed previewToken through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmGoalCreation({ data: { draft: validDraft, previewToken: 'short_token' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns created status with goalId on successful confirmation in repository', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => ({ status: 'created', goalId: 'goal-new-123' }) } as Response)

    const result = await confirmGoalCreation({
      data: { draft: validDraft, previewToken: validToken },
    })

    expect(callFinancialApi).toHaveBeenCalledWith('/goals', expect.objectContaining({ method: 'POST' }))
    expect(result).toEqual({
      status: 'created',
      goalId: 'goal-new-123',
    })

  })

  it('returns stale status with refreshed preview when repository throws StaleGoalCreationPreviewError', async () => {
    const refreshedProposal = mockProposal
    const refreshedToken = 'b'.repeat(64)
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => ({ status: 'stale', preview: { proposal: refreshedProposal, previewToken: refreshedToken } }) } as Response)

    const result = await confirmGoalCreation({
      data: { draft: validDraft, previewToken: staleToken },
    })

    expect(result).toEqual({
      status: 'stale',
      preview: {
        proposal: refreshedProposal,
        previewToken: refreshedToken,
      },
    })

  })
})

describe('allocation change API proxies', () => {
  const draft: AllocationChangeDraft = { dedicationPercentage: 70, allocations: [{ goalId: 'g1', percentage: '100.00' }] }
  const token = 'a'.repeat(64)
  const preview = {
    proposal: {
      dedicationPercentage: 70,
      allocation: { monthlyContribution: { amount: '100.00', currency: 'ARS' }, effectiveMonth: '2026-08-01', entries: [{ goalId: 'g1', goalName: 'Goal', percentage: '100.00', pending: false }], totalPercentage: '100.00' },
      impacts: [],
      proposedSource: { profile: null, goals: [], savingsPositions: [], investmentPositions: [], snapshots: [], allocations: [] },
    },
    previewToken: token,
  }
  const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

  beforeEach(() => vi.clearAllMocks())

  it('requires the existing signed-in app session', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)
    await expect(getAllocationChangeContext()).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    await expect(previewAllocationChange({ data: draft })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    await expect(confirmAllocationChange({ data: { draft, previewToken: token } })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
  })

  it('maps missing and present common plan responses to the legacy context shape', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ profile: 'missing' }))
    await expect(getAllocationChangeContext()).resolves.toEqual({ profile: 'missing' })
    expect(callFinancialApi).toHaveBeenLastCalledWith('/goals/plan')

    const context = { currentMonth: '2026-08', financialSummary: {
      month: '2026-08', income: { amount: '0.00', currency: 'ARS' }, expenses: { amount: '0.00', currency: 'ARS' },
      balance: { amount: '0.00', currency: 'ARS' }, dedicationPercentage: '70.00', contribution: { amount: '0.00', currency: 'ARS' },
    }, activeGoals: [{ id: 'g1', name: 'Goal', currency: 'ARS', projection: { status: 'target_unavailable' } }] }
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false }, allocationContext: context }))
    await expect(getAllocationChangeContext()).resolves.toEqual({ profile: 'present', context })
  })

  it('posts draft to API and parses the strict preview response', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response(preview))
    await expect(previewAllocationChange({ data: draft })).resolves.toEqual(preview)
    const [previewPath, previewOptions] = vi.mocked(callFinancialApi).mock.lastCall!
    expect(previewPath).toBe('/goals/allocation/preview')
    expect(previewOptions?.method).toBe('POST')
    expect(JSON.parse(String(previewOptions?.body))).toEqual(draft)
  })

  it('puts confirmation and maps updated or refreshed-stale results', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'updated' }))
    await expect(confirmAllocationChange({ data: { draft, previewToken: token } })).resolves.toEqual({ status: 'updated' })
    const [confirmPath, confirmOptions] = vi.mocked(callFinancialApi).mock.lastCall!
    expect(confirmPath).toBe('/goals/allocation')
    expect(confirmOptions?.method).toBe('PUT')
    expect(JSON.parse(String(confirmOptions?.body))).toEqual({ draft, previewToken: token })

    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'stale', preview }))
    await expect(confirmAllocationChange({ data: { draft, previewToken: token } })).resolves.toEqual({ status: 'stale', preview })
  })
})

describe('goal edit API proxies', () => {
  const goalId = '123e4567-e89b-12d3-a456-426614174000'
  const draft = {
    type: 'purchase' as const, name: 'Viaje', targetAmount: '5000', currency: 'USD' as const,
    desiredMonth: '2027-01', priority: 'medium' as const, strategy: 'save' as const,
    annualReturnRate: '', availability: 'available_now' as const, availableFromMonth: '', allocations: [{ goalId, percentage: '100.00' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
  })

  it('adapts selected common plan context to the original edit state', async () => {
    const plan = { profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false }, editContext: { goalId, status: 'paused', draft } }
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => plan } as Response)
    await expect(getGoalEditContext({ data: { goalId } })).resolves.toEqual({ profile: 'present', goalId, status: 'paused', draft, context: plan.context })
    expect(callFinancialApi).toHaveBeenCalledWith(`/goals/plan?goalId=${goalId}`)
  })

  it('proxies preview with the path subject and draft body', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: false, json: async () => ({ message: 'preview rejected' }) } as Response)
    await expect(previewGoalEdit({ data: { goalId, draft } })).rejects.toThrow('preview rejected')
    expect(callFinancialApi).toHaveBeenCalledWith(`/goals/${goalId}/preview`, expect.objectContaining({ method: 'POST', body: JSON.stringify(draft) }))
  })

  it('proxies confirmation without trusting a body target and parses updated status', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue({ ok: true, json: async () => ({ status: 'updated' }) } as Response)
    await expect(confirmGoalEdit({ data: { goalId, draft, previewToken: 'a'.repeat(64) } })).resolves.toEqual({ status: 'updated' })
    expect(callFinancialApi).toHaveBeenCalledWith(`/goals/${goalId}`, expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ draft, previewToken: 'a'.repeat(64) }),
    }))
  })
})

describe('goal lifecycle API proxies', () => {
  const goalId = '11111111-1111-4111-8111-111111111111'
  const token = 'a'.repeat(64)
  const context = {
    goalId, lifecycle: 'pause' as const, goalName: 'Reserva', goalCurrency: 'ARS' as const, currentMonth: '2026-08',
    plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' as const },
    activeGoals: [{ id: goalId, name: 'Reserva', currency: 'ARS' as const }],
    currentAllocation: { effectiveMonth: '2026-08-01', entries: [{ goalId, percentage: '100.00' }] },
  }
  const preview = {
    proposal: {
      lifecycle: 'pause', goalId, nextStatus: 'paused', transition: { goalId, status: 'paused' }, pauseMonthlyCommitment: true,
      allocation: { effectiveMonth: '2026-08-01', entries: [{ goalId, goalName: 'Reserva', percentage: '100.00', pending: false }], totalPercentage: '100.00' },
      persistedAllocation: { effectiveMonth: '2026-08-01', entries: [{ goalId, percentage: '100.00' }] },
      impacts: [],
      proposedSource: { profile: null, goals: [], savingsPositions: [], investmentPositions: [], snapshots: [], allocations: [] },
    },
    previewToken: token,
  }
  const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
  })

  it('requires the existing signed-in app session', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)
    await expect(getGoalLifecycleContext({ data: { goalId, lifecycle: 'pause' } })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    await expect(previewGoalLifecycle({ data: { goalId, lifecycle: 'pause' } })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    await expect(confirmGoalLifecycle({ data: { goalId, lifecycle: 'pause', allocations: [], previewToken: token } })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
  })

  it('maps the selected lifecycle context from the common plan and missing profile', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ profile: 'missing' }))
    await expect(getGoalLifecycleContext({ data: { goalId, lifecycle: 'pause' } })).resolves.toEqual({ profile: 'missing' })
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/goals/plan?goalId=${goalId}&action=pause`)

    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({
      profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false }, lifecycleContext: context,
    }))
    await expect(getGoalLifecycleContext({ data: { goalId, lifecycle: 'pause' } })).resolves.toEqual({ profile: 'present', ...context })
  })

  it('surfaces API lifecycle target errors and rejects plans without lifecycle context', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ message: 'Only active goals can be paused.' }, 400))
    await expect(getGoalLifecycleContext({ data: { goalId, lifecycle: 'pause' } })).rejects.toThrow('Only active goals can be paused.')
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false } }))
    await expect(getGoalLifecycleContext({ data: { goalId, lifecycle: 'pause' } })).rejects.toThrow()
  })

  it('posts the preview draft to the goal lifecycle route and parses the strict preview', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response(preview))
    await expect(previewGoalLifecycle({ data: { goalId, lifecycle: 'pause', allocations: [] } })).resolves.toEqual(preview)
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/goals/${goalId}/lifecycle/preview`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ lifecycle: 'pause', allocations: [] }),
    }))
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ message: 'Financial profile not found.' }, 400))
    await expect(previewGoalLifecycle({ data: { goalId, lifecycle: 'pause' } })).rejects.toThrow('Financial profile not found.')
  })

  it('posts confirmation to the goal lifecycle route and maps updated or refreshed-stale results', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'updated' }))
    await expect(confirmGoalLifecycle({ data: { goalId, lifecycle: 'pause', allocations: [], previewToken: token } })).resolves.toEqual({ status: 'updated' })
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/goals/${goalId}/lifecycle`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ lifecycle: 'pause', allocations: [], previewToken: token }),
    }))
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'stale', preview }))
    await expect(confirmGoalLifecycle({ data: { goalId, lifecycle: 'pause', allocations: [], previewToken: token } })).resolves.toEqual({ status: 'stale', preview })
  })
})

describe('goal completion functions', () => {
  const previewToken = 'a'.repeat(64)
  const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
  const preview = {
    proposal: {
      goalId: completionGoalId, goalName: 'Notebook', targetAmount: { amount: '100.00', currency: 'ARS' as const },
      withdrawals: [{ placeId: completionPlaceId, placeName: 'Banco', amount: { amount: '100.00', currency: 'ARS' as const } }],
      allocation: { effectiveMonth: '2026-08-01', entries: [], totalPercentage: '0.00' },
      persistedAllocation: { effectiveMonth: '2026-08-01', entries: [] }, pauseMonthlyCommitment: false,
      impacts: [], proposedSource: { profile: null, goals: [], savingsPositions: [], investmentPositions: [], snapshots: [], allocations: [] },
    },
    previewToken,
  }
  const context = {
    goalId: completionGoalId, goalName: 'Notebook', targetAmount: { amount: '100.00', currency: 'ARS' as const },
    savingsValue: { amount: '100.00', currency: 'ARS' as const }, currentMonth: '2026-08',
    savingsPlaces: [{ id: completionPlaceId, name: 'Banco', balance: { amount: '100.00', currency: 'ARS' as const } }],
    activeGoals: [{ id: completionGoalId, name: 'Notebook', currency: 'ARS' as const }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
  })

  function registrationFor(handler: unknown) {
    const registration = serverRegistrations.find((candidate) => candidate.handler === handler)
    if (!registration) throw new Error('Completion server function registration not found')
    return registration
  }

  it('registers completion handlers with the expected methods, validators, and server handlers', () => {
    expect(registrationFor(getGoalCompletionContextServer)).toMatchObject({ method: 'GET', handler: getGoalCompletionContextServer })
    expect(registrationFor(previewGoalCompletionServer)).toMatchObject({ method: 'POST', handler: previewGoalCompletionServer })
    expect(registrationFor(confirmGoalCompletionServer)).toMatchObject({ method: 'POST', handler: confirmGoalCompletionServer })

    const contextRegistration = registrationFor(getGoalCompletionContextServer)
    const previewRegistration = registrationFor(previewGoalCompletionServer)
    const confirmRegistration = registrationFor(confirmGoalCompletionServer)

    expect(contextRegistration.validator?.({ goalId: completionGoalId })).toEqual({ goalId: completionGoalId })
    expect(previewRegistration.validator?.(completionPreviewData)).toEqual(completionPreviewData)
    expect(confirmRegistration.validator?.({ ...completionPreviewData, previewToken })).toEqual({ ...completionPreviewData, previewToken })
    expect(() => contextRegistration.validator?.({ goalId: 'bad' })).toThrow()
    expect(() => previewRegistration.validator?.({ goalId: completionGoalId })).toThrow()
    expect(() => confirmRegistration.validator?.({ ...completionPreviewData, previewToken: 'bad' })).toThrow()
  })

  it('requires the existing signed-in app session for context, preview, and confirm', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(getGoalCompletionContext({ data: { goalId: completionGoalId } })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    await expect(previewGoalCompletion({ data: completionPreviewData })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    await expect(confirmGoalCompletion({ data: { ...completionPreviewData, previewToken } })).rejects.toMatchObject({ options: expect.objectContaining({ to: '/sign-in/$' }) })
    expect(callFinancialApi).not.toHaveBeenCalled()
  })

  it('maps the completion context from the API route and passes through the missing profile', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ profile: 'missing' }))
    await expect(getGoalCompletionContext({ data: { goalId: completionGoalId } })).resolves.toEqual({ profile: 'missing' })
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/goals/${completionGoalId}/completion`)

    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ profile: 'present', context }))
    await expect(getGoalCompletionContext({ data: { goalId: completionGoalId } })).resolves.toEqual({ profile: 'present', context })
  })

  it('surfaces API domain errors for the completion context', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ message: 'El objetivo no está listo para completarse.' }, 400))
    await expect(getGoalCompletionContext({ data: { goalId: completionGoalId } })).rejects.toThrow('El objetivo no está listo para completarse.')
  })

  it('rejects invalid GET, preview, and confirm payloads through their validators', async () => {
    await expect(getGoalCompletionContext({ data: { goalId: 'not-a-uuid' } })).rejects.toThrow()
    await expect(previewGoalCompletion({ data: { ...completionPreviewData, goalId: 'not-a-uuid' } })).rejects.toThrow()
    await expect(confirmGoalCompletion({ data: { ...completionPreviewData, previewToken: 'short' } })).rejects.toThrow()
    expect(callFinancialApi).not.toHaveBeenCalled()
  })

  it('posts only the preview body to the completion preview route and parses the strict preview', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response(preview))
    await expect(previewGoalCompletion({ data: completionPreviewData })).resolves.toEqual(preview)
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/goals/${completionGoalId}/completion/preview`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ withdrawals: completionPreviewData.withdrawals, allocations: completionPreviewData.allocations }),
    }))

    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ message: 'Completá tu perfil financiero antes de completar un objetivo.' }, 400))
    await expect(previewGoalCompletion({ data: completionPreviewData })).rejects.toThrow('Completá tu perfil financiero antes de completar un objetivo.')
  })

  it('posts confirmation to the completion route and maps completed, stale, and invalid results', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'completed', completedAt: '2026-08-19T12:00:00.000Z' }))
    await expect(confirmGoalCompletion({ data: { ...completionPreviewData, previewToken } })).resolves.toEqual({ status: 'completed', completedAt: '2026-08-19T12:00:00.000Z' })
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/goals/${completionGoalId}/completion`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ withdrawals: completionPreviewData.withdrawals, allocations: completionPreviewData.allocations, previewToken }),
    }))

    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'stale', preview }))
    await expect(confirmGoalCompletion({ data: { ...completionPreviewData, previewToken } })).resolves.toEqual({ status: 'stale', preview })

    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ status: 'invalid', message: 'No se puede completar el objetivo con el estado actual.' }))
    await expect(confirmGoalCompletion({ data: { ...completionPreviewData, previewToken } })).resolves.toEqual({
      status: 'invalid',
      message: 'No se puede completar el objetivo con el estado actual.',
    })
  })

  it('surfaces API errors on confirm without treating them as results', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(response({ message: 'Lugar de ahorro no encontrado.' }, 400))
    await expect(confirmGoalCompletion({ data: { ...completionPreviewData, previewToken } })).rejects.toThrow('Lugar de ahorro no encontrado.')
  })
})
