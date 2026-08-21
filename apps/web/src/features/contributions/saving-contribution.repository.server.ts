import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db/client'
import {
  financialProfiles,
  goalSavingsPositions,
  savingContributionAllocations,
  savingContributions,
} from '../../db/schema'
import { calculateAllocationAmounts } from '../../lib/money'
import type { GoalsWorkspaceSource } from '../goals/goals'
import {
  mapRowsToGoalsWorkspaceSource,
  selectWinningSnapshots,
} from '../goals/goals.repository.server'
import type { Money } from '../../lib/money'
import {
  buildSavingPreview,
  deriveMonthlySavingTargets,
  parseSavingDraft,
  serializeSavingContributionState,
  type EligibleGoal,
  type SavingContributionPreviewResult,
  type SavingDraftInput,
} from './saving-contribution'

export interface SavingContributionState {
  source: GoalsWorkspaceSource
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
  monthlyTargetArs?: Money | null
  monthlyTargetUsd?: Money | null
}

export class StaleSavingContributionPreviewError extends Error {
  readonly refreshedPreview: SavingContributionPreviewResult
  constructor(refreshedPreview: SavingContributionPreviewResult) {
    super('Stale saving contribution preview')
    this.name = 'StaleSavingContributionPreviewError'
    this.refreshedPreview = refreshedPreview
  }
}

export function createSavingContributionPreviewToken(
  state: SavingContributionState,
  currentMonth: string,
  draft: SavingDraftInput,
): string {
  const eligible = draft.currency === 'USD' ? state.eligibleGoalsUsd : state.eligibleGoals
  const serialized = serializeSavingContributionState({
    draft,
    eligibleGoals: eligible,
    currentMonth,
  })
  return createHash('sha256').update(serialized).digest('hex')
}

export async function getSavingContributionStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<SavingContributionState | null> {
  const profile = await executor.query.financialProfiles.findFirst({
    where: (profiles: any, { eq }: any) => eq(profiles.userId, userId),
  })

  if (!profile) {
    return null
  }

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

  const activeGoals = goals.filter((g: any) => g.status === 'active')
  const allocMap = new Map<string, string>()
  for (const alloc of allocations) {
    allocMap.set(alloc.goalId, alloc.percentage)
  }

  const source = mapRowsToGoalsWorkspaceSource({
    profile,
    goals: activeGoals,
    savingsPositions,
    investmentPositions,
    snapshots: winningSnapshots,
    allocations,
  })

  const eligibleGoals: EligibleGoal[] = activeGoals
    .filter((g: any) => g.currency === 'ARS')
    .map((g: any) => ({
      id: g.id,
      name: g.name,
      percentage: allocMap.get(g.id) ?? '0.00',
    }))

  const eligibleGoalsUsd: EligibleGoal[] = activeGoals
    .filter((g: any) => g.currency === 'USD')
    .map((g: any) => ({
      id: g.id,
      name: g.name,
      percentage: allocMap.get(g.id) ?? '0.00',
    }))

  const userContributions = await executor.query.savingContributions.findMany({
    where: (contributionsTable: any, { eq }: any) => eq(contributionsTable.userId, userId),
  })

  const targets = deriveMonthlySavingTargets({
    monthlyCommitmentArs: profile.plannedMonthlyContribution,
    goals: activeGoals.map((g: any) => ({
      id: g.id,
      currency: g.currency,
      strategy: g.strategy,
      percentage: allocMap.get(g.id) ?? '0.00',
    })),
    existingContributions: userContributions,
    currentMonth,
  })

  return {
    source,
    eligibleGoals,
    eligibleGoalsUsd,
    monthlyTargetArs: targets.monthlyTargetArs,
    monthlyTargetUsd: targets.monthlyTargetUsd,
  }
}

export async function getSavingContributionState(
  userId: string,
  currentMonth: string,
): Promise<SavingContributionState | null> {
  return getSavingContributionStateWithExecutor(db, userId, currentMonth)
}

export async function createSavingContributionInRepository(input: {
  userId: string
  currentMonth: string
  draft: SavingDraftInput
  previewToken: string
}): Promise<{ contributionId: string }> {
  const { userId, currentMonth, draft, previewToken } = input

  return db.transaction(async (tx) => {
    const lockedProfile = await tx
      .select({ userId: financialProfiles.userId })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))
      .for('update')

    if (!lockedProfile.length) {
      throw new Error('Financial profile not found.')
    }

    const state = await getSavingContributionStateWithExecutor(tx, userId, currentMonth)
    if (!state) {
      throw new Error('Financial profile not found.')
    }

    const eligibleGoals = draft.currency === 'USD' ? state.eligibleGoalsUsd : state.eligibleGoals
    if (!eligibleGoals || eligibleGoals.length === 0) {
      throw new Error(
        draft.currency === 'USD'
          ? 'No hay objetivos activos para distribuir el ahorro en USD.'
          : 'No hay objetivos activos para distribuir el ahorro en ARS.',
      )
    }

    const preview = buildSavingPreview({
      draft,
      eligibleGoals,
      workspaceSource: state.source,
      currentMonth,
    })

    const currentToken = createSavingContributionPreviewToken(state, currentMonth, draft)
    if (currentToken !== previewToken) {
      throw new StaleSavingContributionPreviewError({
        preview,
        previewToken: currentToken,
      })
    }

    const normalizedDraft = preview.draft
    const [contribution] = await tx
      .insert(savingContributions)
      .values({
        userId,
        amount: normalizedDraft.amount.amount,
        currency: normalizedDraft.currency,
        location: normalizedDraft.location || null,
        arsSpent: normalizedDraft.arsSpent ? normalizedDraft.arsSpent.amount : null,
        effectiveRate: normalizedDraft.effectiveRate ?? null,
      })
      .returning({ id: savingContributions.id })

    const positions = await Promise.all(
      preview.allocations.map((allocation) =>
        tx
          .insert(goalSavingsPositions)
          .values({
            goalId: allocation.goalId,
            amount: allocation.amount.amount,
            currency: allocation.amount.currency,
            location: normalizedDraft.location || null,
          })
          .returning({ id: goalSavingsPositions.id }),
      ),
    )

    await tx.insert(savingContributionAllocations).values(
      preview.allocations.map((allocation, index) => ({
        contributionId: contribution.id,
        goalId: allocation.goalId,
        amount: allocation.amount.amount,
        percentage: allocation.percentage,
        savingPositionId: positions[index][0].id,
      })),
    )

    return { contributionId: contribution.id }
  })
}

export async function updateSavingContributionInRepository(input: {
  userId: string
  contributionId: string
  draft: SavingDraftInput
}): Promise<void> {
  const { userId, contributionId, draft } = input

  return db.transaction(async (tx) => {
    const contribution = await tx.query.savingContributions.findFirst({
      where: (contribTable: any, { and, eq }: any) =>
        and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
    })

    if (!contribution) {
      throw new Error('Contribution not found or not owned by user.')
    }

    const allocations = await tx.query.savingContributionAllocations.findMany({
      where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
    })

    if (!allocations.length) {
      throw new Error('No allocations found for contribution.')
    }

    const parsedDraft = parseSavingDraft(draft)
    if (parsedDraft.currency !== contribution.currency) {
      throw new Error('Cannot change contribution currency on update.')
    }

    const allocatedMoneyList = calculateAllocationAmounts(
      parsedDraft.amount,
      allocations.map((a: any) => ({ id: a.id, percentage: a.percentage })),
    )

    for (const alloc of allocations) {
      const newAllocated = allocatedMoneyList.find((item) => item.id === alloc.id)!
      await tx
        .update(goalSavingsPositions)
        .set({
          amount: newAllocated.amount.amount,
          location: parsedDraft.location || null,
        })
        .where(eq(goalSavingsPositions.id, alloc.savingPositionId))

      await tx
        .update(savingContributionAllocations)
        .set({
          amount: newAllocated.amount.amount,
        })
        .where(eq(savingContributionAllocations.id, alloc.id))
    }

    await tx
      .update(savingContributions)
      .set({
        amount: parsedDraft.amount.amount,
        location: parsedDraft.location || null,
        arsSpent: parsedDraft.arsSpent ? parsedDraft.arsSpent.amount : null,
        effectiveRate: parsedDraft.effectiveRate ?? null,
      })
      .where(eq(savingContributions.id, contributionId))
  })
}

export async function deleteSavingContributionInRepository(input: {
  userId: string
  contributionId: string
}): Promise<void> {
  const { userId, contributionId } = input

  return db.transaction(async (tx) => {
    const contribution = await tx.query.savingContributions.findFirst({
      where: (contribTable: any, { and, eq }: any) =>
        and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
    })

    if (!contribution) {
      throw new Error('Contribution not found or not owned by user.')
    }

    const allocations = await tx.query.savingContributionAllocations.findMany({
      where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
    })

    const positionIds = allocations.map((a: any) => a.savingPositionId).filter(Boolean)

    if (positionIds.length > 0) {
      await tx.delete(goalSavingsPositions).where(inArray(goalSavingsPositions.id, positionIds))
    }

    await tx.delete(savingContributions).where(eq(savingContributions.id, contributionId))
  })
}
