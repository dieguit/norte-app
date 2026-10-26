import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, CircleCheck, EllipsisVertical, PanelBottomOpen, Pause, Pencil, Play, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import type { GoalWorkspaceItem, GoalsFinancialSummary } from '../../../../features/goals/goals'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover'
import { formatPercentage } from '../../../../lib/format'
import { cn } from '../../../../lib/utils'
import { shortMoney } from '../../-components/home-view'
import { capitalizedMonth, goalProgress, goalRowMeta, isDated, planFunding, type PlanShare } from './goal-display'

export type GoalActionProps = {
  onEditGoal?: (goalId: string) => void
  onChangeGoalLifecycle?: (goalId: string, lifecycle: 'pause' | 'resume') => void
  onCompleteGoal?: (goalId: string) => void
}

export type GoalAction = { label: string; short?: string; icon: LucideIcon; stay?: boolean; run: () => void }

export function goalActions(goal: GoalWorkspaceItem, { onEditGoal, onChangeGoalLifecycle, onCompleteGoal }: GoalActionProps): GoalAction[] {
  if (goal.status === 'completed') return []
  const active = goal.status === 'active'
  const actions: GoalAction[] = []
  if (onEditGoal) actions.push({ label: 'Editar', icon: Pencil, stay: true, run: () => onEditGoal(goal.id) })
  if (onChangeGoalLifecycle) {
    actions.push({ label: active ? 'Pausar' : 'Reanudar', icon: active ? Pause : Play, run: () => onChangeGoalLifecycle(goal.id, active ? 'pause' : 'resume') })
  }
  if (active && goal.completionEligible && onCompleteGoal) {
    actions.push({ label: 'Marcar como cumplido', short: 'Cumplido', icon: CircleCheck, run: () => onCompleteGoal(goal.id) })
  }
  return actions
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring'
const LINK = `relative flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-body-sm font-semibold text-accent-brand disabled:opacity-50 ${FOCUS}`

export function MenuItem({ icon: Icon, label, destructive = false, className, ...props }: { icon: LucideIcon; label: string; destructive?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn('flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[14px] text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none motion-reduce:transition-none', destructive && 'text-destructive', className)}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  )
}

export function PlanCard({ summary, shares, onChangePlanning }: { summary: GoalsFinancialSummary; shares: PlanShare[]; onChangePlanning?: () => void }) {
  return (
    <section aria-label="Tu plan mensual" className="flex flex-col gap-3 rounded-lg bg-secondary p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-sm text-muted-foreground">Tu plan mensual</span>
          <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[24px] font-semibold tracking-[-0.5px] text-foreground tabular-nums">{formatPercentage(summary.dedicationPercentage, 0)}</span>
            <span className="text-body-sm text-muted-foreground">de tu saldo · ≈ {shortMoney(summary.contribution)}</span>
          </p>
        </div>
        <button type="button" aria-label="Cambiar planificación de objetivos" disabled={Number(summary.balance.amount) <= 0} onClick={onChangePlanning} className={`-my-1.5 ${LINK}`}>
          Cambiar
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {shares.length > 0 && (
        <>
          <div aria-hidden="true" className="flex h-2.5 gap-0.5">
            {shares.map((share) => (
              <span key={share.goal.id} className="rounded-xs" style={{ flex: `${share.percentage} 1 0`, background: share.color }} />
            ))}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {shares.map((share) => (
              <li key={share.goal.id} className="flex items-center gap-2 text-body-sm">
                <span className="size-2 shrink-0 rounded-xs" style={{ background: share.color }} />
                <span className="min-w-0 flex-1 truncate text-foreground">{share.goal.name}</span>
                <span className="w-10 shrink-0 font-semibold text-foreground tabular-nums">{formatPercentage(share.percentage, 0)}</span>
                <span className="w-26 shrink-0 text-right text-muted-foreground tabular-nums">{share.monthly ? `${shortMoney(share.monthly)}/mes` : ''}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function GoalMenu({ goal, onDetail, ...actionProps }: { goal: GoalWorkspaceItem; onDetail: () => void } & GoalActionProps) {
  const [open, setOpen] = useState(false)
  const items = [{ label: 'Ver detalle', icon: PanelBottomOpen, run: onDetail }, ...goalActions(goal, actionProps)]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Más acciones de ${goal.name}`}
            className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1 hover:bg-muted data-[popup-open]:bg-muted motion-reduce:transition-none ${FOCUS}`}
          />
        }
      >
        <EllipsisVertical className="size-[18px]" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-55 flex-col gap-0 rounded-lg border-border p-1.5 shadow-float">
        {items.map(({ label, icon, run }) => (
          <MenuItem key={label} icon={icon} label={label} onClick={() => { setOpen(false); run() }} />
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function GoalRow({ goal, color, month, actions, onAssign, onDetail }: { goal: GoalWorkspaceItem; color?: string; month: string; actions: ReactNode; onAssign?: () => void; onDetail: () => void }) {
  const dated = isDated(goal)
  const progress = goalProgress(goal)
  const unfunded = Number(planFunding(goal, month)?.percentage ?? 0) === 0
  const showToday = goal.status !== 'completed' && (dated || Number(goal.actualValue.amount) > 0)
  return (
    <li className="relative isolate flex flex-col gap-2 border-t border-border py-3.5">
      <button type="button" aria-label={`Ver detalle de ${goal.name}`} onClick={onDetail} className={`absolute inset-0 z-0 min-h-11 w-full rounded-sm ${FOCUS}`} />
      <div className={cn('flex gap-2.5', dated ? 'items-start' : 'items-center')}>
        <span
          aria-hidden="true"
          className={cn('size-2.5 shrink-0 rounded-[3px]', dated ? 'mt-3.5' : 'border border-subtle-foreground bg-background')}
          style={dated && color ? { background: color } : undefined}
        />
        <div className={cn('flex min-w-0 flex-1 flex-col gap-0.5', dated && 'pt-2')}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="m-0 truncate text-heading text-foreground">{goal.name}</h3>
            {dated && goal.projection.status === 'available' && (
              <span className="shrink-0 text-[14px] font-semibold text-foreground">{capitalizedMonth(goal.projection.completionMonth)}</span>
            )}
          </div>
          <p className="m-0 text-caption text-muted-foreground">{goalRowMeta(goal, month)}</p>
        </div>
        {!dated && goal.status === 'active' && unfunded && onAssign && (
          <button type="button" aria-label={`Asignar aportes a ${goal.name}`} onClick={onAssign} className={`z-10 ${LINK}`}>
            Asignar
          </button>
        )}
        {actions}
      </div>
      {progress !== undefined && (
        <div className="flex items-center gap-2.5 pr-[46px] pl-5">
          <div
            role="progressbar"
            aria-label={`Progreso de ${goal.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(progress, 100)}
            className="h-1 flex-1 overflow-hidden rounded-xs bg-muted"
          >
            <span className="block h-full rounded-xs bg-accent-brand" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <span className="shrink-0 text-caption font-semibold text-muted-foreground tabular-nums">{formatPercentage(progress, 0)}</span>
        </div>
      )}
      {showToday && (
        <p className="m-0 pl-5 text-caption text-muted-foreground">
          <strong className="font-bold text-foreground">Hoy</strong>{' '}
          {goal.targetAmount ? `${shortMoney(goal.actualValue)} de ${shortMoney(goal.targetAmount)}` : shortMoney(goal.actualValue)}
        </p>
      )}
    </li>
  )
}

export function GoalGroup({ status, count, open, onToggle, children }: { status: 'paused' | 'completed'; count: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  const title = status === 'paused' ? 'Pausados' : 'Completados'
  const contentId = `group-content-${status}`
  return (
    <section aria-label={title}>
      <button type="button" aria-expanded={open} aria-controls={contentId} onClick={onToggle} className={`flex h-12 w-full items-center gap-2 border-t border-border text-left ${FOCUS}`}>
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
        <span className="rounded-full bg-muted px-[7px] py-px text-[11px] font-semibold text-muted-foreground tabular-nums">{count}</span>
        <ChevronDown className={cn('ml-auto size-[18px] text-subtle-foreground transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <ul id={contentId} className="m-0 list-none p-0">{children}</ul>}
    </section>
  )
}
