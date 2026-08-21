import '@tanstack/react-start/server-only'
import { requireFinancialUser } from '../financial/auth.server'
import { getPreviousCalendarMonth } from '../financial/financial'
import {
  buildSavingPreview,
  type SavingContributionContext,
  type SavingContributionContextState,
  type SavingContributionPreviewResult,
} from './saving-contribution'
import {
  createSavingContributionInRepository,
  createSavingContributionPreviewToken,
  deleteSavingContributionInRepository,
  getSavingContributionState,
  StaleSavingContributionPreviewError,
  updateSavingContributionInRepository,
} from './saving-contribution.repository.server'
import type {
  ConfirmSavingContributionInput,
  DeleteSavingContributionInput,
  SavingContributionDraft,
  UpdateSavingContributionInput,
} from './saving-contribution.schema'

export type { SavingContributionContext, SavingContributionContextState }

function getCatchUpCreatedAt(catchUpMonth: string | undefined, now: Date): Date | undefined {
  if (!catchUpMonth) return undefined
  if (catchUpMonth !== getPreviousCalendarMonth(now)) {
    throw new Error('Solo podés regularizar el mes anterior.')
  }

  const [year, month] = catchUpMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0, 12))
}

export async function getSavingContributionContextServer(): Promise<SavingContributionContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getSavingContributionState(userId, currentMonth)
  if (!state) {
    return { profile: 'missing' }
  }
  return {
    profile: 'present',
    context: {
      currentMonth,
      eligibleGoals: state.eligibleGoals,
      eligibleGoalsUsd: state.eligibleGoalsUsd,
      eligibleInvestmentGoals: state.eligibleInvestmentGoals,
      eligibleInvestmentGoalsUsd: state.eligibleInvestmentGoalsUsd,
      monthlyTargetArs: state.monthlyTargetArs,
      monthlyTargetUsd: state.monthlyTargetUsd,
      monthlyInvestmentTargetArs: state.monthlyInvestmentTargetArs,
      monthlyInvestmentTargetUsd: state.monthlyInvestmentTargetUsd,
    },
  }
}

export async function previewSavingContributionServer({
  data,
}: {
  data: SavingContributionDraft
}): Promise<SavingContributionPreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getSavingContributionState(userId, currentMonth)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de registrar un ahorro.')
  }

  const kind = data.kind ?? 'saving'
  let eligibleGoals =
    kind === 'investment'
      ? data.currency === 'USD'
        ? state.eligibleInvestmentGoalsUsd
        : state.eligibleInvestmentGoals
      : data.currency === 'USD'
        ? state.eligibleGoalsUsd
        : state.eligibleGoals

  if (!eligibleGoals || eligibleGoals.length === 0) {
    throw new Error(
      kind === 'investment'
        ? data.currency === 'USD'
          ? 'No hay objetivos activos para distribuir la inversión en USD.'
          : 'No hay objetivos activos para distribuir la inversión en ARS.'
        : data.currency === 'USD'
          ? 'No hay objetivos activos para distribuir el ahorro en USD.'
          : 'No hay objetivos activos para distribuir el ahorro en ARS.',
    )
  }

  const preview = buildSavingPreview({
    kind,
    draft: data,
    eligibleGoals,
    workspaceSource: state.source,
    currentMonth,
  })

  const previewToken = createSavingContributionPreviewToken(state, currentMonth, data)

  return {
    preview,
    previewToken,
  }
}

export async function confirmSavingContributionServer({
  data,
}: {
  data: ConfirmSavingContributionInput
}): Promise<
  | { status: 'created'; contributionId: string }
  | { status: 'stale'; preview: SavingContributionPreviewResult }
> {
  const userId = await requireFinancialUser()
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  const createdAt = getCatchUpCreatedAt(data.catchUpMonth, now)

  try {
    const result = await createSavingContributionInRepository({
      userId,
      currentMonth,
      draft: data.draft,
      previewToken: data.previewToken,
      ...(createdAt ? { createdAt } : {}),
    })
    return { status: 'created' as const, contributionId: result.contributionId }
  } catch (error) {
    if (error instanceof StaleSavingContributionPreviewError) {
      return { status: 'stale' as const, preview: error.refreshedPreview }
    }
    throw error
  }
}

export async function updateSavingContributionServer({
  data,
}: {
  data: UpdateSavingContributionInput
}): Promise<{ status: 'updated' }> {
  const userId = await requireFinancialUser()
  await updateSavingContributionInRepository({
    userId,
    contributionId: data.contributionId,
    draft: data.draft,
  })
  return { status: 'updated' as const }
}

export async function deleteSavingContributionServer({
  data,
}: {
  data: DeleteSavingContributionInput
}): Promise<{ status: 'deleted' }> {
  const userId = await requireFinancialUser()
  await deleteSavingContributionInRepository({
    userId,
    contributionId: data.contributionId,
  })
  return { status: 'deleted' as const }
}
