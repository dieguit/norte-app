import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  calculateAllocationAmounts,
  createMoney,
  parseMoneyInput,
} from '../../lib/money'
import {
  PLANNING_ARS_PER_USD,
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
} from '../financial/financial'
import {
  type GoalPriority,
  type GoalProjection,
  type GoalStrategy,
  type GoalsWorkspaceSource,
  type InvestmentAvailability,
  buildGoalsWorkspace,
} from './goals'
import type { GoalCreationDraft } from './goal-creation.schema'

export const PENDING_GOAL_ID = 'pending-goal'

export interface GoalCreationContext {
  currentMonth: string
  expensesKnowledge: 'known' | 'unknown'
  hasEmergencyFund: boolean
  plannedMonthlyContribution?: Money
  currentAllocation?: {
    effectiveMonth: string
    entries: Array<{
      goalId: string
      percentage: string
    }>
  }
}

export interface GoalCreationState {
  source: GoalsWorkspaceSource
  pendingSnapshots: GoalsWorkspaceSource['snapshots']
  pendingAllocations: GoalsWorkspaceSource['allocations']
}

export interface GoalCreationAllocationEntry {
  goalId: string
  goalName: string
  percentage: string
  allocatedBaseAmount?: Money
  allocatedDestinationAmount?: Money
  pending: boolean
}

export interface GoalCreationAllocation {
  monthlyContribution?: Money
  effectiveMonth: string
  entries: GoalCreationAllocationEntry[]
  totalPercentage: string
}

export type GoalCreationBefore =
  | { status: 'not_created' }
  | { status: 'existing'; projection: GoalProjection; allocatedMonthlyAmounts: Money[] }

export interface GoalCreationImpact {
  goalId: string
  goalName: string
  before: GoalCreationBefore
  after: GoalProjection
}

export interface GoalCreationProposal {
  normalizedGoal: {
    name: string
    type: 'emergency_fund' | 'purchase' | 'retirement' | 'other'
    targetAmount?: Money
    currency: CurrencyCode
    priority: GoalPriority
    strategy: GoalStrategy
    desiredDate?: string
    emergencyFundMonths?: number
  }
  investment?: {
    annualReturnRate: string
    availability: InvestmentAvailability
    availableFrom?: string
  }
  allocation: GoalCreationAllocation
  impacts: GoalCreationImpact[]
  proposedSource: GoalsWorkspaceSource
}

export interface GoalCreationPreviewResult {
  proposal: GoalCreationProposal
  previewToken: string
}

function getNextCalendarMonthStr(currentMonth: string): string {
  const [year, month] = currentMonth.slice(0, 7).split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + 1
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`
}

export function calculatePercentageSum(entries: Array<{ percentage: string }>): BigNumber {
  return entries.reduce((sum, e) => {
    try {
      const normalized = (e.percentage || '0').trim().replace(',', '.')
      const bn = new BigNumber(normalized)
      return bn.isFinite() && !bn.isNaN() ? sum.plus(bn) : sum.plus(NaN)
    } catch {
      return sum.plus(NaN)
    }
  }, new BigNumber(0))
}

export function rebalanceAllocationEntries<T extends { goalId: string; percentage: string }>(
  entries: T[],
  selectedGoalId: string,
  nextPercentage: string,
): T[] {
  const normalizedInput = (nextPercentage ?? '').trim().replace(',', '.')
  let selected: BigNumber | null = null

  if (normalizedInput !== '') {
    try {
      const bn = new BigNumber(normalizedInput)
      if (
        bn.isFinite() &&
        !bn.isNaN() &&
        bn.isGreaterThanOrEqualTo(0) &&
        bn.isLessThanOrEqualTo(100)
      ) {
        selected = bn
      }
    } catch {
      selected = null
    }
  }

  if (selected === null) {
    return entries.map((entry) =>
      entry.goalId === selectedGoalId ? { ...entry, percentage: nextPercentage } : entry,
    )
  }

  const others = entries.filter((entry) => entry.goalId !== selectedGoalId)
  if (others.length === 0) {
    return entries.map((entry) =>
      entry.goalId === selectedGoalId ? { ...entry, percentage: '100.00' } : entry,
    )
  }

  const remaining = new BigNumber(100).minus(selected)
  const percentageOf = (entry: { percentage: string }) => {
    try {
      const bn = new BigNumber((entry.percentage || '0').replace(',', '.'))
      return bn.isFinite() && !bn.isNaN() && bn.isGreaterThanOrEqualTo(0) ? bn : new BigNumber(0)
    } catch {
      return new BigNumber(0)
    }
  }
  const previousTotal = others.reduce((sum, e) => sum.plus(percentageOf(e)), new BigNumber(0))
  const shares = previousTotal.isZero()
    ? others.map(() => new BigNumber(1).dividedBy(others.length))
    : others.map((entry) => percentageOf(entry).dividedBy(previousTotal))

  const allocatedOthersMap = new Map<string, string>()
  let accumulatedBn = new BigNumber(0)

  for (let i = 0; i < others.length; i++) {
    const other = others[i]
    if (i === others.length - 1) {
      const lastAmountBn = remaining.minus(accumulatedBn)
      allocatedOthersMap.set(other.goalId, lastAmountBn.toFixed(2))
    } else {
      const amountBn = remaining.times(shares[i])
      const roundedStr = amountBn.toFixed(2)
      accumulatedBn = accumulatedBn.plus(new BigNumber(roundedStr))
      allocatedOthersMap.set(other.goalId, roundedStr)
    }
  }

  return entries.map((entry) => {
    if (entry.goalId === selectedGoalId) {
      return { ...entry, percentage: selected!.toFixed(2) }
    }
    return { ...entry, percentage: allocatedOthersMap.get(entry.goalId)! }
  })
}

export function recalculateAllocationAmounts(input: {
  monthlyContribution?: Money
  entries: Array<{
    goalId: string
    percentage: string
    currency: CurrencyCode
  }>
}): Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }> {
  const { monthlyContribution, entries } = input
  const map = new Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }>()

  if (!monthlyContribution) {
    for (const entry of entries) {
      map.set(entry.goalId, {})
    }
    return map
  }

  const totalBn = calculatePercentageSum(entries)

  if (totalBn.isEqualTo(100)) {
    const allocatedBaseList = calculateAllocationAmounts(
      monthlyContribution,
      entries.map((e) => ({
        id: e.goalId,
        percentage: (e.percentage || '0').replace(',', '.'),
      })),
    )

    for (const entry of entries) {
      const allocated = allocatedBaseList.find((a) => a.id === entry.goalId)
      if (allocated) {
        const allocatedBaseAmount = allocated.amount
        const allocatedDestinationAmount = convertCommitmentToDestination(
          allocatedBaseAmount,
          entry.currency,
        )
        map.set(entry.goalId, {
          allocatedBaseAmount,
          allocatedDestinationAmount,
        })
      } else {
        map.set(entry.goalId, {})
      }
    }
  } else {
    for (const entry of entries) {
      let pctBn: BigNumber | null = null
      try {
        const normalized = (entry.percentage || '0').trim().replace(',', '.')
        const bn = new BigNumber(normalized)
        if (bn.isFinite() && !bn.isNaN() && bn.isGreaterThanOrEqualTo(0)) {
          pctBn = bn
        }
      } catch {
        pctBn = null
      }

      if (pctBn) {
        const amountBn = new BigNumber(monthlyContribution.amount).times(pctBn).dividedBy(100)
        const allocatedBaseAmount = createMoney(amountBn.toFixed(2), monthlyContribution.currency)
        const allocatedDestinationAmount = convertCommitmentToDestination(
          allocatedBaseAmount,
          entry.currency,
        )
        map.set(entry.goalId, {
          allocatedBaseAmount,
          allocatedDestinationAmount,
        })
      } else {
        map.set(entry.goalId, {})
      }
    }
  }

  return map
}

export function buildGoalCreationProposal(input: {
  draft: GoalCreationDraft
  state: GoalCreationState
  currentMonth: string
  subjectGoalId?: string
}): GoalCreationProposal {
  const { draft, state, currentMonth } = input
  const isEditing = input.subjectGoalId !== undefined
  const subjectGoalId = input.subjectGoalId ?? PENDING_GOAL_ID
  const subjectGoal = isEditing
    ? state.source.goals.find((goal) => goal.id === subjectGoalId && goal.status === 'active')
    : undefined

  if (isEditing && !subjectGoal) {
    throw new Error('Goal not found or is not active.')
  }

  // 1. Normalize goal and investment details
  const name = draft.name.trim()
  const type = draft.type
  const currency = draft.currency
  const priority = draft.priority
  const strategy = draft.strategy

  let desiredDate: string | undefined
  if (draft.desiredMonth && draft.desiredMonth.trim() !== '') {
    desiredDate = `${draft.desiredMonth.slice(0, 7)}-01`
  }

  let emergencyFundMonths: number | undefined
  let targetAmount: Money | undefined

  if (type === 'emergency_fund') {
    emergencyFundMonths = 6
    if (
      state.source.profile?.expensesKnowledge === 'known' &&
      state.source.profile.approximateMonthlyExpenses
    ) {
      targetAmount = deriveEmergencyFundTarget(
        createMoney(state.source.profile.approximateMonthlyExpenses, 'ARS'),
        6,
      )
    }
  } else if (draft.targetAmount) {
    targetAmount = parseMoneyInput(draft.targetAmount, currency) ?? undefined
  }

  const normalizedGoal: GoalCreationProposal['normalizedGoal'] = {
    name,
    type,
    targetAmount,
    currency,
    priority,
    strategy,
    desiredDate,
    emergencyFundMonths,
  }

  const investment: GoalCreationProposal['investment'] =
    strategy === 'invest'
      ? {
          annualReturnRate: (draft.annualReturnRate || '8.0').replace(',', '.'),
          availability: draft.availability,
          availableFrom:
            draft.availability === 'available_from' && draft.availableFromMonth
              ? `${draft.availableFromMonth.slice(0, 7)}-01`
              : undefined,
        }
      : undefined

  // 2. Next effective month
  const nextMonthStr = getNextCalendarMonthStr(currentMonth)
  const nextMonthEffective = `${nextMonthStr}-01`

  // 3. Goal workspace item and investment position for simulation
  let proposedGoals: GoalsWorkspaceSource['goals']
  if (isEditing && subjectGoal) {
    const updatedGoal: GoalsWorkspaceSource['goals'][number] = {
      id: subjectGoal.id,
      userId: subjectGoal.userId ?? state.source.profile?.userId,
      name: normalizedGoal.name,
      type: normalizedGoal.type,
      targetAmount: normalizedGoal.targetAmount ? normalizedGoal.targetAmount.amount : null,
      currency: normalizedGoal.currency,
      priority: normalizedGoal.priority,
      strategy: normalizedGoal.strategy,
      status: subjectGoal.status,
      desiredDate: normalizedGoal.desiredDate ?? null,
      completedAt: subjectGoal.completedAt ?? null,
      emergencyFundMonths: normalizedGoal.emergencyFundMonths ?? null,
      createdAt: subjectGoal.createdAt,
    }
    proposedGoals = (state.source.goals ?? []).map((g) => (g.id === subjectGoalId ? updatedGoal : g))
  } else {
    const pendingGoal: GoalsWorkspaceSource['goals'][number] = {
      id: PENDING_GOAL_ID,
      userId: state.source.profile?.userId,
      name: normalizedGoal.name,
      type: normalizedGoal.type,
      targetAmount: normalizedGoal.targetAmount ? normalizedGoal.targetAmount.amount : null,
      currency: normalizedGoal.currency,
      priority: normalizedGoal.priority,
      strategy: normalizedGoal.strategy,
      status: 'active' as const,
      desiredDate: normalizedGoal.desiredDate ?? null,
      emergencyFundMonths: normalizedGoal.emergencyFundMonths ?? null,
      createdAt: `${currentMonth}-01T00:00:00.000Z`,
    }
    proposedGoals = [...(state.source.goals ?? []), pendingGoal]
  }

  let proposedInvestmentPositions: GoalsWorkspaceSource['investmentPositions']
  if (isEditing) {
    const otherInvestmentPositions = (state.source.investmentPositions ?? []).filter(
      (p) => p.goalId !== subjectGoalId,
    )
    if (strategy === 'invest') {
      const existingPosition = (state.source.investmentPositions ?? []).find(
        (p) => p.goalId === subjectGoalId,
      )
      const updatedPosition = {
        id: existingPosition?.id ?? `pos-${subjectGoalId}`,
        goalId: subjectGoalId,
        currentValue: existingPosition?.currentValue ?? '0.00',
        currency: normalizedGoal.currency,
        annualReturnRate: investment?.annualReturnRate ?? null,
        availability: investment?.availability ?? null,
        availableFrom: investment?.availableFrom ?? null,
      }
      proposedInvestmentPositions = [...otherInvestmentPositions, updatedPosition]
    } else {
      proposedInvestmentPositions = otherInvestmentPositions
    }
  } else {
    const pendingInvestmentPosition =
      strategy === 'invest'
        ? {
            id: `pos-${PENDING_GOAL_ID}`,
            goalId: PENDING_GOAL_ID,
            currentValue: '0.00',
            currency: normalizedGoal.currency,
            annualReturnRate: investment?.annualReturnRate ?? null,
            availability: investment?.availability ?? null,
            availableFrom: investment?.availableFrom ?? null,
          }
        : null
    proposedInvestmentPositions = pendingInvestmentPosition
      ? [...(state.source.investmentPositions ?? []), pendingInvestmentPosition]
      : (state.source.investmentPositions ?? [])
  }

  // 4. Candidate active existing goals
  const activeExistingGoals = (state.source.goals ?? []).filter((g) => g.status === 'active')

  // 5. Selected snapshot for allocation baseline
  const pendingNextSnapshot = state.pendingSnapshots?.find(
    (s) => s.effectiveMonth.slice(0, 7) === nextMonthStr,
  )
  const sourceNextSnapshot = state.source.snapshots?.find(
    (s) => s.effectiveMonth.slice(0, 7) === nextMonthStr,
  )
  const currentSnapshot = state.source.snapshots
    ?.filter((s) => s.effectiveMonth.slice(0, 7) <= currentMonth.slice(0, 7))
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0]

  const selectedSnapshot = pendingNextSnapshot ?? sourceNextSnapshot ?? currentSnapshot

  const sourceAllocs = selectedSnapshot
    ? (pendingNextSnapshot ? state.pendingAllocations : state.source.allocations)?.filter(
        (a) => a.snapshotId === selectedSnapshot.id,
      ) ?? []
    : []

  // 6. Assemble entries
  let entries: GoalCreationAllocationEntry[] = []

  if (isEditing) {
    if (sourceAllocs.length > 0) {
      const activeAllocGoalIds = new Set(
        sourceAllocs.map((a) => a.goalId).filter((id) => activeExistingGoals.some((g) => g.id === id)),
      )

      for (const a of sourceAllocs) {
        const existingGoal = activeExistingGoals.find((g) => g.id === a.goalId)
        if (existingGoal) {
          entries.push({
            goalId: a.goalId,
            goalName: existingGoal.id === subjectGoalId ? normalizedGoal.name : existingGoal.name,
            percentage: new BigNumber(a.percentage).toFixed(2),
            pending: false,
          })
        }
      }

      for (const g of activeExistingGoals) {
        if (!activeAllocGoalIds.has(g.id)) {
          entries.push({
            goalId: g.id,
            goalName: g.id === subjectGoalId ? normalizedGoal.name : g.name,
            percentage: '0.00',
            pending: false,
          })
        }
      }
    } else {
      entries = activeExistingGoals.map((g) => ({
        goalId: g.id,
        goalName: g.id === subjectGoalId ? normalizedGoal.name : g.name,
        percentage: activeExistingGoals.length === 1 ? '100.00' : '0.00',
        pending: false,
      }))
      if (entries.length > 0 && calculatePercentageSum(entries).isZero()) {
        const subjectIdx = entries.findIndex((e) => e.goalId === subjectGoalId)
        if (subjectIdx >= 0) {
          entries[subjectIdx].percentage = '100.00'
        } else {
          entries[0].percentage = '100.00'
        }
      }
    }
  } else {
    if (sourceAllocs.length > 0) {
      const activeAllocGoalIds = new Set(
        sourceAllocs.map((a) => a.goalId).filter((id) => activeExistingGoals.some((g) => g.id === id)),
      )

      for (const a of sourceAllocs) {
        const existingGoal = activeExistingGoals.find((g) => g.id === a.goalId)
        if (existingGoal) {
          entries.push({
            goalId: a.goalId,
            goalName: existingGoal.name,
            percentage: new BigNumber(a.percentage).toFixed(2),
            pending: false,
          })
        }
      }

      for (const g of activeExistingGoals) {
        if (!activeAllocGoalIds.has(g.id)) {
          entries.push({
            goalId: g.id,
            goalName: g.name,
            percentage: '0.00',
            pending: false,
          })
        }
      }

      entries.push({
        goalId: PENDING_GOAL_ID,
        goalName: normalizedGoal.name,
        percentage: '0.00',
        pending: true,
      })
    } else {
      entries = activeExistingGoals.map((g) => ({
        goalId: g.id,
        goalName: g.name,
        percentage: '0.00',
        pending: false,
      }))

      entries.push({
        goalId: PENDING_GOAL_ID,
        goalName: normalizedGoal.name,
        percentage: '100.00',
        pending: true,
      })
    }
  }

  // 7. Overlay user-submitted draft allocations if valid
  if (draft.allocations && draft.allocations.length > 0) {
    const expectedIds = new Set(entries.map((e) => e.goalId))
    const submittedIds = new Set(draft.allocations.map((e) => e.goalId))
    const isExactMatch =
      submittedIds.size === expectedIds.size &&
      [...expectedIds].every((id) => submittedIds.has(id))

    if (isExactMatch) {
      entries = entries.map((entry) => {
        const subEntry = draft.allocations.find((e) => e.goalId === entry.goalId)
        if (subEntry) {
          const parsedPct = new BigNumber((subEntry.percentage || '0').replace(',', '.'))
          return {
            ...entry,
            percentage: parsedPct.toFixed(2),
          }
        }
        return entry
      })
    }
  }

  // 8. Verify total percentage equals 100%
  const totalBn = calculatePercentageSum(entries)
  if (!totalBn.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${totalBn.toFixed(2)}%`)
  }

  // 9. Monthly contribution and allocation amounts
  let monthlyContribution: Money | undefined
  if (
    state.source.profile?.plannedMonthlyContribution !== null &&
    state.source.profile?.plannedMonthlyContribution !== undefined
  ) {
    const baseCurr = state.source.profile.baseCurrency ?? 'ARS'
    monthlyContribution = createMoney(state.source.profile.plannedMonthlyContribution, baseCurr)
  }

  const entriesCurrencyMap = new Map<string, CurrencyCode>()
  for (const g of activeExistingGoals) {
    entriesCurrencyMap.set(g.id, g.id === subjectGoalId ? normalizedGoal.currency : g.currency)
  }
  if (!isEditing) {
    entriesCurrencyMap.set(PENDING_GOAL_ID, normalizedGoal.currency)
  }

  if (monthlyContribution) {
    const amountsMap = recalculateAllocationAmounts({
      monthlyContribution,
      entries: entries.map((e) => ({
        goalId: e.goalId,
        percentage: e.percentage,
        currency: entriesCurrencyMap.get(e.goalId) ?? 'ARS',
      })),
    })

    entries = entries.map((entry) => {
      const amounts = amountsMap.get(entry.goalId)
      return {
        ...entry,
        allocatedBaseAmount: amounts?.allocatedBaseAmount,
        allocatedDestinationAmount: amounts?.allocatedDestinationAmount,
      }
    })
  }

  const allocation: GoalCreationAllocation = {
    monthlyContribution,
    effectiveMonth: nextMonthEffective,
    entries,
    totalPercentage: totalBn.toFixed(2),
  }

  // 10. Build before workspace from current source
  const beforeWorkspace = buildGoalsWorkspace(state.source, currentMonth)

  // 11. Build proposed source and after workspace
  const proposedSnapshots = [...(state.source.snapshots ?? [])]
  const proposedAllocations = [...(state.source.allocations ?? [])]

  const pendingSnap = state.pendingSnapshots?.find((s) => s.effectiveMonth === nextMonthEffective)
  const snapshotId = pendingSnap?.id ?? `snap-allocation-${nextMonthStr}`

  const newSnapshot = {
    id: snapshotId,
    userId: state.source.profile?.userId,
    effectiveMonth: nextMonthEffective,
  }

  const existingSnapIndex = proposedSnapshots.findIndex(
    (s) => s.effectiveMonth === nextMonthEffective,
  )
  if (existingSnapIndex >= 0) {
    proposedSnapshots[existingSnapIndex] = newSnapshot
  } else {
    proposedSnapshots.push(newSnapshot)
  }

  const filteredAllocations = proposedAllocations.filter((a) => a.snapshotId !== snapshotId)
  const newAllocRows = entries.map((entry) => ({
    id: `alloc-${snapshotId}-${entry.goalId}`,
    snapshotId,
    goalId: entry.goalId,
    percentage: entry.percentage,
  }))

  proposedAllocations.length = 0
  proposedAllocations.push(...filteredAllocations, ...newAllocRows)

  const proposedSource: GoalsWorkspaceSource = {
    profile: state.source.profile,
    goals: proposedGoals,
    savingsPositions: state.source.savingsPositions,
    investmentPositions: proposedInvestmentPositions,
    snapshots: proposedSnapshots,
    allocations: proposedAllocations,
  }

  const afterWorkspace = buildGoalsWorkspace(proposedSource, currentMonth)

  const beforeGoals = beforeWorkspace.groups.flatMap((g) => g.goals)
  const afterGoals = afterWorkspace.groups.flatMap((g) => g.goals)

  // 12. Assemble impacts
  const impacts: GoalCreationImpact[] = []

  if (!isEditing) {
    // Pending goal impact
    const afterPendingGoal = afterGoals.find((g) => g.id === PENDING_GOAL_ID)
    impacts.push({
      goalId: PENDING_GOAL_ID,
      goalName: normalizedGoal.name,
      before: { status: 'not_created' },
      after: afterPendingGoal?.projection ?? { status: 'target_unavailable' },
    })
  }

  // Existing goals impact
  for (const goal of state.source.goals ?? []) {
    const beforeGoal = beforeGoals.find((g) => g.id === goal.id)
    const afterGoal = afterGoals.find((g) => g.id === goal.id)

    const beforeProjection: GoalProjection = beforeGoal?.projection ?? {
      status: 'target_unavailable',
    }
    const afterProjection: GoalProjection = afterGoal?.projection ?? {
      status: 'target_unavailable',
    }

    const beforeAllocatedAmounts: Money[] = []
    let amountsChanged = false

    const beforeFundingRow = beforeGoal?.funding?.find(
      (f) => f.effectiveMonth === selectedSnapshot?.effectiveMonth,
    ) ?? beforeGoal?.funding?.[0]

    if (beforeFundingRow?.allocatedDestinationAmount) {
      beforeAllocatedAmounts.push(beforeFundingRow.allocatedDestinationAmount)
    }

    const afterEntry = allocation.entries.find((e) => e.goalId === goal.id)
    const afterDestAmount = afterEntry?.allocatedDestinationAmount

    if (
      beforeFundingRow?.allocatedDestinationAmount?.amount !== afterDestAmount?.amount ||
      beforeFundingRow?.allocatedDestinationAmount?.currency !== afterDestAmount?.currency
    ) {
      amountsChanged = true
    }

    const projectionChanged =
      JSON.stringify(beforeProjection) !== JSON.stringify(afterProjection)

    const isSubject = isEditing && goal.id === subjectGoalId

    if (isSubject || projectionChanged || amountsChanged) {
      impacts.push({
        goalId: goal.id,
        goalName: isSubject ? normalizedGoal.name : goal.name,
        before: {
          status: 'existing',
          projection: beforeProjection,
          allocatedMonthlyAmounts: beforeAllocatedAmounts,
        },
        after: afterProjection,
      })
    }
  }

  return {
    normalizedGoal,
    investment,
    allocation,
    impacts,
    proposedSource,
  }
}

export function serializeGoalCreationState(
  stateOrSource: GoalCreationState | GoalsWorkspaceSource,
  currentMonth: string,
  draft?: GoalCreationDraft,
): string {
  const state: GoalCreationState =
    'source' in stateOrSource && stateOrSource.source
      ? (stateOrSource as GoalCreationState)
      : {
          source: stateOrSource as GoalsWorkspaceSource,
          pendingSnapshots: [],
          pendingAllocations: [],
        }

  const { source, pendingSnapshots, pendingAllocations } = state

  const normalized = {
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    profile: source.profile
      ? {
          userId: source.profile.userId,
          baseCurrency: source.profile.baseCurrency,
          approximateMonthlyIncome: source.profile.approximateMonthlyIncome,
          approximateMonthlyExpenses: source.profile.approximateMonthlyExpenses ?? null,
          expensesKnowledge: source.profile.expensesKnowledge,
          plannedMonthlyContribution: source.profile.plannedMonthlyContribution ?? null,
          onboardingCompleted: source.profile.onboardingCompleted,
        }
      : null,
    goals: (source.goals ?? [])
      .map((g) => ({
        id: g.id,
        userId: g.userId ?? null,
        name: g.name,
        type: g.type,
        targetAmount: g.targetAmount ?? null,
        currency: g.currency,
        priority: g.priority,
        strategy: g.strategy,
        status: g.status,
        desiredDate: g.desiredDate ?? null,
        completedAt: g.completedAt ?? null,
        emergencyFundMonths: g.emergencyFundMonths ?? null,
        createdAt: g.createdAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    savingsPositions: (source.savingsPositions ?? [])
      .map((s) => ({
        id: s.id,
        goalId: s.goalId,
        amount: s.amount,
        currency: s.currency,
        location: s.location ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    investmentPositions: (source.investmentPositions ?? [])
      .map((i) => ({
        id: i.id,
        goalId: i.goalId,
        currentValue: i.currentValue,
        currency: i.currency,
        annualReturnRate: i.annualReturnRate ?? null,
        availability: i.availability ?? null,
        availableFrom: i.availableFrom ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    snapshots: (source.snapshots ?? [])
      .map((s) => ({
        id: s.id,
        userId: s.userId ?? null,
        effectiveMonth: s.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    allocations: (source.allocations ?? [])
      .map((a) => ({
        id: a.id,
        snapshotId: a.snapshotId,
        goalId: a.goalId,
        percentage: a.percentage,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pendingSnapshots: (pendingSnapshots ?? [])
      .map((s) => ({
        id: s.id,
        userId: s.userId ?? null,
        effectiveMonth: s.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pendingAllocations: (pendingAllocations ?? [])
      .map((a) => ({
        id: a.id,
        snapshotId: a.snapshotId,
        goalId: a.goalId,
        percentage: a.percentage,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    draft: draft
      ? {
          type: draft.type,
          name: draft.name.trim(),
          targetAmount: draft.targetAmount,
          currency: draft.currency,
          desiredMonth: draft.desiredMonth ?? null,
          priority: draft.priority,
          strategy: draft.strategy,
          annualReturnRate: draft.annualReturnRate,
          availability: draft.availability,
          availableFromMonth: draft.availableFromMonth ?? null,
          allocations: (draft.allocations ?? [])
            .map((e) => ({
              goalId: e.goalId,
              percentage: new BigNumber((e.percentage || '0').replace(',', '.')).toFixed(2),
            }))
            .sort((a, b) => a.goalId.localeCompare(b.goalId)),
        }
      : null,
  }

  return JSON.stringify(normalized)
}
