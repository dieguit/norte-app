import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import type { GoalsWorkspaceSource } from '../goals/goals'
import {
  serializeSavingContributionState,
  type EligibleGoal,
  type SavingDraftInput,
  type SavingContributionPreviewResult,
} from './saving-contribution'

export interface SavingContributionState {
  source: GoalsWorkspaceSource
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
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

export async function getSavingContributionState(
  _userId: string,
  _currentMonth: string,
): Promise<SavingContributionState | null> {
  // Stub implementation; full Drizzle persistence implemented in Task 4
  return null
}

export async function createSavingContributionInRepository(_input: {
  userId: string
  currentMonth: string
  draft: SavingDraftInput
  previewToken: string
}): Promise<{ contributionId: string }> {
  // Stub implementation; full Drizzle persistence implemented in Task 4
  return { contributionId: '' }
}

export async function updateSavingContributionInRepository(_input: {
  userId: string
  contributionId: string
  draft: SavingDraftInput
}): Promise<void> {
  // Stub implementation; full Drizzle persistence implemented in Task 4
}

export async function deleteSavingContributionInRepository(_input: {
  userId: string
  contributionId: string
}): Promise<void> {
  // Stub implementation; full Drizzle persistence implemented in Task 4
}
