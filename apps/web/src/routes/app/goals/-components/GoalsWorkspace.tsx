import { useState } from "react";
import BigNumber from "bignumber.js";
import { ChevronDown, ChevronRight, CircleCheck, Pause, Pencil, Play } from "lucide-react";
import {
  formatCalendarMonth,
  formatDate,
  formatMoney,
  formatPercentage,
} from "../../../../lib/format";
import {
  type GoalsWorkspace as GoalsWorkspaceType,
  type GoalWorkspaceItem,
} from "../../../../features/goals/goals";
import { getGoalProjectionDisplay } from "./goal-display";
import { SavingContributionActions } from "./SavingContributionActions";
import { FinancialSummaryCards } from "../../../../components/FinancialSummaryCards";

import { Button } from "../../../../components/ui/button";

export interface GoalsWorkspaceProps {
  workspace: GoalsWorkspaceType;
  onNewGoal?: () => void;
  onChangePlanning?: () => void;
  onEditGoal?: (goalId: string) => void;
  onChangeGoalLifecycle?: (
    goalId: string,
    lifecycle: "pause" | "resume",
  ) => void;
  onCompleteGoal?: (goalId: string) => void;
}

interface GoalCardProps {
  goal: GoalWorkspaceItem;
  expanded: boolean;
  onToggle: () => void;
  onEditGoal?: (goalId: string) => void;
  onChangeGoalLifecycle?: (
    goalId: string,
    lifecycle: "pause" | "resume",
  ) => void;
  onCompleteGoal?: (goalId: string) => void;
}

function GoalInlineDetail({ goal }: { goal: GoalWorkspaceItem }) {
  const isCompleted = goal.status === "completed";
  const excessSavings = goal.targetAmount
    ? new BigNumber(goal.savingsValue.amount).minus(goal.targetAmount.amount)
    : new BigNumber(0);

  return (
    <div
      id={`goal-detail-${goal.id}`}
      role="region"
      aria-label={`Detalles de ${goal.name}`}
      className="grid grid-cols-1 gap-5 border-t border-[var(--line)] bg-[var(--foam)]/55 px-4 py-4 sm:grid-cols-3 sm:gap-0 sm:px-5"
    >
      {isCompleted && (
        <section className="border-b border-[var(--line)] pb-4 sm:col-span-3">
          <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Resumen de cumplimiento</h4>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--sea-ink-soft)]">Fecha de cumplimiento</dt>
              <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
                {goal.completedAt
                  ? formatDate(goal.completedAt, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
                  : "Fecha no disponible"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--sea-ink-soft)]">Monto retirado para completar</dt>
              <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
                {formatMoney(goal.targetAmount ?? goal.actualValue)}
              </dd>
            </div>
            {goal.completionWithdrawals?.map((withdrawal) => (
              <div key={withdrawal.id}>
                <dt className="text-xs text-[var(--sea-ink-soft)]">Retiro desde {withdrawal.placeName}</dt>
                <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
                  {formatMoney(withdrawal.amount)}
                </dd>
              </div>
            ))}
            {excessSavings.isGreaterThan(0) && (
              <div>
                <dt className="text-xs text-[var(--sea-ink-soft)]">Excedente ahorrado</dt>
                <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
                  {formatMoney({ amount: excessSavings.toFixed(2), currency: goal.actualValue.currency })}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="sm:col-span-1 sm:pr-5">
        <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Plan</h4>
        {goal.funding.length === 0 ? (
          <p className="py-2 text-sm text-[var(--sea-ink-soft)]">
            Sin aportes asignados
          </p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {goal.funding.map((row, index) => {
              const strategyLabel =
                goal.strategy === "save" ? "Ahorrar" : "Invertir";
              return (
                <div key={`${row.effectiveMonth}-${index}`} className="py-3">
                  {row.allocatedDestinationAmount ? (
                    <>
                      <p className="text-sm font-semibold text-[var(--sea-ink)]">
                        {strategyLabel}{" "}
                        {formatMoney(row.allocatedDestinationAmount)} por mes
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">
                        ({Number(row.percentage)}% de tu capacidad mensual)
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-[var(--sea-ink)]">
                      Sin aporte mensual
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">
                    Desde {formatCalendarMonth(row.effectiveMonth)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-[var(--line)] pt-4 sm:col-span-2 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <h4 className="text-sm font-semibold text-[var(--sea-ink)]">
          Tus avances hasta hoy
        </h4>
        <dl className="grid grid-cols-2 gap-4 py-2">
          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Ahorros</dt>
            <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
              {formatMoney(goal.savingsValue)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Inversiones</dt>
            <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
              {formatMoney(goal.investmentValue)}
            </dd>
          </div>
        </dl>
        <SavingContributionActions
          goalId={goal.id}
          contributions={goal.contributions ?? goal.savingContributions ?? []}
          readOnly={isCompleted}
        />
      </section>
    </div>
  );
}

function GoalCard({
  goal,
  expanded,
  onToggle,
  onEditGoal,
  onChangeGoalLifecycle,
  onCompleteGoal,
}: GoalCardProps) {
  const isCompleted = goal.status === "completed";
  const projectionText = getGoalProjectionDisplay(goal);
  const projectionLabel =
    goal.status === "completed"
      ? "Completado"
      : goal.status === "paused"
        ? "Proyección"
        : "Fecha proyectada";

  return (
    <article
      aria-labelledby={`goal-heading-${goal.id}`}
      className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-sm transition-shadow motion-reduce:transition-none"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3
              id={`goal-heading-${goal.id}`}
              className="text-lg font-semibold leading-snug text-[var(--sea-ink)]"
            >
              {goal.name}
            </h3>
            {!isCompleted && onEditGoal && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Editar objetivo ${goal.name}`}
                onClick={() => onEditGoal(goal.id)}
              >
                <Pencil data-icon="inline-start" aria-hidden="true" />
                Editar objetivo
              </Button>
            )}
            {!isCompleted && onChangeGoalLifecycle &&
              (goal.status === "active" || goal.status === "paused") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${goal.status === "active" ? "Pausar" : "Reanudar"} objetivo ${goal.name}`}
                  onClick={() =>
                    onChangeGoalLifecycle(
                      goal.id,
                      goal.status === "active" ? "pause" : "resume",
                    )
                  }
                >
                  {goal.status === "active" ? (
                    <Pause data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <Play data-icon="inline-start" aria-hidden="true" />
                  )}
                  {goal.status === "active"
                    ? "Pausar objetivo"
                    : "Reanudar objetivo"}
                </Button>
              )}
            {!isCompleted && onCompleteGoal && goal.status === "active" && goal.completionEligible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Marcar como cumplido ${goal.name}`}
                onClick={() => onCompleteGoal(goal.id)}
              >
                <CircleCheck data-icon="inline-start" aria-hidden="true" />
                Marcar como cumplido
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--sea-ink-soft)] sm:text-right">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lagoon-deep)]/25 bg-[var(--lagoon)]/35 px-2 py-1 text-xs font-semibold text-[var(--lagoon-deep)]">
                <CircleCheck className="size-3.5" aria-hidden="true" />
                Objetivo completado
              </span>
            ) : (
              projectionLabel
            )}
            <span className="mt-0.5 block font-semibold text-[var(--sea-ink)]">
              {projectionText}
            </span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,1fr)_minmax(0,1fr)]">
          <div aria-label={`${isCompleted ? "Valor cumplido" : "Valor actual"} de ${goal.name}`}>
            <span className="text-xs text-[var(--sea-ink-soft)]">{isCompleted ? "Cumplido" : "Actual"}</span>
            <strong className="mt-0.5 block text-lg text-[var(--sea-ink)]">
              {formatMoney(isCompleted && goal.targetAmount ? goal.targetAmount : goal.actualValue)}
            </strong>
          </div>
          {isCompleted || (goal.targetAmount && goal.progressPercentage) ? (
            <div className="col-span-2 order-last sm:col-span-1 sm:order-none">
              <progress
                max={100}
                value={isCompleted ? 100 : Math.min(Number(goal.progressPercentage), 100)}
                aria-label={`Progreso de ${goal.name}`}
                className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--foam)] accent-[var(--lagoon-deep)] [&::-webkit-progress-bar]:bg-[var(--foam)] [&::-webkit-progress-value]:bg-[var(--lagoon-deep)] [&::-moz-progress-bar]:bg-[var(--lagoon-deep)]"
              />
              <span className="mt-1 block text-center text-xs font-medium text-[var(--sea-ink-soft)]">
                {formatPercentage(isCompleted ? 100 : goal.progressPercentage!, 1)}
              </span>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
          <div className="text-right">
            <span className="text-xs text-[var(--sea-ink-soft)]">Objetivo</span>
            <strong className="mt-0.5 block text-lg text-[var(--sea-ink)]">
              {goal.targetAmount
                ? formatMoney(goal.targetAmount)
                : "Objetivo por calcular"}
            </strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`goal-detail-${goal.id}`}
        aria-label={`${expanded ? "Ocultar" : "Ver"} detalle de ${goal.name}`}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between border-t border-[var(--line)] px-4 text-sm font-semibold text-[var(--lagoon-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lagoon)] sm:px-5"
      >
        <span>{expanded ? "Ocultar detalle" : "Ver detalle"}</span>
        <ChevronDown
          className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && <GoalInlineDetail goal={goal} />}
    </article>
  );
}

export function GoalsWorkspace({
  workspace,
  onNewGoal,
  onChangePlanning,
  onEditGoal,
  onChangeGoalLifecycle,
  onCompleteGoal,
}: GoalsWorkspaceProps) {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<
    Partial<Record<"paused" | "completed", boolean>>
  >({});

  const activeGoals =
    workspace.groups.find((group) => group.status === "active")?.goals ?? [];
  const secondaryGroups = workspace.groups.filter(
    (group): group is typeof group & { status: "paused" | "completed" } =>
      (group.status === "paused" || group.status === "completed") &&
      group.goals.length > 0,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
            Objetivos
          </h1>
          <p className="mt-2 text-base leading-relaxed text-[var(--sea-ink-soft)]">
            Administrá tus metas financieras y su asignación mensual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Button
            type="button"
            id="new-goal-trigger"
            onClick={onNewGoal}
            className="self-start sm:self-auto"
          >
            Nuevo objetivo
          </Button>
        </div>
      </div>

      {activeGoals.length > 0 && (
        <FinancialSummaryCards
          mode="goals"
          summary={workspace.financialSummary}
          onChangePlanning={onChangePlanning}
        />
      )}

      <div className="flex flex-col gap-7">
        {activeGoals.length > 0 && (
          <div className="flex flex-col gap-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                expanded={expandedGoalId === goal.id}
                onToggle={() => {
                  setExpandedGoalId((current) =>
                    current === goal.id ? null : goal.id,
                  );
                }}
                onEditGoal={onEditGoal}
                onChangeGoalLifecycle={onChangeGoalLifecycle}
                onCompleteGoal={onCompleteGoal}
              />
            ))}
          </div>
        )}

        {secondaryGroups.map((group) => {
          const groupTitle =
            group.status === "paused" ? "Pausados" : "Completados";
          const isOpen = Boolean(openGroups[group.status]);
          const contentId = `group-content-${group.status}`;

          return (
            <section
              key={group.status}
              aria-label={groupTitle}
              className="flex flex-col gap-3"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => {
                  setOpenGroups((current) => ({
                    ...current,
                    [group.status]: !current[group.status],
                  }));
                }}
                className="inline-flex w-fit items-center gap-2 py-2 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] cursor-pointer"
              >
                <span className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
                  {groupTitle}
                </span>
                <span className="text-sm font-medium text-[var(--sea-ink-soft)]">
                  ({group.goals.length})
                </span>
                <ChevronRight
                  className={`size-5 text-[var(--sea-ink-soft)] transition-transform motion-reduce:transition-none ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div id={contentId} className="flex flex-col gap-4">
                  {group.goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      expanded={expandedGoalId === goal.id}
                      onToggle={() => {
                        setExpandedGoalId((current) =>
                          current === goal.id ? null : goal.id,
                        );
                      }}
                      onEditGoal={onEditGoal}
                      onChangeGoalLifecycle={onChangeGoalLifecycle}
                      onCompleteGoal={onCompleteGoal}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
