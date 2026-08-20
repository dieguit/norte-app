import '@tanstack/react-start/server-only'
import { createMoney } from '../../lib/money'
import { requireFinancialUser } from '../financial/auth.server'
import { buildGoalsWorkspace, type GoalsAppState } from './goals'
import {
  confirmGoalCreationInRepository,
  createGoalCreationPreviewToken,
  getGoalCreationState,
  getGoalsWorkspaceRows,
  mapRowsToGoalsWorkspaceSource,
  StaleGoalCreationPreviewError,
} from './goals.repository.server'
import {
  buildGoalCreationProposal,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
  type GoalCreationState,
} from './goal-creation'
import {
  parseGoalCreationSubmission,
  type ConfirmGoalCreationInput,
  type GoalCreationDraft,
} from './goal-creation.schema'

export type { GoalsAppState, GoalCreationContextState }

type GoalCreationContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: GoalCreationContext }

export function mapGoalCreationContext(
  state: GoalCreationState,
  currentMonth: string,
): GoalCreationContext {
  return {
    currentMonth,
    expensesKnowledge: state.source.profile?.expensesKnowledge === 'known' ? 'known' : 'unknown',
    hasEmergencyFund: state.source.goals.some((goal) => goal.type === 'emergency_fund'),
    fundingOptions: state.source.channels.map((channel) => {
      const pending = state.pendingSnapshots.find((snapshot) => snapshot.channelId === channel.id)
      const current = state.source.snapshots.find((snapshot) => snapshot.channelId === channel.id)
      const snapshot = pending ?? current
      return {
        fundingMethod: channel.fundingMethod,
        destinationCurrency: channel.destinationCurrency,
        baseCurrency: snapshot?.baseCurrency ?? state.source.profile?.baseCurrency ?? 'ARS',
        monthlyCommitment: snapshot?.monthlyCommitmentAmount
          ? createMoney(snapshot.monthlyCommitmentAmount, snapshot.baseCurrency)
          : undefined,
        commitmentStatus: snapshot?.commitmentStatus ?? 'active',
      }
    }),
  }
}

export async function getGoalsWorkspaceServer(): Promise<GoalsAppState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const rows = await getGoalsWorkspaceRows(userId, currentMonth)

  if (!rows) {
    return { profile: 'missing' }
  }

  const source = mapRowsToGoalsWorkspaceSource(rows)
  const workspace = buildGoalsWorkspace(source, currentMonth)

  return {
    profile: 'present',
    workspace,
  }
}

export async function getGoalCreationContextServer(): Promise<GoalCreationContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalCreationState(userId, currentMonth)
  if (!state) {
    return { profile: 'missing' }
  }
  return {
    profile: 'present',
    context: mapGoalCreationContext(state, currentMonth),
  }
}

export async function previewGoalCreationServer({
  data,
}: {
  data: GoalCreationDraft
}): Promise<GoalCreationPreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalCreationState(userId, currentMonth)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de crear un objetivo.')
  }
  const draft = parseGoalCreationSubmission(data, currentMonth)
  const proposal = buildGoalCreationProposal({ draft, state, currentMonth })
  return {
    proposal,
    previewToken: createGoalCreationPreviewToken(state, currentMonth, draft),
  }
}

export async function confirmGoalCreationServer({
  data,
}: {
  data: ConfirmGoalCreationInput
}): Promise<{ status: 'created'; goalId: string } | { status: 'stale'; preview: GoalCreationPreviewResult }> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const draft = parseGoalCreationSubmission(data.draft, currentMonth)
  try {
    const result = await confirmGoalCreationInRepository({
      userId,
      currentMonth,
      draft,
      previewToken: data.previewToken,
    })
    return { status: 'created' as const, goalId: result.goalId }
  } catch (error) {
    if (error instanceof StaleGoalCreationPreviewError) {
      return { status: 'stale' as const, preview: error.refreshedPreview }
    }
    throw error
  }
}
