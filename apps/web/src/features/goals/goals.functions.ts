import { createServerFn } from '@tanstack/react-start'
import {
  confirmAllocationChangeServer,
  confirmGoalCreationServer,
  confirmGoalEditServer,
  confirmGoalLifecycleServer,
  getAllocationChangeContextServer,
  getGoalCreationContextServer,
  getGoalEditContextServer,
  getGoalLifecycleContextServer,
  getGoalsWorkspaceServer,
  previewAllocationChangeServer,
  previewGoalCreationServer,
  previewGoalEditServer,
  previewGoalLifecycleServer,
} from './goals.server'
import {
  confirmGoalCreationSchema,
  confirmGoalEditSchema,
  goalCreationDraftSchema,
  goalEditRequestSchema,
  previewGoalEditSchema,
} from './goal-creation.schema'
import {
  allocationChangeDraftSchema,
  confirmAllocationChangeSchema,
} from './allocation-change.schema'
import {
  confirmGoalLifecycleSchema,
  goalLifecyclePreviewSchema,
  goalLifecycleRequestSchema,
} from './goal-lifecycle.schema'

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

export const getGoalEditContext = createServerFn({ method: 'GET' })
  .validator((data) => goalEditRequestSchema.parse(data))
  .handler(getGoalEditContextServer)

export const previewGoalEdit = createServerFn({ method: 'POST' })
  .validator((data) => previewGoalEditSchema.parse(data))
  .handler(previewGoalEditServer)

export const confirmGoalEdit = createServerFn({ method: 'POST' })
  .validator((data) => confirmGoalEditSchema.parse(data))
  .handler(confirmGoalEditServer)

export const getAllocationChangeContext = createServerFn({ method: 'GET' })
  .handler(getAllocationChangeContextServer)

export const previewAllocationChange = createServerFn({ method: 'POST' })
  .validator((data) => allocationChangeDraftSchema.parse(data))
  .handler(previewAllocationChangeServer)

export const confirmAllocationChange = createServerFn({ method: 'POST' })
  .validator((data) => confirmAllocationChangeSchema.parse(data))
  .handler(confirmAllocationChangeServer)

export const getGoalLifecycleContext = createServerFn({ method: 'GET' })
  .validator((data) => goalLifecycleRequestSchema.parse(data))
  .handler(getGoalLifecycleContextServer)

export const previewGoalLifecycle = createServerFn({ method: 'POST' })
  .validator((data) => goalLifecyclePreviewSchema.parse(data))
  .handler(previewGoalLifecycleServer)

export const confirmGoalLifecycle = createServerFn({ method: 'POST' })
  .validator((data) => confirmGoalLifecycleSchema.parse(data))
  .handler(confirmGoalLifecycleServer)



