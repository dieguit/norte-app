import { createHash } from 'node:crypto';
import BigNumber from 'bignumber.js';
import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../database/database.types';
import type { GoalsWorkspaceSource } from '../finances/goals.engine';
import { calculateAllocationAmounts, type Money } from '@repo/finance-utils';
import { getGoalPlanStateWithExecutor } from '../goals/goal-creation.repository';
import { lockFinancialProfile } from '../profile/financial-profile.lock';
import {
  goalInvestmentPositions,
  goalSavingsPositions,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
} from '../profile/profile.schema';
import {
  lockOwnedSavingsPlaces,
  resolveSavingsPlace,
} from '../savings-places/savings-places.data';
import {
  buildSavingPreview,
  deriveMonthlyContributionTargets,
  getEligibleContributionGoals,
  getInvestmentContributionDataState,
  parseSavingDraft,
  requireEligibleContributionGoals,
  selectEligibleGoals,
  serializeContributionState,
  type ContributionKind,
  type EligibleGoal,
  type SavingContributionPreviewResult,
  type SavingDraft,
  type SavingDraftInput,
  type SavingPreviewResult,
} from './saving-contribution';

type ContributionRow = {
  amount: string;
  currency: string;
  createdAt: Date | string;
};
type AllocationRow = {
  id: string;
  goalId: string;
  amount: string;
  percentage: string;
  savingPositionId?: string | null;
  investmentPositionId?: string | null;
};
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

export interface SavingContributionState {
  source: GoalsWorkspaceSource;
  eligibleGoals: EligibleGoal[];
  eligibleGoalsUsd: EligibleGoal[];
  eligibleInvestmentGoals: EligibleGoal[];
  eligibleInvestmentGoalsUsd: EligibleGoal[];
  investmentState: ReturnType<typeof getInvestmentContributionDataState>;
  monthlyTargetArs?: Money | null;
  monthlyTargetUsd?: Money | null;
  monthlyInvestmentTargetArs?: Money | null;
  monthlyInvestmentTargetUsd?: Money | null;
}

export class StaleSavingContributionPreviewError extends Error {
  constructor(readonly refreshedPreview: SavingContributionPreviewResult) {
    super('Stale saving contribution preview');
  }
}

function buildContributionState(
  source: GoalsWorkspaceSource,
  userContributions: ContributionRow[],
  userInvestmentContributions: ContributionRow[],
  currentMonth: string,
): SavingContributionState {
  const allocationPercentages = new Map(
    source.allocations.map((allocation) => [
      allocation.goalId,
      allocation.percentage,
    ]),
  );
  const percentageOf = (goalId: string) =>
    allocationPercentages.get(goalId) ?? '0.00';
  const goals = source.goals;
  const goalAllocations = goals.map((goal) => ({
    id: goal.id,
    currency: goal.currency,
    strategy: goal.strategy,
    percentage: percentageOf(goal.id),
  }));
  const savingTargets = deriveMonthlyContributionTargets({
    monthlyCommitmentArs: source.profile?.plannedMonthlyContribution,
    goals: goalAllocations,
    existingContributions: userContributions,
    currentMonth,
    kind: 'saving',
  });
  const investmentTargets = deriveMonthlyContributionTargets({
    monthlyCommitmentArs: source.profile?.plannedMonthlyContribution,
    goals: goalAllocations,
    existingContributions: userInvestmentContributions,
    currentMonth,
    kind: 'investment',
  });
  const toEligible = (goal: { id: string; name: string }): EligibleGoal => ({
    id: goal.id,
    name: goal.name,
    percentage: percentageOf(goal.id),
  });
  return {
    source,
    eligibleGoals: selectEligibleGoals(goals, 'saving', 'ARS').map(toEligible),
    eligibleGoalsUsd: selectEligibleGoals(goals, 'saving', 'USD').map(
      toEligible,
    ),
    eligibleInvestmentGoals: selectEligibleGoals(
      goals,
      'investment',
      'ARS',
    ).map(toEligible),
    eligibleInvestmentGoalsUsd: selectEligibleGoals(
      goals,
      'investment',
      'USD',
    ).map(toEligible),
    investmentState: getInvestmentContributionDataState({
      goals,
      investmentPositions: source.investmentPositions,
    }),
    monthlyTargetArs: savingTargets.monthlyTargetArs,
    monthlyTargetUsd: savingTargets.monthlyTargetUsd,
    monthlyInvestmentTargetArs: investmentTargets.monthlyTargetArs,
    monthlyInvestmentTargetUsd: investmentTargets.monthlyTargetUsd,
  };
}

async function getSavingContributionStateWithExecutor(
  executor: Executor,
  userId: string,
  currentMonth: string,
): Promise<SavingContributionState | null> {
  const plan = await getGoalPlanStateWithExecutor(
    executor,
    userId,
    currentMonth,
    false,
  );
  if (!plan) return null;
  const userContributions = await executor.query.savingContributions.findMany({
    where: (table: any, { eq }: any) => eq(table.userId, userId),
  });
  const userInvestmentContributions =
    await executor.query.investmentContributions.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    });
  return buildContributionState(
    plan.source,
    userContributions,
    userInvestmentContributions,
    currentMonth,
  );
}

export function getSavingContributionState(
  db: Database,
  userId: string,
  currentMonth: string,
): Promise<SavingContributionState | null> {
  return getSavingContributionStateWithExecutor(db, userId, currentMonth);
}

export function createSavingContributionPreviewToken(
  state: SavingContributionState,
  currentMonth: string,
  draft: SavingDraftInput,
): string {
  const kind = draft.kind ?? 'saving';
  const serialized = serializeContributionState({
    kind,
    draft,
    eligibleGoals: getEligibleContributionGoals(state, kind, draft.currency),
    currentMonth,
    workspaceSource: state.source,
    monthlyTargetArs: state.monthlyTargetArs,
    monthlyTargetUsd: state.monthlyTargetUsd,
    monthlyInvestmentTargetArs: state.monthlyInvestmentTargetArs,
    monthlyInvestmentTargetUsd: state.monthlyInvestmentTargetUsd,
  });
  return createHash('sha256').update(serialized).digest('hex');
}

function buildPreviewResult(
  state: SavingContributionState,
  currentMonth: string,
  draft: SavingDraftInput,
): SavingContributionPreviewResult {
  const kind = draft.kind ?? 'saving';
  const eligibleGoals = requireEligibleContributionGoals(
    state,
    kind,
    draft.currency,
  );
  const preview = buildSavingPreview({
    kind,
    draft,
    eligibleGoals,
    workspaceSource: state.source,
    currentMonth,
  });
  return {
    preview,
    previewToken: createSavingContributionPreviewToken(
      state,
      currentMonth,
      draft,
    ),
  };
}

export async function previewSavingContribution(
  db: Database,
  userId: string,
  currentMonth: string,
  draft: SavingDraftInput,
): Promise<SavingContributionPreviewResult> {
  const state = await getSavingContributionStateWithExecutor(
    db,
    userId,
    currentMonth,
  );
  if (!state)
    throw new Error(
      'Completá tu perfil financiero antes de registrar un ahorro.',
    );
  const kind = draft.kind ?? 'saving';
  const investmentCurrency =
    draft.currency === 'ARS'
      ? state.investmentState.ars
      : state.investmentState.usd;
  if (kind === 'investment' && investmentCurrency.status === 'incomplete') {
    throw new Error(
      `Falta asociar una posición de inversión en ${draft.currency} a uno o más objetivos. Configurala para continuar.`,
    );
  }
  return buildPreviewResult(state, currentMonth, draft);
}

async function assertContributionGoalsAreMutable(
  tx: Executor,
  userId: string,
  allocations: Array<{ goalId: string }>,
): Promise<void> {
  const goalIds = [...new Set(allocations.map(({ goalId }) => goalId))];
  if (!goalIds.length) return;
  const goals = await tx.query.financialGoals.findMany({
    where: (table: any, { and, eq, inArray }: any) =>
      and(eq(table.userId, userId), inArray(table.id, goalIds)),
  });
  if (goals.some((goal: any) => goal.status === 'completed')) {
    throw new Error('No se pueden modificar aportes de objetivos completados.');
  }
}

function getContributionMoneyFields(draft: SavingDraft) {
  return {
    arsSpent: draft.arsSpent ? draft.arsSpent.amount : null,
    effectiveRate: draft.effectiveRate ?? null,
  };
}

async function resolveSavingPlaceForDraft(
  tx: Transaction,
  userId: string,
  draft: SavingDraft,
) {
  if (!draft.place) throw new Error('Elegí un lugar para tu ahorro.');
  return resolveSavingsPlace(tx, userId, draft.place);
}

async function persistSavingContribution(
  tx: Transaction,
  userId: string,
  preview: SavingPreviewResult,
  createdAt?: Date,
) {
  const place = await resolveSavingPlaceForDraft(tx, userId, preview.draft);
  const [contribution] = await tx
    .insert(savingContributions)
    .values({
      userId,
      amount: preview.draft.amount.amount,
      currency: preview.draft.currency,
      placeId: place.id,
      ...getContributionMoneyFields(preview.draft),
      ...(createdAt ? { createdAt } : {}),
    })
    .returning({ id: savingContributions.id });
  for (const allocation of preview.allocations) {
    const [position] = await tx
      .insert(goalSavingsPositions)
      .values({
        goalId: allocation.goalId,
        amount: allocation.amount.amount,
        currency: allocation.amount.currency,
      })
      .returning({ id: goalSavingsPositions.id });
    await tx.insert(savingContributionAllocations).values({
      contributionId: contribution.id,
      goalId: allocation.goalId,
      amount: allocation.amount.amount,
      percentage: allocation.percentage,
      savingPositionId: position.id,
    });
  }
  return { contributionId: contribution.id as string };
}

async function resolveInvestmentPosition(
  tx: Executor,
  positions: GoalsWorkspaceSource['investmentPositions'],
  goalId: string,
) {
  const existing = positions.find((position) => position.goalId === goalId);
  const position =
    existing ??
    (await tx.query.goalInvestmentPositions.findFirst({
      where: (table: any, { eq }: any) => eq(table.goalId, goalId),
    }));
  if (!position)
    throw new Error(`Investment position not found for goal ${goalId}`);
  return position;
}

async function persistInvestmentContribution(
  tx: Transaction,
  userId: string,
  state: SavingContributionState,
  preview: SavingPreviewResult,
  createdAt?: Date,
) {
  const [contribution] = await tx
    .insert(investmentContributions)
    .values({
      userId,
      amount: preview.draft.amount.amount,
      currency: preview.draft.currency,
      ...getContributionMoneyFields(preview.draft),
      ...(createdAt ? { createdAt } : {}),
    })
    .returning({ id: investmentContributions.id });
  const positions = new Map<string, { id: string; currentValue: string }>();
  for (const allocation of preview.allocations) {
    const position = await resolveInvestmentPosition(
      tx,
      state.source.investmentPositions ?? [],
      allocation.goalId,
    );
    positions.set(allocation.goalId, position);
    const currentValue = new BigNumber(position.currentValue)
      .plus(allocation.amount.amount)
      .toFixed(2);
    await tx
      .update(goalInvestmentPositions)
      .set({ currentValue })
      .where(eq(goalInvestmentPositions.id, position.id));
  }
  await tx.insert(investmentContributionAllocations).values(
    preview.allocations.map((allocation) => ({
      contributionId: contribution.id,
      goalId: allocation.goalId,
      amount: allocation.amount.amount,
      percentage: allocation.percentage,
      investmentPositionId: positions.get(allocation.goalId)!.id,
    })),
  );
  return { contributionId: contribution.id as string };
}

async function createContributionInTransaction(
  tx: Transaction,
  input: {
    userId: string;
    currentMonth: string;
    draft: SavingDraftInput;
    previewToken: string;
    createdAt?: Date;
  },
) {
  const { userId, currentMonth, draft, previewToken, createdAt } = input;
  const state = await getSavingContributionStateWithExecutor(
    tx,
    userId,
    currentMonth,
  );
  if (!state) throw new Error('Financial profile not found.');
  const kind: ContributionKind = draft.kind ?? 'saving';
  const current = buildPreviewResult(state, currentMonth, draft);
  if (current.previewToken !== previewToken) {
    throw new StaleSavingContributionPreviewError(current);
  }
  if (kind === 'investment')
    return persistInvestmentContribution(
      tx,
      userId,
      state,
      current.preview,
      createdAt,
    );
  return persistSavingContribution(tx, userId, current.preview, createdAt);
}

export function createSavingContributionInRepository(
  db: Database,
  input: {
    userId: string;
    currentMonth: string;
    draft: SavingDraftInput;
    previewToken: string;
    createdAt?: Date;
  },
): Promise<{ contributionId: string }> {
  return db.transaction(async (tx) => {
    await lockFinancialProfile(tx, input.userId);
    return createContributionInTransaction(tx, input);
  });
}

type OwnedContribution =
  | { kind: 'saving'; row: typeof savingContributions.$inferSelect }
  | { kind: 'investment'; row: typeof investmentContributions.$inferSelect };

async function requireOwnedContribution(
  tx: Executor,
  userId: string,
  contributionId: string,
): Promise<OwnedContribution> {
  const saving = await tx.query.savingContributions.findFirst({
    where: (table: any, { and, eq }: any) =>
      and(eq(table.id, contributionId), eq(table.userId, userId)),
  });
  if (saving) return { kind: 'saving', row: saving };
  const investment = await tx.query.investmentContributions.findFirst({
    where: (table: any, { and, eq }: any) =>
      and(eq(table.id, contributionId), eq(table.userId, userId)),
  });
  if (investment) return { kind: 'investment', row: investment };
  throw new Error('Contribution not found or not owned by user.');
}

function findAllocations(
  tx: any,
  table: 'investmentContributionAllocations' | 'savingContributionAllocations',
  contributionId: string,
) {
  return tx.query[table].findMany({
    where: (t: any, { eq }: any) => eq(t.contributionId, contributionId),
  });
}

async function loadSavingAllocations(
  tx: Executor,
  contributionId: string,
): Promise<AllocationRow[]> {
  const allocations = await findAllocations(
    tx,
    'savingContributionAllocations',
    contributionId,
  );
  if (!allocations.length)
    throw new Error('No allocations found for contribution.');
  return allocations;
}

async function loadInvestmentAllocations(
  tx: Executor,
  contributionId: string,
): Promise<AllocationRow[]> {
  const allocations = await findAllocations(
    tx,
    'investmentContributionAllocations',
    contributionId,
  );
  if (!allocations.length)
    throw new Error('No allocations found for contribution.');
  return allocations;
}

async function updateSavingAllocations(
  tx: Transaction,
  allocations: AllocationRow[],
  draft: SavingDraft,
): Promise<void> {
  const amounts = calculateAllocationAmounts(
    draft.amount,
    allocations.map((allocation) => ({
      id: allocation.id,
      percentage: allocation.percentage,
    })),
  );
  for (const allocation of allocations) {
    const amount = amounts.find((item) => item.id === allocation.id)!.amount
      .amount;
    await tx
      .update(goalSavingsPositions)
      .set({ amount })
      .where(eq(goalSavingsPositions.id, allocation.savingPositionId!));
    await tx
      .update(savingContributionAllocations)
      .set({ amount })
      .where(eq(savingContributionAllocations.id, allocation.id));
  }
}

function assertContributionCurrency(actual: string, expected: string): void {
  if (actual !== expected)
    throw new Error('Cannot change contribution currency on update.');
}

async function loadInvestmentPositions(
  tx: Transaction,
  allocations: AllocationRow[],
) {
  const positions = new Map<string, any>();
  for (const allocation of allocations) {
    const position = await tx.query.goalInvestmentPositions.findFirst({
      where: (table: any, { eq }: any) =>
        eq(table.id, allocation.investmentPositionId),
    });
    if (!position)
      throw new Error(
        `Investment position not found for goal ${allocation.goalId}`,
      );
    positions.set(allocation.id, position);
  }
  return positions;
}

async function updateInvestmentAllocations(
  tx: Transaction,
  allocations: AllocationRow[],
  draft: SavingDraft,
): Promise<void> {
  const amounts = calculateAllocationAmounts(
    draft.amount,
    allocations.map((allocation) => ({
      id: allocation.id,
      percentage: allocation.percentage,
    })),
  );
  const positions = await loadInvestmentPositions(tx, allocations);
  for (const allocation of allocations) {
    const amount = amounts.find((item) => item.id === allocation.id)!.amount
      .amount;
    const delta = new BigNumber(amount).minus(new BigNumber(allocation.amount));
    const position = positions.get(allocation.id)!;
    const newValue = new BigNumber(position.currentValue)
      .plus(delta)
      .toFixed(2);
    const updated = await tx
      .update(goalInvestmentPositions)
      .set({ currentValue: newValue })
      .where(eq(goalInvestmentPositions.id, allocation.investmentPositionId!))
      .returning({ id: goalInvestmentPositions.id });
    if (!updated.length)
      throw new Error(
        `Investment position update affected no rows for goal ${allocation.goalId}`,
      );
    await tx
      .update(investmentContributionAllocations)
      .set({ amount })
      .where(eq(investmentContributionAllocations.id, allocation.id));
  }
}

async function updateContributionTransaction(
  tx: Transaction,
  input: { userId: string; contributionId: string; draft: SavingDraftInput },
): Promise<void> {
  const owned = await requireOwnedContribution(
    tx,
    input.userId,
    input.contributionId,
  );
  if (owned.kind === 'investment') {
    const allocations = await loadInvestmentAllocations(
      tx,
      input.contributionId,
    );
    await assertContributionGoalsAreMutable(tx, input.userId, allocations);
    const draft = parseSavingDraft(input.draft);
    assertContributionCurrency(draft.currency, owned.row.currency);
    await updateInvestmentAllocations(tx, allocations, draft);
    await tx
      .update(investmentContributions)
      .set({
        amount: draft.amount.amount,
        ...getContributionMoneyFields(draft),
      })
      .where(eq(investmentContributions.id, input.contributionId));
    return;
  }
  const allocations = await loadSavingAllocations(tx, input.contributionId);
  await assertContributionGoalsAreMutable(tx, input.userId, allocations);
  const draft = parseSavingDraft(input.draft);
  assertContributionCurrency(draft.currency, owned.row.currency);
  const place = await resolveSavingPlaceForDraft(tx, input.userId, draft);
  const placeIds = [...new Set([owned.row.placeId, place.id])].sort();
  await lockOwnedSavingsPlaces(tx, input.userId, placeIds);
  await updateSavingAllocations(tx, allocations, draft);
  await tx
    .update(savingContributions)
    .set({
      amount: draft.amount.amount,
      placeId: place.id,
      ...getContributionMoneyFields(draft),
    })
    .where(eq(savingContributions.id, input.contributionId));
}

export function updateSavingContributionInRepository(
  db: Database,
  input: { userId: string; contributionId: string; draft: SavingDraftInput },
): Promise<void> {
  return db.transaction(async (tx) => {
    await lockFinancialProfile(tx, input.userId);
    return updateContributionTransaction(tx, input);
  });
}

async function deleteSavingPositions(
  tx: Transaction,
  allocations: AllocationRow[],
): Promise<void> {
  const positionIds = allocations
    .map((allocation) => allocation.savingPositionId)
    .filter(Boolean) as string[];
  if (!positionIds.length) return;
  await tx
    .delete(goalSavingsPositions)
    .where(inArray(goalSavingsPositions.id, positionIds));
}

async function deleteInvestmentPositionValues(
  tx: Transaction,
  allocations: AllocationRow[],
): Promise<void> {
  const positions = await loadInvestmentPositions(tx, allocations);
  for (const allocation of allocations) {
    const position = positions.get(allocation.id)!;
    const newValue = new BigNumber(position.currentValue)
      .minus(new BigNumber(allocation.amount))
      .toFixed(2);
    const updated = await tx
      .update(goalInvestmentPositions)
      .set({ currentValue: newValue })
      .where(eq(goalInvestmentPositions.id, allocation.investmentPositionId!))
      .returning({ id: goalInvestmentPositions.id });
    if (!updated.length)
      throw new Error(
        `Investment position update affected no rows for goal ${allocation.goalId}`,
      );
  }
}

export function deleteSavingContributionInRepository(
  db: Database,
  input: { userId: string; contributionId: string },
): Promise<void> {
  return db.transaction(async (tx) => {
    await lockFinancialProfile(tx, input.userId);
    const owned = await requireOwnedContribution(
      tx,
      input.userId,
      input.contributionId,
    );
    if (owned.kind === 'investment') {
      const allocations = await findAllocations(
        tx,
        'investmentContributionAllocations',
        input.contributionId,
      );
      await assertContributionGoalsAreMutable(tx, input.userId, allocations);
      await deleteInvestmentPositionValues(tx, allocations);
      await tx
        .delete(investmentContributions)
        .where(eq(investmentContributions.id, input.contributionId));
      return;
    }
    await lockOwnedSavingsPlaces(tx, input.userId, [owned.row.placeId]);
    const allocations = await findAllocations(
      tx,
      'savingContributionAllocations',
      input.contributionId,
    );
    await assertContributionGoalsAreMutable(tx, input.userId, allocations);
    await deleteSavingPositions(tx, allocations);
    await tx
      .delete(savingContributions)
      .where(eq(savingContributions.id, input.contributionId));
  });
}

export async function previewSavingContributionEdit(
  db: Database,
  input: {
    userId: string;
    currentMonth: string;
    contributionId: string;
    draft: SavingDraftInput;
  },
): Promise<{ preview: SavingPreviewResult }> {
  const { userId, currentMonth, contributionId, draft } = input;
  const state = await getSavingContributionStateWithExecutor(
    db,
    userId,
    currentMonth,
  );
  if (!state)
    throw new Error(
      'Completá tu perfil financiero antes de registrar un ahorro.',
    );
  const owned = await requireOwnedContribution(db, userId, contributionId);
  const kind: ContributionKind = owned.kind;
  const allocations =
    owned.kind === 'investment'
      ? await loadInvestmentAllocations(db, contributionId)
      : await loadSavingAllocations(db, contributionId);
  await assertContributionGoalsAreMutable(db, userId, allocations);
  assertContributionCurrency(
    parseSavingDraft(draft).currency,
    owned.row.currency,
  );
  const goals = await db.query.financialGoals.findMany({
    where: (table: any, { inArray }: any) =>
      inArray(
        table.id,
        allocations.map(({ goalId }) => goalId),
      ),
  });
  const goalNames = new Map(goals.map((goal: any) => [goal.id, goal.name]));
  const eligibleGoals = allocations.map((allocation) => ({
    id: allocation.goalId,
    name: goalNames.get(allocation.goalId) ?? '',
    percentage: allocation.percentage,
  }));
  const preview = buildSavingPreview({
    kind,
    draft: { ...draft, kind },
    eligibleGoals,
    workspaceSource: state.source,
    currentMonth,
  });
  return { preview };
}
