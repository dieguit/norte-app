import { createServerFn } from '@tanstack/react-start'
import {
  confirmSavingContributionServer,
  deleteSavingContributionServer,
  getSavingContributionContextServer,
  previewSavingContributionServer,
  updateSavingContributionServer,
} from './saving-contribution.server'
import {
  confirmSavingContributionSchema,
  deleteSavingContributionSchema,
  savingDraftInputSchema,
  updateSavingContributionSchema,
} from './saving-contribution.schema'

export const getSavingContributionContext = createServerFn({ method: 'GET' })
  .handler(getSavingContributionContextServer)

export const previewSavingContribution = createServerFn({ method: 'POST' })
  .validator((data) => savingDraftInputSchema.parse(data))
  .handler(previewSavingContributionServer)

export const confirmSavingContribution = createServerFn({ method: 'POST' })
  .validator((data) => confirmSavingContributionSchema.parse(data))
  .handler(confirmSavingContributionServer)

export const updateSavingContribution = createServerFn({ method: 'POST' })
  .validator((data) => updateSavingContributionSchema.parse(data))
  .handler(updateSavingContributionServer)

export const deleteSavingContribution = createServerFn({ method: 'POST' })
  .validator((data) => deleteSavingContributionSchema.parse(data))
  .handler(deleteSavingContributionServer)

