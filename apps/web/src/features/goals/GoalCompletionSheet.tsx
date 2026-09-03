import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet'
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
      <SheetContent side="right" className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]">
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">Completar objetivo</SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">Usá los ahorros acumulados para completarlo y revisá cómo cambian las deducciones de tu Plan.</SheetDescription>
        </SheetHeader>
        <GoalCompletionBody {...state} onOpenChange={onOpenChange} onContextInvalid={state.reloadContext} />
      </SheetContent>
    </Sheet>
  )
}
