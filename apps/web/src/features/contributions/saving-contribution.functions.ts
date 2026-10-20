import { createServerFn } from '@tanstack/react-start'
import {
  ConfirmSavingContributionWireSchema,
  ContributionIdPathWireSchema,
  SavingContributionDraftWireSchema,
  UpdateSavingContributionWireSchema,
} from '@repo/shared-types'
import {
  confirmSavingContributionServer,
  deleteSavingContributionServer,
  getSavingContributionContextServer,
  previewSavingContributionEditServer,
  previewSavingContributionServer,
  updateSavingContributionServer,
} from './saving-contribution.server'

const contributionIdSchema = ContributionIdPathWireSchema.shape.id

export const getSavingContributionContext = createServerFn({ method: 'GET' })
  .handler(getSavingContributionContextServer)

export const previewSavingContribution = createServerFn({ method: 'POST' })
  .validator((data) => SavingContributionDraftWireSchema.parse(data))
  .handler(previewSavingContributionServer)

export const previewSavingContributionEdit = createServerFn({ method: 'POST' })
  .validator((data: { contributionId: string; draft: unknown }) => ({
    contributionId: contributionIdSchema.parse(data.contributionId),
    draft: SavingContributionDraftWireSchema.parse(data.draft),
  }))
  .handler(previewSavingContributionEditServer)

export const confirmSavingContribution = createServerFn({ method: 'POST' })
  .validator((data) => ConfirmSavingContributionWireSchema.parse(data))
  .handler(confirmSavingContributionServer)

export const updateSavingContribution = createServerFn({ method: 'POST' })
  .validator((data: { contributionId: string; draft: unknown }) => ({
    contributionId: contributionIdSchema.parse(data.contributionId),
    ...UpdateSavingContributionWireSchema.parse({ draft: data.draft }),
  }))
  .handler(updateSavingContributionServer)

export const deleteSavingContribution = createServerFn({ method: 'POST' })
  .validator((data: { contributionId: string }) => ({
    contributionId: contributionIdSchema.parse(data.contributionId),
  }))
  .handler(deleteSavingContributionServer)
