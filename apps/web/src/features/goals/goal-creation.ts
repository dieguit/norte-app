import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  calculateAllocationAmounts,
  createMoney,
  multiplyMoneyByFactor,
  parseMoneyInput,
} from '../../lib/money'
import {
  type FundingMethod,
  PLANNING_ARS_PER_USD,
  convertCommitmentToDestination,
} from '../financial/financial'
import {
  type GoalPriority,
  type GoalProjection,
  type GoalsWorkspaceSource,
  type InvestmentAvailability,
  buildGoalsWorkspace,
} from './goals'
import type { GoalCreationDraft } from './goal-creation.schema'

export const PENDING_GOAL_ID = 'pending-goal'

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

export interface GoalCreationAllocationGroup {
  key: string
  channelId?: string
  fundingMethod: FundingMethod
  destinationCurrency: CurrencyCode
  baseCurrency: CurrencyCode
  monthlyCommitment?: Money
  destinationCommitment?: Money
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
    desiredDate?: string
    emergencyFundMonths?: number
    saveEnabled: boolean
    investEnabled: boolean
  }
  investment?: {
    annualReturnRate: string
    availability: InvestmentAvailability
    availableFrom?: string
  }
  allocationGroups: GoalCreationAllocationGroup[]
  impacts: GoalCreationImpact[]
  proposedSource: GoalsWorkspaceSource
}

export interface GoalCreationContext {
  currentMonth: string
  expensesKnowledge: 'known' | 'unknown'
  hasEmergencyFund: boolean
  fundingOptions: Array<{
    fundingMethod: FundingMethod
    destinationCurrency: CurrencyCode
    baseCurrency: CurrencyCode
    monthlyCommitment?: Money
    commitmentStatus: 'active' | 'paused'
  }>
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
  monthlyCommitment?: Money
  destinationCurrency: CurrencyCode
  entries: Array<{
    goalId: string
    percentage: string
  }>
}): Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }> {
  const { monthlyCommitment, destinationCurrency, entries } = input
  const map = new Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }>()

  if (!monthlyCommitment) {
    for (const entry of entries) {
      map.set(entry.goalId, {})
    }
    return map
  }

  const totalBn = calculatePercentageSum(entries)

  if (totalBn.isEqualTo(100)) {
    const allocatedBaseList = calculateAllocationAmounts(
      monthlyCommitment,
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
          destinationCurrency,
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
        const amountBn = new BigNumber(monthlyCommitment.amount).times(pctBn).dividedBy(100)
        const allocatedBaseAmount = createMoney(amountBn.toFixed(2), monthlyCommitment.currency)
        const allocatedDestinationAmount = convertCommitmentToDestination(
          allocatedBaseAmount,
          destinationCurrency,
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
}): GoalCreationProposal {
  const { draft, state, currentMonth } = input

  // 1. Normalize goal and investment details
  const name = draft.name.trim()
  const type = draft.type
  const currency = draft.currency
  const priority = draft.priority
  const saveEnabled = draft.saveEnabled
  const investEnabled = draft.investEnabled

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
      const monthlyExp = new BigNumber(state.source.profile.approximateMonthlyExpenses)
      const baseCurr = state.source.profile.baseCurrency
      const totalExpBase = createMoney(monthlyExp.times(6).toFixed(2), baseCurr)
      targetAmount = convertCommitmentToDestination(totalExpBase, currency)
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
    desiredDate,
    emergencyFundMonths,
    saveEnabled,
    investEnabled,
  }

  const investment: GoalCreationProposal['investment'] = investEnabled
    ? {
        annualReturnRate: (draft.annualReturnRate || '8.0').replace(',', '.'),
        availability: draft.availability,
        availableFrom:
          draft.availability === 'available_from' && draft.availableFromMonth
            ? `${draft.availableFromMonth.slice(0, 7)}-01`
            : undefined,
      }
    : undefined

  // 2. Pending goal workspace item and investment position for simulation
  const nextMonthStr = getNextCalendarMonthStr(currentMonth)
  const nextMonthEffective = `${nextMonthStr}-01`

  const pendingGoal: GoalsWorkspaceSource['goals'][number] = {
    id: PENDING_GOAL_ID,
    userId: state.source.profile?.userId,
    name: normalizedGoal.name,
    type: normalizedGoal.type,
    targetAmount: normalizedGoal.targetAmount ? normalizedGoal.targetAmount.amount : null,
    currency: normalizedGoal.currency,
    priority: normalizedGoal.priority,
    status: 'active' as const,
    desiredDate: normalizedGoal.desiredDate ?? null,
    emergencyFundMonths: normalizedGoal.emergencyFundMonths ?? null,
    saveEnabled: normalizedGoal.saveEnabled,
    investEnabled: normalizedGoal.investEnabled,
    createdAt: `${currentMonth}-01T00:00:00.000Z`,
  }

  const pendingInvestmentPosition = investEnabled
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

  // 3. Assemble allocation groups for each enabled method
  const enabledMethods: FundingMethod[] = []
  if (saveEnabled) enabledMethods.push('save')
  if (investEnabled) enabledMethods.push('invest')

  const allocationGroups: GoalCreationAllocationGroup[] = []

  // Track before allocations for each group to compare later
  const beforeGroupData = new Map<
    string,
    {
      selectedSnapshot?: GoalsWorkspaceSource['snapshots'][number]
      sourceAllocs: GoalsWorkspaceSource['allocations']
      commitment?: Money
    }
  >()

  const profileBaseCurrency = state.source.profile?.baseCurrency ?? 'ARS'

  for (const fundingMethod of enabledMethods) {
    const destinationCurrency = currency
    const groupKey = `${fundingMethod}:${destinationCurrency}`

    // Candidate active existing goals matching currency AND funding method capability
    const eligibleExistingGoals = state.source.goals.filter(
      (g) =>
        g.status === 'active' &&
        g.currency === destinationCurrency &&
        (fundingMethod === 'save' ? g.saveEnabled : g.investEnabled),
    )

    const channel = state.source.channels.find(
      (c) => c.fundingMethod === fundingMethod && c.destinationCurrency === destinationCurrency,
    )
    const channelId = channel?.id

    const pendingSnapshot = channelId
      ? state.pendingSnapshots.find((s) => s.channelId === channelId)
      : undefined
    const currentSnapshot = channelId
      ? state.source.snapshots.find((s) => s.channelId === channelId)
      : undefined
    const selectedSnapshot = pendingSnapshot ?? currentSnapshot

    const sourceAllocs = selectedSnapshot
      ? pendingSnapshot
        ? state.pendingAllocations.filter((a) => a.snapshotId === selectedSnapshot.id)
        : state.source.allocations.filter((a) => a.snapshotId === selectedSnapshot.id)
      : []

    // Monthly commitment determination
    let monthlyCommitment: Money | undefined
    let snapshotMonthlyCommitment: Money | undefined

    if (
      selectedSnapshot?.monthlyCommitmentAmount !== null &&
      selectedSnapshot?.monthlyCommitmentAmount !== undefined
    ) {
      snapshotMonthlyCommitment = createMoney(
        selectedSnapshot.monthlyCommitmentAmount,
        selectedSnapshot.baseCurrency,
      )
    }

    if (fundingMethod === 'save') {
      if (draft.defineSaveCommitment && draft.saveMonthlyCommitment) {
        monthlyCommitment = parseMoneyInput(draft.saveMonthlyCommitment, profileBaseCurrency) ?? undefined
      } else {
        monthlyCommitment = snapshotMonthlyCommitment
      }
    } else if (fundingMethod === 'invest') {
      if (draft.defineInvestCommitment && draft.investMonthlyCommitment) {
        monthlyCommitment = parseMoneyInput(draft.investMonthlyCommitment, profileBaseCurrency) ?? undefined
      } else {
        monthlyCommitment = snapshotMonthlyCommitment
      }
    }

    beforeGroupData.set(groupKey, {
      selectedSnapshot,
      sourceAllocs,
      commitment: snapshotMonthlyCommitment,
    })

    const baseCurrency = selectedSnapshot?.baseCurrency ?? profileBaseCurrency
    const destinationCommitment = monthlyCommitment
      ? convertCommitmentToDestination(monthlyCommitment, destinationCurrency)
      : undefined

    // 4. Assemble entries
    let entries: GoalCreationAllocationEntry[] = []

    if (sourceAllocs.length > 0) {
      const activeAllocGoalIds = new Set(
        sourceAllocs.map((a) => a.goalId).filter((id) => eligibleExistingGoals.some((g) => g.id === id)),
      )

      for (const a of sourceAllocs) {
        const existingGoal = eligibleExistingGoals.find((g) => g.id === a.goalId)
        if (existingGoal) {
          entries.push({
            goalId: a.goalId,
            goalName: existingGoal.name,
            percentage: new BigNumber(a.percentage).toFixed(2),
            pending: false,
          })
        }
      }

      for (const g of eligibleExistingGoals) {
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
      entries = eligibleExistingGoals.map((g) => ({
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

    // 5. Overlay user-submitted draft allocations if valid
    const submittedGroup = draft.allocations?.find((g) => g.key === groupKey)
    if (submittedGroup) {
      const expectedIds = new Set(entries.map((e) => e.goalId))
      const submittedIds = new Set(submittedGroup.entries.map((e) => e.goalId))
      const isExactMatch =
        submittedIds.size === expectedIds.size &&
        [...expectedIds].every((id) => submittedIds.has(id))

      if (isExactMatch) {
        entries = entries.map((entry) => {
          const subEntry = submittedGroup.entries.find((e) => e.goalId === entry.goalId)
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

    // 6. Verify total percentage equals 100%
    const totalBn = calculatePercentageSum(entries)
    if (!totalBn.isEqualTo(100)) {
      throw new Error(
        `Allocation percentages for ${groupKey} must sum to 100%, got ${totalBn.toFixed(2)}%`,
      )
    }

    // 7. Calculate allocation amounts
    if (monthlyCommitment) {
      const amountsMap = recalculateAllocationAmounts({
        monthlyCommitment,
        destinationCurrency,
        entries,
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

    allocationGroups.push({
      key: groupKey,
      channelId,
      fundingMethod,
      destinationCurrency,
      baseCurrency,
      monthlyCommitment,
      destinationCommitment,
      effectiveMonth: nextMonthEffective,
      entries,
      totalPercentage: totalBn.toFixed(2),
    })
  }

  // 8. Build before workspace from current source
  const beforeWorkspace = buildGoalsWorkspace(state.source, currentMonth)

  // 9. Build proposed source and after workspace
  const proposedChannels = [...state.source.channels]
  for (const group of allocationGroups) {
    if (
      !proposedChannels.some(
        (c) =>
          c.fundingMethod === group.fundingMethod &&
          c.destinationCurrency === group.destinationCurrency,
      )
    ) {
      proposedChannels.push({
        id: `channel-${group.fundingMethod}-${group.destinationCurrency.toLowerCase()}`,
        userId: state.source.profile?.userId,
        fundingMethod: group.fundingMethod,
        destinationCurrency: group.destinationCurrency,
      })
    }
  }

  const proposedSnapshots = [...state.source.snapshots]
  const proposedAllocations = [...state.source.allocations]

  for (const group of allocationGroups) {
    const channelId =
      group.channelId ??
      proposedChannels.find(
        (c) =>
          c.fundingMethod === group.fundingMethod &&
          c.destinationCurrency === group.destinationCurrency,
      )!.id

    const pendingSnap = state.pendingSnapshots.find((s) => s.channelId === channelId)
    const snapshotId =
      pendingSnap?.id ??
      `snap-${group.fundingMethod}-${group.destinationCurrency.toLowerCase()}-${nextMonthStr}`

    const newSnapshot = {
      id: snapshotId,
      channelId,
      monthlyCommitmentAmount: group.monthlyCommitment ? group.monthlyCommitment.amount : null,
      baseCurrency: group.baseCurrency,
      commitmentStatus: 'active' as const,
      effectiveMonth: group.effectiveMonth,
    }

    const existingSnapIndex = proposedSnapshots.findIndex(
      (s) => s.channelId === channelId && s.effectiveMonth === group.effectiveMonth,
    )
    if (existingSnapIndex >= 0) {
      proposedSnapshots[existingSnapIndex] = newSnapshot
    } else {
      proposedSnapshots.push(newSnapshot)
    }

    // Replace allocations for this snapshot
    const filteredAllocations = proposedAllocations.filter((a) => a.snapshotId !== snapshotId)
    const newAllocRows = group.entries.map((entry) => ({
      id: `alloc-${snapshotId}-${entry.goalId}`,
      snapshotId,
      goalId: entry.goalId,
      percentage: entry.percentage,
    }))

    proposedAllocations.length = 0
    proposedAllocations.push(...filteredAllocations, ...newAllocRows)
  }

  const proposedSource: GoalsWorkspaceSource = {
    profile: state.source.profile,
    goals: [...state.source.goals, pendingGoal],
    savingsPositions: state.source.savingsPositions,
    investmentPositions: pendingInvestmentPosition
      ? [...state.source.investmentPositions, pendingInvestmentPosition]
      : state.source.investmentPositions,
    channels: proposedChannels,
    snapshots: proposedSnapshots,
    allocations: proposedAllocations,
  }

  const afterWorkspace = buildGoalsWorkspace(proposedSource, currentMonth)

  const beforeGoals = beforeWorkspace.groups.flatMap((g) => g.goals)
  const afterGoals = afterWorkspace.groups.flatMap((g) => g.goals)

  // 10. Assemble impacts
  const impacts: GoalCreationImpact[] = []

  // Pending goal impact
  const afterPendingGoal = afterGoals.find((g) => g.id === PENDING_GOAL_ID)
  impacts.push({
    goalId: PENDING_GOAL_ID,
    goalName: normalizedGoal.name,
    before: { status: 'not_created' },
    after: afterPendingGoal?.projection ?? { status: 'target_unavailable' },
  })

  // Existing goals impact
  for (const goal of state.source.goals) {
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

    for (const group of allocationGroups) {
      const groupData = beforeGroupData.get(group.key)
      let beforeDestAmount: Money | undefined

      if (groupData?.commitment && groupData.sourceAllocs.length > 0) {
        const foundAlloc = groupData.sourceAllocs.find((a) => a.goalId === goal.id)
        if (foundAlloc) {
          const factor = new BigNumber(foundAlloc.percentage).dividedBy(100).toString()
          const baseAmount = multiplyMoneyByFactor(groupData.commitment, factor)
          beforeDestAmount = convertCommitmentToDestination(baseAmount, group.destinationCurrency)
          beforeAllocatedAmounts.push(beforeDestAmount)
        }
      }

      const afterEntry = group.entries.find((e) => e.goalId === goal.id)
      const afterDestAmount = afterEntry?.allocatedDestinationAmount

      if (
        beforeDestAmount?.amount !== afterDestAmount?.amount ||
        beforeDestAmount?.currency !== afterDestAmount?.currency
      ) {
        amountsChanged = true
      }
    }

    const projectionChanged =
      JSON.stringify(beforeProjection) !== JSON.stringify(afterProjection)

    if (projectionChanged || amountsChanged) {
      impacts.push({
        goalId: goal.id,
        goalName: goal.name,
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
    allocationGroups,
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
        status: g.status,
        desiredDate: g.desiredDate ?? null,
        completedAt: g.completedAt ?? null,
        emergencyFundMonths: g.emergencyFundMonths ?? null,
        saveEnabled: g.saveEnabled ?? null,
        investEnabled: g.investEnabled ?? null,
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
    channels: (source.channels ?? [])
      .map((c) => ({
        id: c.id,
        userId: c.userId ?? null,
        fundingMethod: c.fundingMethod,
        destinationCurrency: c.destinationCurrency,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    snapshots: (source.snapshots ?? [])
      .map((s) => ({
        id: s.id,
        channelId: s.channelId,
        monthlyCommitmentAmount: s.monthlyCommitmentAmount ?? null,
        baseCurrency: s.baseCurrency,
        commitmentStatus: s.commitmentStatus,
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
        channelId: s.channelId,
        monthlyCommitmentAmount: s.monthlyCommitmentAmount ?? null,
        baseCurrency: s.baseCurrency,
        commitmentStatus: s.commitmentStatus,
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
          saveEnabled: draft.saveEnabled,
          investEnabled: draft.investEnabled,
          defineSaveCommitment: draft.defineSaveCommitment,
          saveMonthlyCommitment: draft.saveMonthlyCommitment,
          defineInvestCommitment: draft.defineInvestCommitment,
          investMonthlyCommitment: draft.investMonthlyCommitment,
          annualReturnRate: draft.annualReturnRate,
          availability: draft.availability,
          availableFromMonth: draft.availableFromMonth ?? null,
          allocations: (draft.allocations ?? [])
            .map((g) => ({
              key: g.key,
              entries: [...g.entries]
                .map((e) => ({
                  goalId: e.goalId,
                  percentage: new BigNumber((e.percentage || '0').replace(',', '.')).toFixed(2),
                }))
                .sort((a, b) => a.goalId.localeCompare(b.goalId)),
            }))
            .sort((a, b) => a.key.localeCompare(b.key)),
        }
      : null,
  }

  return JSON.stringify(normalized)
}
