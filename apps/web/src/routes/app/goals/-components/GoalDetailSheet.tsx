import BigNumber from 'bignumber.js'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { GoalWorkspaceItem } from '../../../../features/goals/goals'
import { Money } from '../../../../components/norte/Money'
import { Button } from '../../../../components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../components/ui/sheet'
import { formatDate, formatPercentage } from '../../../../lib/format'
import { shortMoney, shortMonth } from '../../-components/home-view'
import { GOAL_PRIORITY_LABELS, STRATEGY_LABELS, capitalizedMonth, getGoalProjectionDisplay, goalProgress } from './goal-display'
import type { GoalAction } from './GoalsWorkspaceParts'
import { SavingContributionActions } from './SavingContributionActions'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 border-t border-border pt-4">
      <h3 className="m-0 text-overline tracking-[1.2px] text-subtle-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-subtle-foreground">{label}</dt>
      <dd className="m-0 text-[15px] font-semibold text-foreground">{children}</dd>
    </div>
  )
}

function arrival(goal: GoalWorkspaceItem) {
  if (goal.status === 'completed') return goal.completedAt ? capitalizedMonth(goal.completedAt.slice(0, 7)) : 'Fecha no disponible'
  return goal.status === 'active' && goal.projection.status === 'available' ? capitalizedMonth(goal.projection.completionMonth) : getGoalProjectionDisplay(goal)
}

function CompletionSummary({ goal }: { goal: GoalWorkspaceItem }) {
  const surplus = goal.targetAmount ? new BigNumber(goal.savingsValue.amount).minus(goal.targetAmount.amount) : new BigNumber(0)
  return (
    <Section title="Cumplimiento">
      <dl className="m-0 grid grid-cols-2 gap-3">
        <Stat label="Fecha de cumplimiento">
          {goal.completedAt ? formatDate(goal.completedAt, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Fecha no disponible'}
        </Stat>
        <Stat label="Monto retirado para completar">
          <Money value={goal.targetAmount ?? goal.actualValue} decimals={false} />
        </Stat>
        {goal.completionWithdrawals?.map((withdrawal) => (
          <Stat key={withdrawal.id} label={`Retiro desde ${withdrawal.placeName}`}>
            <Money value={withdrawal.amount} decimals={false} />
          </Stat>
        ))}
        {surplus.isGreaterThan(0) && (
          <Stat label="Excedente ahorrado">
            <Money value={{ amount: surplus.toFixed(2), currency: goal.actualValue.currency }} decimals={false} />
          </Stat>
        )}
      </dl>
    </Section>
  )
}

function GoalProgressBar({ progress, name }: { progress?: number; name: string }) {
  if (progress === undefined) return null
  return (
    <div role="progressbar" aria-label={`Progreso de ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(progress, 100)} className="h-1.5 overflow-hidden rounded-[3px] bg-muted">
      <span className="block h-full rounded-[3px] bg-accent-brand" style={{ width: `${Math.min(progress, 100)}%` }} />
    </div>
  )
}

function SummarySection({ goal, completed, progress }: { goal: GoalWorkspaceItem; completed: boolean; progress?: number }) {
  const displayAmount = completed && goal.targetAmount ? goal.targetAmount : goal.actualValue
  const desired = goal.desiredDate ? capitalizedMonth(goal.desiredDate.slice(0, 7)) : '—'
  return (
    <section aria-label="Resumen" className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="m-0 text-caption text-muted-foreground">
            <strong className="font-bold text-foreground">{completed ? 'Cumplido' : 'Hoy'}</strong>
            {!completed && goal.targetAmount && ` de ${shortMoney(goal.targetAmount)}`}
          </p>
          <Money value={displayAmount} size="title" decimals={false} />
        </div>
        {progress !== undefined && <span className="text-[16px] font-semibold text-muted-foreground tabular-nums">{formatPercentage(progress, 0)}</span>}
      </div>
      <GoalProgressBar progress={progress} name={goal.name} />
      <dl className="m-0 grid grid-cols-2 gap-3 pt-1">
        <Stat label={completed ? 'Completado' : 'Llega'}>{arrival(goal)}</Stat>
        <Stat label="Deseado">{desired}</Stat>
      </dl>
    </section>
  )
}

function PlanSection({ goal, completed, onClose, onChangePlanning }: { goal: GoalWorkspaceItem; completed: boolean; onClose: () => void; onChangePlanning?: () => void }) {
  if (goal.funding.length === 0) {
    return (
      <Section title="Plan">
        <p className="m-0 text-body-sm text-muted-foreground">Sin aportes asignados</p>
      </Section>
    )
  }
  return (
    <Section title="Plan">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {goal.funding.map((row, index) => (
          <li key={`${row.effectiveMonth}-${index}`} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-foreground">
                {row.allocatedDestinationAmount ? `≈ ${shortMoney(row.allocatedDestinationAmount)} por mes` : 'Sin aporte mensual'}
              </span>
              <span className="text-caption text-muted-foreground">
                {formatPercentage(row.percentage, 0)} de tu aporte mensual · desde {shortMonth(row.effectiveMonth.slice(0, 7))}
              </span>
            </div>
            {index === 0 && !completed && onChangePlanning && (
              <button
                type="button"
                aria-label={`Cambiar plan de ${goal.name}`}
                onClick={() => { onClose(); onChangePlanning() }}
                className="flex min-h-11 shrink-0 items-center rounded-sm text-body-sm font-semibold text-accent-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                Cambiar
              </button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

function GoalDetail({ goal, actions, onClose, onChangePlanning }: { goal: GoalWorkspaceItem; actions: GoalAction[]; onClose: () => void; onChangePlanning?: () => void }) {
  const completed = goal.status === 'completed'
  const progress = goalProgress(goal)
  const contributions = goal.contributions ?? goal.savingContributions ?? []
  return (
    <>
      <span aria-hidden="true" className="mx-auto h-1 w-9 shrink-0 rounded-xs bg-border" />
      <SheetHeader className="flex-row items-start gap-2.5 p-0">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SheetTitle className="font-serif text-[24px] font-semibold tracking-[-0.3px] text-foreground">{goal.name}</SheetTitle>
          <SheetDescription className="text-body-sm text-muted-foreground">
            {STRATEGY_LABELS[goal.strategy]} · {goal.currency} · {GOAL_PRIORITY_LABELS[goal.priority]}
          </SheetDescription>
        </div>
        <SheetClose
          render={
            <button type="button" aria-label="Cerrar" className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground after:absolute after:-inset-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring" />
          }
        >
          <X className="size-[18px]" aria-hidden="true" />
        </SheetClose>
      </SheetHeader>

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(({ label, short, icon: Icon, run }) => (
            <Button key={label} type="button" variant="outline" aria-label={label} onClick={() => { onClose(); run() }} className="relative h-10 flex-1 gap-1.5 rounded-md px-2.5 text-[13px] font-semibold after:absolute after:-inset-1">
              <Icon className="size-4" aria-hidden="true" />
              {short ?? label}
            </Button>
          ))}
        </div>
      )}

      <SummarySection goal={goal} completed={completed} progress={progress} />

      {completed && <CompletionSummary goal={goal} />}

      <PlanSection goal={goal} completed={completed} onClose={onClose} onChangePlanning={onChangePlanning} />

      <Section title="Avances">
        <dl className="m-0 grid grid-cols-2 gap-3">
          <Stat label="Ahorros"><Money value={goal.savingsValue} decimals={false} /></Stat>
          <Stat label="Inversiones"><Money value={goal.investmentValue} decimals={false} /></Stat>
        </dl>
      </Section>

      {contributions.length > 0 && (
        <Section title="Historial de aportes">
          <SavingContributionActions goalId={goal.id} contributions={contributions} readOnly={completed} />
        </Section>
      )}
    </>
  )
}

export function GoalDetailSheet({ goal, actions, onClose, onChangePlanning }: { goal: GoalWorkspaceItem | null; actions: GoalAction[]; onClose: () => void; onChangePlanning?: () => void }) {
  return (
    <Sheet open={goal !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[90dvh] gap-5 overflow-y-auto rounded-t-[20px] border-0 bg-background px-5 pt-2.5 pb-6 shadow-float md:mx-auto md:max-w-2xl"
      >
        {goal && <GoalDetail goal={goal} actions={actions} onClose={onClose} onChangePlanning={onChangePlanning} />}
      </SheetContent>
    </Sheet>
  )
}
