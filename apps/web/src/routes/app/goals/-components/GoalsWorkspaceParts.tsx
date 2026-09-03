import BigNumber from 'bignumber.js'
import { ChevronDown, ChevronRight, CircleCheck, Pause, Pencil, Play } from 'lucide-react'
import { formatCalendarMonth, formatDate, formatMoney, formatPercentage } from '../../../../lib/format'
import type { GoalWorkspaceItem } from '../../../../features/goals/goals'
import { getGoalProjectionDisplay } from './goal-display'
import { SavingContributionActions } from './SavingContributionActions'
import { Button } from '../../../../components/ui/button'

type GoalActionProps = {
  onEditGoal?: (goalId: string) => void
  onChangeGoalLifecycle?: (goalId: string, lifecycle: 'pause' | 'resume') => void
  onCompleteGoal?: (goalId: string) => void
}

function GoalCompletionSummary({ goal }: { goal: GoalWorkspaceItem }) {
  const excessSavings = goal.targetAmount
    ? new BigNumber(goal.savingsValue.amount).minus(goal.targetAmount.amount)
    : new BigNumber(0)
  return (
    <section className="border-b border-[var(--line)] pb-4 sm:col-span-3">
      <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Resumen de cumplimiento</h4>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--sea-ink-soft)]">Fecha de cumplimiento</dt>
          <dd className="mt-1 font-semibold text-[var(--sea-ink)]">{goal.completedAt ? formatDate(goal.completedAt, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Fecha no disponible'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--sea-ink-soft)]">Monto retirado para completar</dt>
          <dd className="mt-1 font-semibold text-[var(--sea-ink)]">{formatMoney(goal.targetAmount ?? goal.actualValue)}</dd>
        </div>
        {goal.completionWithdrawals?.map((withdrawal) => (
          <div key={withdrawal.id}>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Retiro desde {withdrawal.placeName}</dt>
            <dd className="mt-1 font-semibold text-[var(--sea-ink)]">{formatMoney(withdrawal.amount)}</dd>
          </div>
        ))}
        {excessSavings.isGreaterThan(0) && (
          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Excedente ahorrado</dt>
            <dd className="mt-1 font-semibold text-[var(--sea-ink)]">{formatMoney({ amount: excessSavings.toFixed(2), currency: goal.actualValue.currency })}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

function GoalPlan({ goal }: { goal: GoalWorkspaceItem }) {
  const strategyLabel = goal.strategy === 'save' ? 'Ahorrar' : 'Invertir'
  return (
    <section className="sm:col-span-1 sm:pr-5">
      <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Plan</h4>
      {goal.funding.length === 0 ? <p className="py-2 text-sm text-[var(--sea-ink-soft)]">Sin aportes asignados</p> : (
        <div className="divide-y divide-[var(--line)]">
          {goal.funding.map((row, index) => (
            <div key={`${row.effectiveMonth}-${index}`} className="py-3">
              {row.allocatedDestinationAmount ? <>
                <p className="text-sm font-semibold text-[var(--sea-ink)]">{strategyLabel} {formatMoney(row.allocatedDestinationAmount)} por mes</p>
                <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">({Number(row.percentage)}% de tu capacidad mensual)</p>
              </> : <p className="text-sm font-semibold text-[var(--sea-ink)]">Sin aporte mensual</p>}
              <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">Desde {formatCalendarMonth(row.effectiveMonth)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function GoalProgress({ goal }: { goal: GoalWorkspaceItem }) {
  const isCompleted = goal.status === 'completed'
  return (
    <section className="border-t border-[var(--line)] pt-4 sm:col-span-2 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
      <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Tus avances hasta hoy</h4>
      <dl className="grid grid-cols-2 gap-4 py-2">
        <div><dt className="text-xs text-[var(--sea-ink-soft)]">Ahorros</dt><dd className="mt-1 font-semibold text-[var(--sea-ink)]">{formatMoney(goal.savingsValue)}</dd></div>
        <div><dt className="text-xs text-[var(--sea-ink-soft)]">Inversiones</dt><dd className="mt-1 font-semibold text-[var(--sea-ink)]">{formatMoney(goal.investmentValue)}</dd></div>
      </dl>
      <SavingContributionActions goalId={goal.id} contributions={goal.contributions ?? goal.savingContributions ?? []} readOnly={isCompleted} />
    </section>
  )
}

function GoalInlineDetail({ goal }: { goal: GoalWorkspaceItem }) {
  return (
    <div id={`goal-detail-${goal.id}`} role="region" aria-label={`Detalles de ${goal.name}`} className="grid grid-cols-1 gap-5 border-t border-[var(--line)] bg-[var(--foam)]/55 px-4 py-4 sm:grid-cols-3 sm:gap-0 sm:px-5">
      {goal.status === 'completed' && <GoalCompletionSummary goal={goal} />}
      <GoalPlan goal={goal} />
      <GoalProgress goal={goal} />
    </div>
  )
}

function GoalEditButton({ goal, onEditGoal }: { goal: GoalWorkspaceItem; onEditGoal?: GoalActionProps['onEditGoal'] }) {
  if (goal.status === 'completed' || !onEditGoal) return null
  return <Button type="button" variant="ghost" size="sm" aria-label={`Editar objetivo ${goal.name}`} onClick={() => onEditGoal(goal.id)}><Pencil data-icon="inline-start" aria-hidden="true" />Editar objetivo</Button>
}

function GoalLifecycleButton({ goal, onChangeGoalLifecycle }: { goal: GoalWorkspaceItem; onChangeGoalLifecycle?: GoalActionProps['onChangeGoalLifecycle'] }) {
  if (goal.status === 'completed' || !onChangeGoalLifecycle || (goal.status !== 'active' && goal.status !== 'paused')) return null
  const isActive = goal.status === 'active'
  return <Button type="button" variant="ghost" size="sm" aria-label={`${isActive ? 'Pausar' : 'Reanudar'} objetivo ${goal.name}`} onClick={() => onChangeGoalLifecycle(goal.id, isActive ? 'pause' : 'resume')}>{isActive ? <Pause data-icon="inline-start" aria-hidden="true" /> : <Play data-icon="inline-start" aria-hidden="true" />}{isActive ? 'Pausar objetivo' : 'Reanudar objetivo'}</Button>
}

function GoalCompletionButton({ goal, onCompleteGoal }: { goal: GoalWorkspaceItem; onCompleteGoal?: GoalActionProps['onCompleteGoal'] }) {
  if (goal.status !== 'active' || !goal.completionEligible || !onCompleteGoal) return null
  return <Button type="button" variant="ghost" size="sm" aria-label={`Marcar como cumplido ${goal.name}`} onClick={() => onCompleteGoal(goal.id)}><CircleCheck data-icon="inline-start" aria-hidden="true" />Marcar como cumplido</Button>
}

function GoalCardActions({ goal, onEditGoal, onChangeGoalLifecycle, onCompleteGoal }: GoalActionProps & { goal: GoalWorkspaceItem }) {
  return <><GoalEditButton goal={goal} onEditGoal={onEditGoal} /><GoalLifecycleButton goal={goal} onChangeGoalLifecycle={onChangeGoalLifecycle} /><GoalCompletionButton goal={goal} onCompleteGoal={onCompleteGoal} /></>
}

function GoalCardHeader({ goal, actionProps }: { goal: GoalWorkspaceItem; actionProps: GoalActionProps }) {
  const isCompleted = goal.status === 'completed'
  const projectionLabel = isCompleted ? 'Completado' : goal.status === 'paused' ? 'Proyección' : 'Fecha proyectada'
  return (
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 id={`goal-heading-${goal.id}`} className="text-lg font-semibold leading-snug text-[var(--sea-ink)]">{goal.name}</h3>
        <GoalCardActions goal={goal} {...actionProps} />
      </div>
      <p className="text-xs text-[var(--sea-ink-soft)] sm:text-right">
        {isCompleted ? <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lagoon-deep)]/25 bg-[var(--lagoon)]/35 px-2 py-1 text-xs font-semibold text-[var(--lagoon-deep)]"><CircleCheck className="size-3.5" aria-hidden="true" />Objetivo completado</span> : projectionLabel}
        <span className="mt-0.5 block font-semibold text-[var(--sea-ink)]">{getGoalProjectionDisplay(goal)}</span>
      </p>
    </div>
  )
}

function GoalCurrentValue({ goal }: { goal: GoalWorkspaceItem }) {
  const isCompleted = goal.status === 'completed'
  const value = isCompleted && goal.targetAmount ? goal.targetAmount : goal.actualValue
  return <div aria-label={`${isCompleted ? 'Valor cumplido' : 'Valor actual'} de ${goal.name}`}><span className="text-xs text-[var(--sea-ink-soft)]">{isCompleted ? 'Cumplido' : 'Actual'}</span><strong className="mt-0.5 block text-lg text-[var(--sea-ink)]">{formatMoney(value)}</strong></div>
}

function GoalProgressBar({ goal }: { goal: GoalWorkspaceItem }) {
  const isCompleted = goal.status === 'completed'
  if (!isCompleted && (!goal.targetAmount || !goal.progressPercentage)) return <div className="hidden sm:block" />
  const percentage = isCompleted ? 100 : Number(goal.progressPercentage)
  return <div className="col-span-2 order-last sm:col-span-1 sm:order-none"><progress max={100} value={Math.min(percentage, 100)} aria-label={`Progreso de ${goal.name}`} className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--foam)] accent-[var(--lagoon-deep)] [&::-webkit-progress-bar]:bg-[var(--foam)] [&::-webkit-progress-value]:bg-[var(--lagoon-deep)] [&::-moz-progress-bar]:bg-[var(--lagoon-deep)]" /><span className="mt-1 block text-center text-xs font-medium text-[var(--sea-ink-soft)]">{formatPercentage(percentage, 1)}</span></div>
}

function GoalTargetValue({ goal }: { goal: GoalWorkspaceItem }) {
  return <div className="text-right"><span className="text-xs text-[var(--sea-ink-soft)]">Objetivo</span><strong className="mt-0.5 block text-lg text-[var(--sea-ink)]">{goal.targetAmount ? formatMoney(goal.targetAmount) : 'Objetivo por calcular'}</strong></div>
}

function GoalCardMetrics({ goal }: { goal: GoalWorkspaceItem }) {
  return <div className="mt-4 grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,1fr)_minmax(0,1fr)]"><GoalCurrentValue goal={goal} /><GoalProgressBar goal={goal} /><GoalTargetValue goal={goal} /></div>
}

export function GoalCard({ goal, expanded, onToggle, ...actionProps }: { goal: GoalWorkspaceItem; expanded: boolean; onToggle: () => void } & GoalActionProps) {
  return (
    <article aria-labelledby={`goal-heading-${goal.id}`} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-sm transition-shadow motion-reduce:transition-none">
      <div className="p-4 sm:p-5"><GoalCardHeader goal={goal} actionProps={actionProps} /><GoalCardMetrics goal={goal} /></div>
      <button type="button" aria-expanded={expanded} aria-controls={`goal-detail-${goal.id}`} aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalle de ${goal.name}`} onClick={onToggle} className="flex min-h-11 w-full items-center justify-between border-t border-[var(--line)] px-4 text-sm font-semibold text-[var(--lagoon-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lagoon)] sm:px-5"><span>{expanded ? 'Ocultar detalle' : 'Ver detalle'}</span><ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" /></button>
      {expanded && <GoalInlineDetail goal={goal} />}
    </article>
  )
}

function GoalCards({ goals, expandedGoalId, onToggleGoal, actionProps }: { goals: GoalWorkspaceItem[]; expandedGoalId: string | null; onToggleGoal: (goalId: string) => void; actionProps: GoalActionProps }) {
  return <>{goals.map((goal) => <GoalCard key={goal.id} goal={goal} expanded={expandedGoalId === goal.id} onToggle={() => onToggleGoal(goal.id)} {...actionProps} />)}</>
}

export function SecondaryGoalGroup({ status, goals, isOpen, onToggleGroup, expandedGoalId, onToggleGoal, actionProps }: { status: 'paused' | 'completed'; goals: GoalWorkspaceItem[]; isOpen: boolean; onToggleGroup: () => void; expandedGoalId: string | null; onToggleGoal: (goalId: string) => void; actionProps: GoalActionProps }) {
  const title = status === 'paused' ? 'Pausados' : 'Completados'
  const contentId = `group-content-${status}`
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <button type="button" aria-expanded={isOpen} aria-controls={contentId} onClick={onToggleGroup} className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"><span className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{title}</span><span className="text-sm font-medium text-[var(--sea-ink-soft)]">({goals.length})</span><ChevronRight className={`size-5 text-[var(--sea-ink-soft)] transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" /></button>
      {isOpen && <div id={contentId} className="flex flex-col gap-4"><GoalCards goals={goals} expandedGoalId={expandedGoalId} onToggleGoal={onToggleGoal} actionProps={actionProps} /></div>}
    </section>
  )
}
