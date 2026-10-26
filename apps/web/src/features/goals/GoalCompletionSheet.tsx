import { Sheet } from '../../components/ui/sheet'
import { SidePanelContent, SidePanelHeader } from '../../components/norte/SidePanel'
import type { GoalCompletionContext } from './goal-completion'
import { GoalCompletion } from './GoalCompletion'
import { GoalCompletionError, GoalCompletionLoading } from './GoalCompletionSheetParts'
import { useGoalCompletionContext } from './useGoalCompletionContext'

export interface GoalCompletionSheetProps {
  open: boolean
  goalId: string | null
  onOpenChange: (open: boolean) => void
}

function GoalCompletionBody({ context, loading, error, onOpenChange, onContextInvalid }: { context: GoalCompletionContext | null; loading: boolean; error: string | null; onOpenChange: (open: boolean) => void; onContextInvalid: () => Promise<void> }) {
  if (context) {
    return <GoalCompletion context={context} onCancel={() => onOpenChange(false)} onUpdated={() => onOpenChange(false)} onContextInvalid={onContextInvalid} />
  }
  if (loading) return <GoalCompletionLoading />
  if (error) return <GoalCompletionError message={error} />
  return null
}

export function GoalCompletionSheet({ open, goalId, onOpenChange }: GoalCompletionSheetProps) {
  const state = useGoalCompletionContext(open, goalId)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader
          title="Completar objetivo"
          description="Usá los ahorros acumulados para completarlo y revisá cómo cambian las deducciones de tu Plan."
        />
        <GoalCompletionBody {...state} onOpenChange={onOpenChange} onContextInvalid={state.reloadContext} />
      </SidePanelContent>
    </Sheet>
  )
}
