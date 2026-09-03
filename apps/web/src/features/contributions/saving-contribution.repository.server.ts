import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import BigNumber from 'bignumber.js'
import { db } from '../../db/client'
import { lockOwnedSavingsPlaces } from '../savings-places/savings-places.repository.server'
import { withLockedFinancialProfile } from '../../db/with-locked-financial-profile.server'
import {
  goalInvestmentPositions,
  goalSavingsPositions,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
} from '../../db/schema'
import { calculateAllocationAmounts } from '../../lib/money'
import type { GoalsWorkspaceSource } from '../goals/goals'
import {
  mapRowsToGoalsWorkspaceSource,
  selectWinningSnapshots,
} from '../goals/goals.repository.server'
import { resolveSavingsPlaceWithExecutor } from '../savings-places/savings-places.repository.server'
import type { Money } from '../../lib/money'
import {
  buildSavingPreview,
  deriveMonthlyContributionTargets,
  getEligibleContributionGoals,
  getInvestmentContributionDataState,
  requireEligibleContributionGoals,
  parseSavingDraft,
  selectEligibleGoals,
  serializeContributionState,
  type EligibleGoal,
  type SavingContributionPreviewResult,
  type SavingDraftInput,
  type SavingPreviewResult,
} from './saving-contribution'

export interface SavingContributionState {
  source: GoalsWorkspaceSource
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
  eligibleInvestmentGoals: EligibleGoal[]
  eligibleInvestmentGoalsUsd: EligibleGoal[]
  investmentState: ReturnType<typeof getInvestmentContributionDataState>
  monthlyTargetArs?: Money | null
  monthlyTargetUsd?: Money | null
  monthlyInvestmentTargetArs?: Money | null
  monthlyInvestmentTargetUsd?: Money | null
}

export class StaleSavingContributionPreviewError extends Error {
  readonly refreshedPreview: SavingContributionPreviewResult
  constructor(refreshedPreview: SavingContributionPreviewResult) {
    super('Stale saving contribution preview')
    this.name = 'StaleSavingContributionPreviewError'
    this.refreshedPreview = refreshedPreview
  }
}

function createContributionPreviewToken(
  state: SavingContributionState,
  currentMonth: string,
  draft: SavingDraftInput,
): string {
  const kind = draft.kind ?? 'saving'
  const eligible = getEligibleContributionGoals(state, kind, draft.currency)

  const serialized = serializeContributionState({
    kind,
    draft,
    eligibleGoals: eligible,
    currentMonth,
    workspaceSource: state.source,
    monthlyTargetArs: state.monthlyTargetArs,
    monthlyTargetUsd: state.monthlyTargetUsd,
    monthlyInvestmentTargetArs: state.monthlyInvestmentTargetArs,
    monthlyInvestmentTargetUsd: state.monthlyInvestmentTargetUsd,
  })
  return createHash('sha256').update(serialized).digest('hex')
}

export const createSavingContributionPreviewToken = createContributionPreviewToken

async function assertContributionGoalsAreMutable(
  tx: any,
  userId: string,
  allocations: Array<{ goalId: string }>,
): Promise<void> {
  const goalIds = [...new Set(allocations.map(({ goalId }) => goalId))]
  if (!goalIds.length) return

  const goals = await tx.query.financialGoals.findMany({
    where: (goalsTable: any, { and, eq, inArray }: any) =>
      and(eq(goalsTable.userId, userId), inArray(goalsTable.id, goalIds)),
  })

  if (goals.some((goal: any) => goal.status === 'completed')) {
    throw new Error('No se pueden modificar aportes de objetivos completados.')
  }
}

type ContributionStateRows = {
  currentMonth: string
  profile: any
  goals: any[]
  savingsPositions: any[]
  investmentPositions: any[]
  winningSnapshots: any[]
  allocations: any[]
  userContributions: any[]
  userInvestmentContributions: any[]
}

async function loadFinancialProfile(executor: any, userId: string) {
  const profile = await executor.query.financialProfiles.findFirst({
    where: (profiles: any, { eq }: any) => eq(profiles.userId, userId),
  })
  return profile
}

async function loadGoalsAndPositions(executor: any, userId: string) {
  const goals = await executor.query.financialGoals.findMany({
    where: (goalsTable: any, { eq }: any) => eq(goalsTable.userId, userId),
  })
  const goalIds = goals.map((g: any) => g.id)
  const savingsPositions =
    goalIds.length > 0
      ? await executor.query.goalSavingsPositions.findMany({
          where: (pos: any, { inArray }: any) => inArray(pos.goalId, goalIds),
        })
      : []
  const investmentPositions =
    goalIds.length > 0
      ? await executor.query.goalInvestmentPositions.findMany({
          where: (pos: any, { inArray }: any) => inArray(pos.goalId, goalIds),
        })
      : []
  return { goals, savingsPositions, investmentPositions }
}

async function loadWinningPlan(executor: any, userId: string, currentMonth: string) {
  const snapshots = await executor.query.allocationPlanSnapshots.findMany({
    where: (snapshotsTable: any, { eq }: any) => eq(snapshotsTable.userId, userId),
  })
  const winningSnapshots = selectWinningSnapshots(snapshots, currentMonth)
  const winningSnapshotIds = winningSnapshots.map((s: any) => s.id)
  const allocations =
    winningSnapshotIds.length > 0
      ? await executor.query.allocationPlanEntries.findMany({
          where: (allocsTable: any, { inArray }: any) =>
            inArray(allocsTable.snapshotId, winningSnapshotIds),
        })
      : []
  return { winningSnapshots, allocations }
}

async function loadContributions(executor: any, userId: string) {
  const userContributions = await executor.query.savingContributions.findMany({
    where: (contributionsTable: any, { eq }: any) => eq(contributionsTable.userId, userId),
  })
  const userInvestmentContributions = await executor.query.investmentContributions.findMany({
    where: (contributionsTable: any, { eq }: any) => eq(contributionsTable.userId, userId),
  })
  return { userContributions, userInvestmentContributions }
}

async function loadContributionStateRows(
  executor: any,
  userId: string,
  currentMonth: string,
  profile: any,
): Promise<ContributionStateRows> {
  const goalsAndPositions = await loadGoalsAndPositions(executor, userId)
  const plan = await loadWinningPlan(executor, userId, currentMonth)
  const contributions = await loadContributions(executor, userId)
  return { currentMonth, profile, ...goalsAndPositions, ...plan, ...contributions }
}

function buildContributionState(rows: ContributionStateRows): SavingContributionState {
  const activeGoals = rows.goals.filter((goal: any) => goal.status === 'active')
  const allocMap = new Map<string, string>()
  for (const alloc of rows.allocations) {
    allocMap.set(alloc.goalId, alloc.percentage)
  }
  const mapToEligibleGoal = (goal: any): EligibleGoal => ({
    id: goal.id,
    name: goal.name,
    percentage: allocMap.get(goal.id) ?? '0.00',
  })
  const eligibleGoals = selectEligibleGoals(rows.goals, 'saving', 'ARS').map(mapToEligibleGoal)
  const eligibleGoalsUsd = selectEligibleGoals(rows.goals, 'saving', 'USD').map(mapToEligibleGoal)
  const eligibleInvestmentGoals = selectEligibleGoals(rows.goals, 'investment', 'ARS').map(mapToEligibleGoal)
  const eligibleInvestmentGoalsUsd = selectEligibleGoals(rows.goals, 'investment', 'USD').map(mapToEligibleGoal)
  const goalAllocations = activeGoals.map((goal: any) => ({
    id: goal.id,
    currency: goal.currency,
    strategy: goal.strategy,
    percentage: allocMap.get(goal.id) ?? '0.00',
  }))
  const savingTargets = deriveMonthlyContributionTargets({
    monthlyCommitmentArs: rows.profile.plannedMonthlyContribution,
    goals: goalAllocations,
    existingContributions: rows.userContributions,
    currentMonth: rows.currentMonth,
    kind: 'saving',
  })
  const investmentTargets = deriveMonthlyContributionTargets({
    monthlyCommitmentArs: rows.profile.plannedMonthlyContribution,
    goals: goalAllocations,
    existingContributions: rows.userInvestmentContributions,
    currentMonth: rows.currentMonth,
    kind: 'investment',
  })
  return {
    source: mapRowsToGoalsWorkspaceSource({
      profile: rows.profile,
      goals: activeGoals,
      savingsPositions: rows.savingsPositions,
      investmentPositions: rows.investmentPositions,
      snapshots: rows.winningSnapshots,
      allocations: rows.allocations,
    }),
    eligibleGoals,
    eligibleGoalsUsd,
    eligibleInvestmentGoals,
    eligibleInvestmentGoalsUsd,
    investmentState: getInvestmentContributionDataState({
      goals: activeGoals,
      investmentPositions: rows.investmentPositions,
    }),
    monthlyTargetArs: savingTargets.monthlyTargetArs,
    monthlyTargetUsd: savingTargets.monthlyTargetUsd,
    monthlyInvestmentTargetArs: investmentTargets.monthlyTargetArs,
    monthlyInvestmentTargetUsd: investmentTargets.monthlyTargetUsd,
  }
}

async function getSavingContributionStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<SavingContributionState | null> {
  const profile = await loadFinancialProfile(executor, userId)
  if (!profile) return null
  const rows = await loadContributionStateRows(executor, userId, currentMonth, profile)
  return buildContributionState(rows)
}

export async function getSavingContributionState(
  userId: string,
  currentMonth: string,
): Promise<SavingContributionState | null> {
  return getSavingContributionStateWithExecutor(db, userId, currentMonth)
}

type CreateContributionInput = {
  userId: string
  currentMonth: string
  draft: SavingDraftInput
  previewToken: string
  createdAt?: Date
}

function requireContributionGoals(state: SavingContributionState, draft: SavingDraftInput): EligibleGoal[] {
  const kind = draft.kind ?? 'saving'
  return requireEligibleContributionGoals(state, kind, draft.currency)
}

function assertPreviewToken(
  state: SavingContributionState,
  currentMonth: string,
  draft: SavingDraftInput,
  preview: SavingPreviewResult,
  previewToken: string,
): void {
  const currentToken = createContributionPreviewToken(state, currentMonth, draft)
  if (currentToken !== previewToken) {
    throw new StaleSavingContributionPreviewError({ preview, previewToken: currentToken })
  }
}

async function insertInvestmentContribution(tx: any, input: CreateContributionInput, draft: any) {
  const [contribution] = await tx
    .insert(investmentContributions)
    .values({
      userId: input.userId,
      amount: draft.amount.amount,
      currency: draft.currency,
      ...getContributionMoneyFields(draft),
      ...getCreatedAtField(input.createdAt),
    })
    .returning({ id: investmentContributions.id })
  return contribution
}

function getContributionMoneyFields(draft: any) {
  return {
    arsSpent: draft.arsSpent ? draft.arsSpent.amount : null,
    effectiveRate: draft.effectiveRate ?? null,
  }
}

function getCreatedAtField(createdAt: Date | undefined) {
  return createdAt ? { createdAt } : {}
}

async function resolveInvestmentPosition(tx: any, positions: any[], goalId: string) {
  const existing = positions.find((position) => position.goalId === goalId)
  const position = existing ?? await tx.query.goalInvestmentPositions.findFirst({
    where: (positionTable: any, { eq }: any) => eq(positionTable.goalId, goalId),
  })
  if (!position) throw new Error(`Investment position not found for goal ${goalId}`)
  return position
}

async function updateInvestmentPositions(tx: any, preview: SavingPreviewResult, state: SavingContributionState) {
  const positions = state.source.investmentPositions ?? []
  const resolved = new Map<string, any>()
  for (const allocation of preview.allocations) {
    const position = await resolveInvestmentPosition(tx, positions, allocation.goalId)
    resolved.set(allocation.goalId, position)
    const currentValue = new BigNumber(position.currentValue).plus(allocation.amount.amount).toFixed(2)
    await tx.update(goalInvestmentPositions).set({ currentValue }).where(eq(goalInvestmentPositions.id, position.id))
  }
  return resolved
}

async function insertInvestmentAllocations(tx: any, preview: SavingPreviewResult, contribution: any, positions: Map<string, any>) {
  await tx.insert(investmentContributionAllocations).values(
    preview.allocations.map((allocation) => ({
      contributionId: contribution.id,
      goalId: allocation.goalId,
      amount: allocation.amount.amount,
      percentage: allocation.percentage,
      investmentPositionId: requireResolvedInvestmentPosition(positions, allocation.goalId).id,
    })),
  )
}

function requireResolvedInvestmentPosition(positions: Map<string, any>, goalId: string) {
  const position = positions.get(goalId)
  if (!position) throw new Error(`Investment position not found for goal ${goalId}`)
  return position
}

async function persistInvestmentContribution(
  tx: any,
  input: CreateContributionInput,
  state: SavingContributionState,
  preview: SavingPreviewResult,
) {
  const contribution = await insertInvestmentContribution(tx, input, preview.draft)
  const positions = await updateInvestmentPositions(tx, preview, state)
  await insertInvestmentAllocations(tx, preview, contribution, positions)
  return { contributionId: contribution.id }
}

async function insertSavingContribution(tx: any, input: CreateContributionInput, draft: any, userId: string) {
  const place = await resolveSavingPlace(tx, userId, draft)
  const [contribution] = await tx
    .insert(savingContributions)
    .values({
      userId,
      amount: draft.amount.amount,
      currency: draft.currency,
      placeId: place.id,
      ...getContributionMoneyFields(draft),
      ...getCreatedAtField(input.createdAt),
    })
    .returning({ id: savingContributions.id })
  return contribution
}

async function resolveSavingPlace(tx: any, userId: string, draft: any) {
  if (!draft.place) throw new Error('Elegí un lugar para tu ahorro.')
  return resolveSavingsPlaceWithExecutor(tx, userId, draft.place)
}

async function insertSavingAllocations(tx: any, preview: SavingPreviewResult, contribution: any) {
  const positions = await Promise.all(preview.allocations.map((allocation) =>
    tx.insert(goalSavingsPositions).values({
      goalId: allocation.goalId,
      amount: allocation.amount.amount,
      currency: allocation.amount.currency,
    }).returning({ id: goalSavingsPositions.id }),
  ))
  await tx.insert(savingContributionAllocations).values(preview.allocations.map((allocation, index) => ({
    contributionId: contribution.id,
    goalId: allocation.goalId,
    amount: allocation.amount.amount,
    percentage: allocation.percentage,
    savingPositionId: positions[index][0].id,
  })))
}

async function persistSavingContribution(tx: any, input: CreateContributionInput, preview: SavingPreviewResult) {
  const contribution = await insertSavingContribution(tx, input, preview.draft, input.userId)
  await insertSavingAllocations(tx, preview, contribution)
  return { contributionId: contribution.id }
}

async function createContributionInTransaction(tx: any, input: CreateContributionInput) {
  const state = await getSavingContributionStateWithExecutor(tx, input.userId, input.currentMonth)
  if (!state) throw new Error('Financial profile not found.')
  const kind = input.draft.kind ?? 'saving'
  const eligibleGoals = requireContributionGoals(state, input.draft)
  const preview = buildSavingPreview({ kind, draft: input.draft, eligibleGoals, workspaceSource: state.source, currentMonth: input.currentMonth })
  assertPreviewToken(state, input.currentMonth, input.draft, preview, input.previewToken)
  if (kind === 'investment') return persistInvestmentContribution(tx, input, state, preview)
  return persistSavingContribution(tx, input, preview)
}

export async function createSavingContributionInRepository(input: CreateContributionInput): Promise<{ contributionId: string }> {
  return withLockedFinancialProfile(input.userId, (tx) => createContributionInTransaction(tx, input))
}

type UpdateContributionInput = {
  userId: string
  contributionId: string
  draft: SavingDraftInput
}

async function loadSavingContribution(tx: any, userId: string, contributionId: string) {
  return tx.query.savingContributions.findFirst({
    where: (contribTable: any, { and, eq }: any) =>
      and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
  })
}

async function loadInvestmentContribution(tx: any, userId: string, contributionId: string) {
  return tx.query.investmentContributions.findFirst({
    where: (contribTable: any, { and, eq }: any) =>
      and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
  })
}

async function loadContributionAllocations(tx: any, contributionId: string, investment: boolean) {
  const table = investment ? tx.query.investmentContributionAllocations : tx.query.savingContributionAllocations
  return table.findMany({
    where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
  })
}

function requireContributionAllocations(allocations: any[]): void {
  if (!allocations.length) throw new Error('No allocations found for contribution.')
}

async function updateSavingAllocations(tx: any, allocations: any[], draft: any): Promise<void> {
  const allocatedMoneyList = calculateAllocationAmounts(
    draft.amount,
    allocations.map((allocation: any) => ({ id: allocation.id, percentage: allocation.percentage })),
  )
  for (const allocation of allocations) {
    const amount = allocatedMoneyList.find((item) => item.id === allocation.id)!.amount.amount
    await tx.update(goalSavingsPositions).set({ amount }).where(eq(goalSavingsPositions.id, allocation.savingPositionId))
    await tx.update(savingContributionAllocations).set({ amount }).where(eq(savingContributionAllocations.id, allocation.id))
  }
}

async function updateSavingRecord(tx: any, input: UpdateContributionInput, contribution: any): Promise<void> {
  const allocations = await loadContributionAllocations(tx, input.contributionId, false)
  requireContributionAllocations(allocations)
  await assertContributionGoalsAreMutable(tx, input.userId, allocations)
  const draft = parseSavingDraft(input.draft)
  assertContributionCurrency(draft.currency, contribution.currency)
  const place = await resolveSavingPlace(tx, input.userId, draft)
  const placeIds = [...new Set([contribution.placeId, place.id].filter(Boolean))].sort()
  await lockOwnedSavingsPlaces(tx, input.userId, placeIds)
  await updateSavingAllocations(tx, allocations, draft)
  await tx.update(savingContributions).set({
    amount: draft.amount.amount,
    placeId: place.id,
    ...getContributionMoneyFields(draft),
  }).where(eq(savingContributions.id, input.contributionId))
}

function assertContributionCurrency(actual: string, expected: string): void {
  if (actual !== expected) throw new Error('Cannot change contribution currency on update.')
}

async function updateInvestmentAllocations(tx: any, allocations: any[], draft: any): Promise<void> {
  const amounts = calculateAllocationAmounts(
    draft.amount,
    allocations.map((allocation: any) => ({ id: allocation.id, percentage: allocation.percentage })),
  )
  const positions = await loadInvestmentPositions(tx, allocations)
  for (const allocation of allocations) {
    const amount = amounts.find((item) => item.id === allocation.id)!.amount.amount
    const delta = new BigNumber(amount).minus(new BigNumber(allocation.amount))
    const position = positions.get(allocation.id)!
    const newValue = new BigNumber(position.currentValue).plus(delta).toFixed(2)
    const updated = await tx.update(goalInvestmentPositions).set({ currentValue: newValue }).where(eq(goalInvestmentPositions.id, allocation.investmentPositionId)).returning({ id: goalInvestmentPositions.id })
    if (!updated.length) throw new Error(`Investment position update affected no rows for goal ${allocation.goalId}`)
    await tx.update(investmentContributionAllocations).set({ amount }).where(eq(investmentContributionAllocations.id, allocation.id))
  }
}

async function loadInvestmentPositions(tx: any, allocations: any[]) {
  const positions = new Map<string, any>()
  for (const allocation of allocations) {
    const position = await tx.query.goalInvestmentPositions.findFirst({
      where: (positionTable: any, { eq }: any) => eq(positionTable.id, allocation.investmentPositionId),
    })
    if (!position) throw new Error(`Investment position not found for goal ${allocation.goalId}`)
    positions.set(allocation.id, position)
  }
  return positions
}

async function updateInvestmentRecord(tx: any, input: UpdateContributionInput, contribution: any): Promise<void> {
  const allocations = await loadContributionAllocations(tx, input.contributionId, true)
  requireContributionAllocations(allocations)
  await assertContributionGoalsAreMutable(tx, input.userId, allocations)
  const draft = parseSavingDraft(input.draft)
  assertContributionCurrency(draft.currency, contribution.currency)
  await updateInvestmentAllocations(tx, allocations, draft)
  await tx.update(investmentContributions).set({
    amount: draft.amount.amount,
    ...getContributionMoneyFields(draft),
  }).where(eq(investmentContributions.id, input.contributionId))
}

async function updateContributionInTransaction(tx: any, input: UpdateContributionInput): Promise<void> {
  const savingContribution = await loadSavingContribution(tx, input.userId, input.contributionId)
  if (savingContribution) return updateSavingRecord(tx, input, savingContribution)
  const investmentContribution = await loadInvestmentContribution(tx, input.userId, input.contributionId)
  if (investmentContribution) return updateInvestmentRecord(tx, input, investmentContribution)
  throw new Error('Contribution not found or not owned by user.')
}

export async function updateSavingContributionInRepository(input: UpdateContributionInput): Promise<void> {
  return withLockedFinancialProfile(input.userId, (tx) => updateContributionInTransaction(tx, input))
}

async function deleteSavingContribution(
  tx: any,
  userId: string,
  contributionId: string,
  contribution: any,
): Promise<void> {
  const placeId = requireSavingPlaceId(contribution.placeId)
  await lockOwnedSavingsPlaces(tx, userId, [placeId].sort())
  const allocations = await tx.query.savingContributionAllocations.findMany({
    where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
  })
  await assertContributionGoalsAreMutable(tx, userId, allocations)
  await deleteSavingPositions(tx, allocations)
  await tx.delete(savingContributions).where(eq(savingContributions.id, contributionId))
}

function requireSavingPlaceId(placeId: string | null): string {
  if (!placeId) throw new Error('Lugar de ahorro no encontrado.')
  return placeId
}

async function deleteSavingPositions(tx: any, allocations: any[]): Promise<void> {
  const positionIds = allocations.map((allocation: any) => allocation.savingPositionId).filter(Boolean)
  if (!positionIds.length) return
  await tx.delete(goalSavingsPositions).where(inArray(goalSavingsPositions.id, positionIds))
}

async function deleteInvestmentContribution(
  tx: any,
  userId: string,
  contributionId: string,
): Promise<void> {
  const allocations = await tx.query.investmentContributionAllocations.findMany({
    where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
  })
  await assertContributionGoalsAreMutable(tx, userId, allocations)

  const positions = await loadInvestmentPositions(tx, allocations)

  for (const allocation of allocations) {
    const position = positions.get(allocation.id)!
    const newPosVal = new BigNumber(position.currentValue)
      .minus(new BigNumber(allocation.amount))
      .toFixed(2)
    const updated = await tx
      .update(goalInvestmentPositions)
      .set({ currentValue: newPosVal })
      .where(eq(goalInvestmentPositions.id, allocation.investmentPositionId))
      .returning({ id: goalInvestmentPositions.id })
    if (!updated.length) throw new Error(`Investment position update affected no rows for goal ${allocation.goalId}`)
  }

  await tx.delete(investmentContributions).where(eq(investmentContributions.id, contributionId))
}

export async function deleteSavingContributionInRepository(input: {
  userId: string
  contributionId: string
}): Promise<void> {
  const { userId, contributionId } = input

  return withLockedFinancialProfile(userId, async (tx) => {
    const savingContribution = await loadSavingContribution(tx, userId, contributionId)

    if (savingContribution) {
      await deleteSavingContribution(tx, userId, contributionId, savingContribution)
      return
    }

    const investmentContribution = await loadInvestmentContribution(tx, userId, contributionId)

    if (investmentContribution) {
      await deleteInvestmentContribution(tx, userId, contributionId)
      return
    }

    throw new Error('Contribution not found or not owned by user.')
  })
}
