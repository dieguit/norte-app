import { createServerFn } from '@tanstack/react-start'
import {
  confirmGoalCreationServer,
  getGoalCreationContextServer,
  getGoalsWorkspaceServer,
  previewGoalCreationServer,
} from './goals.server'
import {
  confirmGoalCreationSchema,
  goalCreationDraftSchema,
} from './goal-creation.schema'

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
