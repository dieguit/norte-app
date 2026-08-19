import '@tanstack/react-start/server-only'
import { requireFinancialUser } from '../financial/auth.server'
import { buildGoalsWorkspace, type GoalsAppState } from './goals'
import { getGoalsWorkspaceRows, mapRowsToGoalsWorkspaceSource } from './goals.repository.server'

export type { GoalsAppState }

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
