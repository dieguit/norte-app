import { createServerFn } from '@tanstack/react-start'
import {
  confirmAllocationChangeServer,
  confirmGoalCreationServer,
  getAllocationChangeContextServer,
  getGoalCreationContextServer,
  getGoalsWorkspaceServer,
  previewAllocationChangeServer,
  previewGoalCreationServer,
} from './goals.server'
import {
  confirmGoalCreationSchema,
  goalCreationDraftSchema,
} from './goal-creation.schema'
import {
  allocationChangeDraftSchema,
  confirmAllocationChangeSchema,
} from './allocation-change.schema'

export const getGoalsWorkspace = createServerFn({ method: 'GET' })
  .handler(getGoalsWorkspaceServer)

export const getGoalCreationContext = createServerFn({ method: 'GET' })
  .handler(getGoalCreationContextServer)

export const previewGoalCreation = createServerFn({ method: 'POST' })
  .validator((data) => goalCreationDraftSchema.parse(data))
  .handler(previewGoalCreationServer)

export const confirmGoalCreation = createServerFn({ method: 'POST' })
  .validator((data) => confirmGoalCreationSchema.parse(data))
  .handler(confirmGoalCreationServer)

export const getAllocationChangeContext = createServerFn({ method: 'GET' })
  .handler(getAllocationChangeContextServer)

export const previewAllocationChange = createServerFn({ method: 'POST' })
  .validator((data) => allocationChangeDraftSchema.parse(data))
  .handler(previewAllocationChangeServer)

export const confirmAllocationChange = createServerFn({ method: 'POST' })
  .validator((data) => confirmAllocationChangeSchema.parse(data))
  .handler(confirmAllocationChangeServer)

