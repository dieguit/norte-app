import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import BigNumber from 'bignumber.js'
import { db } from '../../db/client'
import {
  financialProfiles,
  goalInvestmentPositions,
  goalSavingsPositions,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
  savingsPlaces,
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
  parseSavingDraft,
  selectEligibleGoals,
  serializeContributionState,
  type EligibleGoal,
  type SavingContributionPreviewResult,
  type SavingDraftInput,
} from './saving-contribution'

export interface SavingContributionState {
  source: GoalsWorkspaceSource
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
  eligibleInvestmentGoals: EligibleGoal[]
  eligibleInvestmentGoalsUsd: EligibleGoal[]
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

export function createContributionPreviewToken(
  state: SavingContributionState,
  currentMonth: string,
  draft: SavingDraftInput,
): string {
  const kind = draft.kind ?? 'saving'
  const eligible =
    kind === 'investment'
      ? draft.currency === 'USD'
        ? state.eligibleInvestmentGoalsUsd
        : state.eligibleInvestmentGoals
      : draft.currency === 'USD'
        ? state.eligibleGoalsUsd
        : state.eligibleGoals

  const serialized = serializeContributionState({
    kind,
    draft,
    eligibleGoals: eligible,
    currentMonth,
  })
  return createHash('sha256').update(serialized).digest('hex')
}

export const createSavingContributionPreviewToken = createContributionPreviewToken

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

  const mapToEligibleGoal = (g: any): EligibleGoal => ({
    id: g.id,
    name: g.name,
    percentage: allocMap.get(g.id) ?? '0.00',
  })

  const eligibleGoals = selectEligibleGoals(goals, 'saving', 'ARS').map(mapToEligibleGoal)
  const eligibleGoalsUsd = selectEligibleGoals(goals, 'saving', 'USD').map(mapToEligibleGoal)
  const eligibleInvestmentGoals = selectEligibleGoals(goals, 'investment', 'ARS').map(mapToEligibleGoal)
  const eligibleInvestmentGoalsUsd = selectEligibleGoals(goals, 'investment', 'USD').map(mapToEligibleGoal)
  const userContributions = await executor.query.savingContributions.findMany({
    where: (contributionsTable: any, { eq }: any) => eq(contributionsTable.userId, userId),
  })
  const userInvestmentContributions = await executor.query.investmentContributions.findMany({
    where: (contributionsTable: any, { eq }: any) => eq(contributionsTable.userId, userId),
  })

  const goalAllocations = activeGoals.map((g: any) => ({
    id: g.id,
    currency: g.currency,
    strategy: g.strategy,
    percentage: allocMap.get(g.id) ?? '0.00',
  }))

  const savingTargets = deriveMonthlyContributionTargets({
    monthlyCommitmentArs: profile.plannedMonthlyContribution,
    goals: goalAllocations,
    existingContributions: userContributions,
    currentMonth,
    kind: 'saving',
  })

  const investmentTargets = deriveMonthlyContributionTargets({
    monthlyCommitmentArs: profile.plannedMonthlyContribution,
    goals: goalAllocations,
    existingContributions: userInvestmentContributions,
    currentMonth,
    kind: 'investment',
  })

  return {
    source,
    eligibleGoals,
    eligibleGoalsUsd,
    eligibleInvestmentGoals,
    eligibleInvestmentGoalsUsd,
    monthlyTargetArs: savingTargets.monthlyTargetArs,
    monthlyTargetUsd: savingTargets.monthlyTargetUsd,
    monthlyInvestmentTargetArs: investmentTargets.monthlyTargetArs,
    monthlyInvestmentTargetUsd: investmentTargets.monthlyTargetUsd,
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
  createdAt?: Date
}): Promise<{ contributionId: string }> {
  const { userId, currentMonth, draft, previewToken, createdAt } = input

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

    const kind = draft.kind ?? 'saving'
    let eligibleGoals: EligibleGoal[]

    if (kind === 'investment') {
      eligibleGoals =
        draft.currency === 'USD'
          ? state.eligibleInvestmentGoalsUsd
          : state.eligibleInvestmentGoals
      if (!eligibleGoals || eligibleGoals.length === 0) {
        throw new Error(
          draft.currency === 'USD'
            ? 'No hay objetivos activos para distribuir la inversión en USD.'
            : 'No hay objetivos activos para distribuir la inversión en ARS.',
        )
      }
    } else {
      eligibleGoals =
        draft.currency === 'USD' ? state.eligibleGoalsUsd : state.eligibleGoals
      if (!eligibleGoals || eligibleGoals.length === 0) {
        throw new Error(
          draft.currency === 'USD'
            ? 'No hay objetivos activos para distribuir el ahorro en USD.'
            : 'No hay objetivos activos para distribuir el ahorro en ARS.',
        )
      }
    }

    const preview = buildSavingPreview({
      kind,
      draft,
      eligibleGoals,
      workspaceSource: state.source,
      currentMonth,
    })

    const currentToken = createContributionPreviewToken(state, currentMonth, draft)
    if (currentToken !== previewToken) {
      throw new StaleSavingContributionPreviewError({
        preview,
        previewToken: currentToken,
      })
    }

    const normalizedDraft = preview.draft

    if (kind === 'investment') {
      const [contribution] = await tx
        .insert(investmentContributions)
        .values({
          userId,
          amount: normalizedDraft.amount.amount,
          currency: normalizedDraft.currency,
          arsSpent: normalizedDraft.arsSpent ? normalizedDraft.arsSpent.amount : null,
          effectiveRate: normalizedDraft.effectiveRate ?? null,
          ...(createdAt ? { createdAt } : {}),
        })
        .returning({ id: investmentContributions.id })

      const existingPositions = state.source.investmentPositions ?? []
      const resolvedPositions = new Map<string, any>()

      for (const allocation of preview.allocations) {
        let pos: any = existingPositions.find((p) => p.goalId === allocation.goalId)
        if (!pos) {
          pos = await tx.query.goalInvestmentPositions.findFirst({
            where: (pTable: any, { eq }: any) => eq(pTable.goalId, allocation.goalId),
          })
        }
        if (!pos) {
          throw new Error(`Investment position not found for goal ${allocation.goalId}`)
        }

        resolvedPositions.set(allocation.goalId, pos)

        const newCurrentValue = new BigNumber(pos.currentValue)
          .plus(new BigNumber(allocation.amount.amount))
          .toFixed(2)

        await tx
          .update(goalInvestmentPositions)
          .set({ currentValue: newCurrentValue })
          .where(eq(goalInvestmentPositions.id, pos.id))
      }

      await tx.insert(investmentContributionAllocations).values(
        preview.allocations.map((allocation) => {
          const pos = resolvedPositions.get(allocation.goalId)
          if (!pos) {
            throw new Error(`Investment position not found for goal ${allocation.goalId}`)
          }
          return {
            contributionId: contribution.id,
            goalId: allocation.goalId,
            amount: allocation.amount.amount,
            percentage: allocation.percentage,
            investmentPositionId: pos.id,
          }
        }),
      )

      return { contributionId: contribution.id }
    }

    if (!normalizedDraft.place) {
      throw new Error('Elegí un lugar para tu ahorro.')
    }

    const resolvedPlace = await resolveSavingsPlaceWithExecutor(tx, userId, normalizedDraft.place)

    const [contribution] = await tx
      .insert(savingContributions)
      .values({
        userId,
        amount: normalizedDraft.amount.amount,
        currency: normalizedDraft.currency,
        placeId: resolvedPlace.id,
        arsSpent: normalizedDraft.arsSpent ? normalizedDraft.arsSpent.amount : null,
        effectiveRate: normalizedDraft.effectiveRate ?? null,
        ...(createdAt ? { createdAt } : {}),
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
    const savingContribution = await tx.query.savingContributions.findFirst({
      where: (contribTable: any, { and, eq }: any) =>
        and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
    })

    if (savingContribution) {
      const allocations = await tx.query.savingContributionAllocations.findMany({
        where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
      })

      if (!allocations.length) {
        throw new Error('No allocations found for contribution.')
      }

      const parsedDraft = parseSavingDraft(draft)
      if (parsedDraft.currency !== savingContribution.currency) {
        throw new Error('Cannot change contribution currency on update.')
      }

      if (!parsedDraft.place) {
        throw new Error('Elegí un lugar para tu ahorro.')
      }

      const resolvedPlace = await resolveSavingsPlaceWithExecutor(tx, userId, parsedDraft.place)
      const placeIds = [...new Set([savingContribution.placeId, resolvedPlace.id].filter(Boolean))].sort()
      for (const placeId of placeIds) {
        const [lockedPlace] = await tx
          .select()
          .from(savingsPlaces)
          .where(and(eq(savingsPlaces.id, placeId), eq(savingsPlaces.userId, userId)))
          .for('update')
        if (!lockedPlace) {
          throw new Error('Lugar de ahorro no encontrado.')
        }
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
          placeId: resolvedPlace.id,
          arsSpent: parsedDraft.arsSpent ? parsedDraft.arsSpent.amount : null,
          effectiveRate: parsedDraft.effectiveRate ?? null,
        })
        .where(eq(savingContributions.id, contributionId))

      return
    }

    const investmentContribution = await tx.query.investmentContributions.findFirst({
      where: (contribTable: any, { and, eq }: any) =>
        and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
    })

    if (investmentContribution) {
      const allocations = await tx.query.investmentContributionAllocations.findMany({
        where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
      })

      if (!allocations.length) {
        throw new Error('No allocations found for contribution.')
      }

      const parsedDraft = parseSavingDraft(draft)
      if (parsedDraft.currency !== investmentContribution.currency) {
        throw new Error('Cannot change contribution currency on update.')
      }

      const allocatedMoneyList = calculateAllocationAmounts(
        parsedDraft.amount,
        allocations.map((a: any) => ({ id: a.id, percentage: a.percentage })),
      )

      for (const alloc of allocations) {
        const newAllocated = allocatedMoneyList.find((item) => item.id === alloc.id)!
        const delta = new BigNumber(newAllocated.amount.amount).minus(new BigNumber(alloc.amount))

        const position = await tx.query.goalInvestmentPositions.findFirst({
          where: (posTable: any, { eq }: any) => eq(posTable.id, alloc.investmentPositionId),
        })
        const currentPosVal = position ? position.currentValue : '0.00'
        const newPosVal = new BigNumber(currentPosVal).plus(delta).toFixed(2)

        await tx
          .update(goalInvestmentPositions)
          .set({ currentValue: newPosVal })
          .where(eq(goalInvestmentPositions.id, alloc.investmentPositionId))

        await tx
          .update(investmentContributionAllocations)
          .set({
            amount: newAllocated.amount.amount,
          })
          .where(eq(investmentContributionAllocations.id, alloc.id))
      }

      await tx
        .update(investmentContributions)
        .set({
          amount: parsedDraft.amount.amount,
          arsSpent: parsedDraft.arsSpent ? parsedDraft.arsSpent.amount : null,
          effectiveRate: parsedDraft.effectiveRate ?? null,
        })
        .where(eq(investmentContributions.id, contributionId))

      return
    }

    throw new Error('Contribution not found or not owned by user.')
  })
}

export async function deleteSavingContributionInRepository(input: {
  userId: string
  contributionId: string
}): Promise<void> {
  const { userId, contributionId } = input

  return db.transaction(async (tx) => {
    const savingContribution = await tx.query.savingContributions.findFirst({
      where: (contribTable: any, { and, eq }: any) =>
        and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
    })

    if (savingContribution) {
      const allocations = await tx.query.savingContributionAllocations.findMany({
        where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
      })

      const positionIds = allocations.map((a: any) => a.savingPositionId).filter(Boolean)

      if (positionIds.length > 0) {
        await tx.delete(goalSavingsPositions).where(inArray(goalSavingsPositions.id, positionIds))
      }

      await tx.delete(savingContributions).where(eq(savingContributions.id, contributionId))
      return
    }

    const investmentContribution = await tx.query.investmentContributions.findFirst({
      where: (contribTable: any, { and, eq }: any) =>
        and(eq(contribTable.id, contributionId), eq(contribTable.userId, userId)),
    })

    if (investmentContribution) {
      const allocations = await tx.query.investmentContributionAllocations.findMany({
        where: (allocTable: any, { eq }: any) => eq(allocTable.contributionId, contributionId),
      })

      for (const alloc of allocations) {
        const position = await tx.query.goalInvestmentPositions.findFirst({
          where: (posTable: any, { eq }: any) => eq(posTable.id, alloc.investmentPositionId),
        })
        if (position) {
          const newPosVal = new BigNumber(position.currentValue)
            .minus(new BigNumber(alloc.amount))
            .toFixed(2)
          await tx
            .update(goalInvestmentPositions)
            .set({ currentValue: newPosVal })
            .where(eq(goalInvestmentPositions.id, alloc.investmentPositionId))
        }
      }

      await tx.delete(investmentContributions).where(eq(investmentContributions.id, contributionId))
      return
    }

    throw new Error('Contribution not found or not owned by user.')
  })
}
