import { createServerFn } from '@tanstack/react-start'
import { getGoalsWorkspaceServer } from './goals.server'

export const getGoalsWorkspace = createServerFn({ method: 'GET' }).handler(getGoalsWorkspaceServer)
