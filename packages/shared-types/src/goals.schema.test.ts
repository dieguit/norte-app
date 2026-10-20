import { describe, expect, it } from 'vitest';
import { AllocationChangeContextSchema, AllocationChangeDraftWireSchema, AllocationChangePreviewSchema, ConfirmGoalLifecycleWireSchema, GoalCreationContextStateSchema, GoalCreationConfirmationSchema, GoalLifecycleConfirmationSchema, GoalLifecyclePreviewSchema, GoalLifecyclePreviewWireSchema, GoalPlanContextStateSchema, GoalPlanQueryWireSchema, GoalEditConfirmationSchema, GoalsWorkspaceSchema, GoalCompletionContextStateSchema, GoalCompletionPreviewWireSchema, ConfirmGoalCompletionWireSchema, GoalCompletionPreviewSchema, GoalCompletionConfirmationSchema } from './goals.schema';

describe('GoalsWorkspaceSchema', () => {
  it('accepts only the exact missing or present workspace shape', () => {
    expect(GoalsWorkspaceSchema.safeParse({ profile: 'missing' }).success).toBe(true);
    expect(GoalsWorkspaceSchema.safeParse({ profile: 'present', workspace: {
      financialSummary: { month: '2026-08', income: { amount: '0.00', currency: 'ARS' }, expenses: { amount: '0.00', currency: 'ARS' }, balance: { amount: '0.00', currency: 'ARS' }, dedicationPercentage: '90.00', contribution: { amount: '0.00', currency: 'ARS' } },
      groups: ['active', 'paused', 'completed'].map((status) => ({ status, goals: [] })),
    } }).success).toBe(true);
    expect(GoalsWorkspaceSchema.safeParse({ profile: 'missing', workspace: {} }).success).toBe(false);
    expect(GoalsWorkspaceSchema.safeParse({ profile: 'present' }).success).toBe(false);
    expect(GoalsWorkspaceSchema.safeParse({ profile: 'missing', unmodeled: true }).success).toBe(false);
  });
});

describe('goal creation wire schemas', () => {
  it('accepts the exact context and confirmation variants', () => {
    expect(GoalCreationContextStateSchema.safeParse({ profile: 'missing' }).success).toBe(true);
    expect(GoalCreationContextStateSchema.safeParse({ profile: 'present', context: {
      currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false,
    } }).success).toBe(true);
    expect(GoalCreationConfirmationSchema.safeParse({ status: 'created', goalId: 'id' }).success).toBe(true);
    expect(GoalCreationConfirmationSchema.safeParse({ status: 'created', goalId: 'id', sql: 'secret' }).success).toBe(false);
  });
});

describe('goal edit wire schemas', () => {
  it('accepts selected edit context and updated/stale confirmation shapes only', () => {
    const context = { profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false }, editContext: {
      goalId: '2b5e7162-00f4-4f03-a1b6-1d69443251a0', status: 'paused', draft: {
        type: 'purchase', name: 'Trip', targetAmount: '1', currency: 'ARS', desiredMonth: '2027-01', priority: 'medium', strategy: 'save', annualReturnRate: '', availability: 'available_now', availableFromMonth: '', allocations: [],
      },
    } }
    expect(GoalPlanContextStateSchema.safeParse(context).success).toBe(true)
    expect(GoalPlanContextStateSchema.safeParse({ ...context, editContext: { ...context.editContext, updatedAt: 'secret' } }).success).toBe(false)
    expect(GoalEditConfirmationSchema.safeParse({ status: 'updated' }).success).toBe(true)
    expect(GoalEditConfirmationSchema.safeParse({ status: 'stale', preview: { proposal: {}, previewToken: 'a'.repeat(64) } }).success).toBe(false)
  })
})

describe('allocation change wire schemas', () => {
  const allocationContext = {
    currentMonth: '2026-08', financialSummary: {
      month: '2026-08', income: { amount: '5000.00', currency: 'ARS' }, expenses: { amount: '3000.00', currency: 'ARS' },
      balance: { amount: '2000.00', currency: 'ARS' }, dedicationPercentage: '90.00', contribution: { amount: '1800.00', currency: 'ARS' },
    }, activeGoals: [{ id: 'g', name: 'Goal', currency: 'ARS', projection: { status: 'available', completionMonth: '2027-01' } }],
  };

  it('extends common plan context without breaking legacy creation/edit projections', () => {
    const legacy = { profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false } };
    expect(GoalPlanContextStateSchema.safeParse(legacy).success).toBe(true);
    expect(GoalPlanContextStateSchema.safeParse({ ...legacy, allocationContext }).success).toBe(true);
    expect(GoalCreationContextStateSchema.safeParse(legacy).success).toBe(true);
    expect(GoalCreationContextStateSchema.safeParse({ ...legacy, allocationContext }).success).toBe(false);
    expect(AllocationChangeContextSchema.safeParse({ ...allocationContext, internalId: 'secret' }).success).toBe(false);
  });

  it('rejects malformed and unexpected allocation request fields', () => {
    expect(AllocationChangeDraftWireSchema.safeParse({ dedicationPercentage: 90, allocations: [{ goalId: 'g', percentage: '100.00' }] }).success).toBe(true);
    expect(AllocationChangeDraftWireSchema.safeParse({ dedicationPercentage: 101, allocations: [{ goalId: 'g', percentage: '100.00' }] }).success).toBe(false);
    expect(AllocationChangeDraftWireSchema.safeParse({ dedicationPercentage: 90, allocations: [], userId: 'attacker' }).success).toBe(false);
  });

  it('strictly validates projected previews and rejects database metadata', () => {
    const preview = {
      previewToken: 'a'.repeat(64),
      proposal: {
        dedicationPercentage: 70,
        allocation: { monthlyContribution: { amount: '0.00', currency: 'ARS' }, effectiveMonth: '2026-08-01', entries: [], totalPercentage: '100.00' },
        impacts: [], proposedSource: { profile: null, goals: [], savingsPositions: [], investmentPositions: [], snapshots: [], allocations: [] },
      },
    };
    expect(AllocationChangePreviewSchema.safeParse(preview).success).toBe(true);
    expect(AllocationChangePreviewSchema.safeParse({ ...preview, proposal: { ...preview.proposal, proposedSource: { ...preview.proposal.proposedSource, updatedAt: 'secret' } } }).success).toBe(false);
  });
});

describe('goal lifecycle wire schemas', () => {
  const goalId = '11111111-1111-4111-8111-111111111111';
  const lifecycleContext = {
    goalId, lifecycle: 'pause', goalName: 'Reserva', goalCurrency: 'ARS', currentMonth: '2026-08',
    plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
    activeGoals: [{ id: goalId, name: 'Reserva', currency: 'ARS' }],
    currentAllocation: { effectiveMonth: '2026-08-01', entries: [{ goalId, percentage: '100.00' }] },
  };
  const plan = { profile: 'present', context: { currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false }, lifecycleContext };
  const proposal = {
    lifecycle: 'pause', goalId, nextStatus: 'paused', transition: { goalId, status: 'paused' }, pauseMonthlyCommitment: true,
    allocation: { effectiveMonth: '2026-08-01', entries: [{ goalId, goalName: 'Reserva', percentage: '100.00', pending: false }], totalPercentage: '100.00' },
    persistedAllocation: { effectiveMonth: '2026-08-01', entries: [{ goalId, percentage: '100.00' }] },
    impacts: [], proposedSource: { profile: null, goals: [], savingsPositions: [], investmentPositions: [], snapshots: [], allocations: [] },
  };

  it('requires goalId for lifecycle plan queries and accepts only pause or resume', () => {
    expect(GoalPlanQueryWireSchema.safeParse({ goalId, action: 'pause' }).success).toBe(true);
    expect(GoalPlanQueryWireSchema.safeParse({ goalId, action: 'resume' }).success).toBe(true);
    expect(GoalPlanQueryWireSchema.safeParse({ action: 'pause' }).success).toBe(false);
    expect(GoalPlanQueryWireSchema.safeParse({ goalId, action: 'complete' }).success).toBe(false);
  });

  it('extends present plan context with an exact lifecycle context', () => {
    expect(GoalPlanContextStateSchema.safeParse(plan).success).toBe(true);
    expect(GoalPlanContextStateSchema.safeParse({ ...plan, lifecycleContext: { ...lifecycleContext, userId: 'secret' } }).success).toBe(false);
    expect(GoalPlanContextStateSchema.safeParse({ ...plan, lifecycleContext: { ...lifecycleContext, lifecycle: 'complete' } }).success).toBe(false);
  });

  it('accepts exact request bodies only', () => {
    expect(GoalLifecyclePreviewWireSchema.safeParse({ lifecycle: 'resume' }).success).toBe(true);
    expect(GoalLifecyclePreviewWireSchema.safeParse({ lifecycle: 'pause', allocations: [{ goalId, percentage: '100.00' }] }).success).toBe(true);
    expect(GoalLifecyclePreviewWireSchema.safeParse({ lifecycle: 'pause', goalId }).success).toBe(false);
    const confirm = { lifecycle: 'pause', allocations: [], previewToken: 'a'.repeat(64) };
    expect(ConfirmGoalLifecycleWireSchema.safeParse(confirm).success).toBe(true);
    expect(ConfirmGoalLifecycleWireSchema.safeParse({ ...confirm, allocations: undefined }).success).toBe(false);
    expect(ConfirmGoalLifecycleWireSchema.safeParse({ ...confirm, previewToken: 'bad' }).success).toBe(false);
  });

  it('validates projected previews and the updated or stale confirmation unions', () => {
    const preview = { proposal, previewToken: 'a'.repeat(64) };
    expect(GoalLifecyclePreviewSchema.safeParse(preview).success).toBe(true);
    expect(GoalLifecyclePreviewSchema.safeParse({ ...preview, proposal: { ...proposal, proposedSource: { ...proposal.proposedSource, updatedAt: 'secret' } } }).success).toBe(false);
    expect(GoalLifecycleConfirmationSchema.safeParse({ status: 'updated' }).success).toBe(true);
    expect(GoalLifecycleConfirmationSchema.safeParse({ status: 'stale', preview }).success).toBe(true);
    expect(GoalLifecycleConfirmationSchema.safeParse({ status: 'updated', sql: 'secret' }).success).toBe(false);
  });
});

describe('goal completion wire schemas', () => {
  const goalId = '11111111-1111-4111-8111-111111111111';
  const placeId = '22222222-2222-4222-8222-222222222222';
  const token = 'a'.repeat(64);
  const context = {
    goalId, goalName: 'Notebook', targetAmount: { amount: '1000.00', currency: 'ARS' }, savingsValue: { amount: '1000.00', currency: 'ARS' },
    currentMonth: '2026-08', savingsPlaces: [{ id: placeId, name: 'Banco', balance: { amount: '700.00', currency: 'ARS' } }],
    activeGoals: [{ id: goalId, name: 'Notebook', currency: 'ARS' }],
  };
  const preview = {
    proposal: {
      goalId, goalName: 'Notebook', targetAmount: { amount: '1000.00', currency: 'ARS' },
      withdrawals: [{ placeId, placeName: 'Banco', amount: { amount: '1000.00', currency: 'ARS' } }],
      allocation: { effectiveMonth: '2026-08-01', entries: [], totalPercentage: '0.00' },
      persistedAllocation: { effectiveMonth: '2026-08-01', entries: [] }, pauseMonthlyCommitment: false,
      impacts: [], proposedSource: { profile: null, goals: [], savingsPositions: [], investmentPositions: [], snapshots: [], allocations: [] },
    },
    previewToken: token,
  };

  it('accepts the exact present context and rejects extra metadata', () => {
    expect(GoalCompletionContextStateSchema.safeParse({ profile: 'present', context }).success).toBe(true);
    expect(GoalCompletionContextStateSchema.safeParse({ profile: 'missing' }).success).toBe(true);
    expect(GoalCompletionContextStateSchema.safeParse({ profile: 'present', context: { ...context, sql: 'x' } }).success).toBe(false);
  });

  it('keeps preview and confirm bodies strict with a 64-hex preview token', () => {
    const body = { withdrawals: [{ placeId, amount: '1000.00' }], allocations: [] };
    expect(GoalCompletionPreviewWireSchema.safeParse(body).success).toBe(true);
    expect(GoalCompletionPreviewWireSchema.safeParse({ ...body, goalId }).success).toBe(false);
    expect(ConfirmGoalCompletionWireSchema.safeParse({ ...body, previewToken: token }).success).toBe(true);
    expect(ConfirmGoalCompletionWireSchema.safeParse({ ...body, previewToken: 'bad' }).success).toBe(false);
  });

  it('accepts only completed, stale, or invalid confirmation unions', () => {
    expect(GoalCompletionPreviewSchema.safeParse(preview).success).toBe(true);
    expect(GoalCompletionConfirmationSchema.safeParse({ status: 'completed', completedAt: '2026-08-19T12:00:00.000Z' }).success).toBe(true);
    expect(GoalCompletionConfirmationSchema.safeParse({ status: 'stale', preview }).success).toBe(true);
    expect(GoalCompletionConfirmationSchema.safeParse({ status: 'invalid', message: 'No se puede completar el objetivo con el estado actual.' }).success).toBe(true);
    expect(GoalCompletionConfirmationSchema.safeParse({ status: 'completed', completedAt: '2026-08-19T12:00:00.000Z', sql: 'secret' }).success).toBe(false);
  });
});
