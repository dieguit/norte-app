import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { and, eq, inArray } from 'drizzle-orm';
import { AllocationChangeContextStateSchema, AllocationChangeConfirmationSchema, AllocationChangePreviewSchema, GoalLifecycleConfirmationSchema, GoalLifecyclePreviewSchema, GoalsWorkspaceSchema, type GoalsWorkspace } from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import {
  allocationPlanEntries, allocationPlanSnapshots, expenses, financialGoals, financialProfiles,
  goalCompletionWithdrawals, goalInvestmentPositions, goalSavingsPositions, incomes,
  investmentContributionAllocations, savingContributionAllocations,
  savingsPlaces,
} from '../profile/profile.schema';
import { findUserContributions } from '../contributions/contribution-queries';
import { buildCurrentGoalsPlanWorkspace, buildGoalsWorkspace, type GoalsWorkspaceSource } from '../finances/goals.engine';
import { mapRowsToGoalsWorkspaceSource } from './goals.source';
import { createMoney } from '@repo/finance-utils';
import { buildGoalCreationProposal, selectGoalPlanSnapshot, type GoalCreationState } from './goal-creation';
import { buildGoalLifecycleContext, buildGoalLifecycleProposal } from './goal-lifecycle';
import { confirmGoalLifecycleSchema, goalLifecyclePreviewSchema, type GoalLifecycle } from './goal-lifecycle.schema';
import { parseGoalCreationSubmission, type GoalCreationDraft } from '@repo/shared-types';
import { confirmAllocationChangeInRepository, confirmGoalCreationInRepository, confirmGoalEditInRepository, confirmGoalLifecycleInRepository, createAllocationChangePreviewToken, createGoalCreationPreviewToken, createGoalEditPreviewToken, createGoalLifecyclePreviewToken, getGoalCreationState, getGoalEditState, getGoalLifecycleState, StaleAllocationChangePreviewError, StaleGoalCreationPreviewError, StaleGoalEditPreviewError, StaleGoalLifecyclePreviewError } from './goal-creation.repository';
import { GoalCreationContextStateSchema, GoalCreationPreviewSchema, GoalCreationConfirmationSchema, GoalEditConfirmationSchema, GoalPlanContextStateSchema, type GoalCreationContextState } from '@repo/shared-types';
import { ZodError, type ZodType } from 'zod';
import { buildAllocationChangeProposal } from './allocation-change';
import { allocationChangeDraftSchema, confirmAllocationChangeSchema, type AllocationChangeDraft } from './allocation-change.schema';
import { GoalCompletionConfirmationSchema, GoalCompletionContextStateSchema, GoalCompletionPreviewSchema } from '@repo/shared-types';
import { buildGoalCompletionContext, buildGoalCompletionProposal, type GoalCompletionDraft } from './goal-completion';
import { confirmGoalCompletionSchema, goalCompletionPreviewSchema } from './goal-completion.schema';
import { confirmGoalCompletionInRepository, createGoalCompletionPreviewToken, getGoalCompletionState, GoalCompletionStateInvalidError, StaleGoalCompletionPreviewError } from './goal-creation.repository';

const LIFECYCLE_DOMAIN_ERRORS = new Set([
  'Goal not found.', 'Only active goals can be paused.', 'Only paused goals can be resumed.',
  'Financial profile not found.', 'Allocation draft must contain exactly the active goals',
]);

const COMPLETION_DOMAIN_ERRORS = new Set([
  'Objetivo no encontrado.', 'El objetivo no está listo para completarse.', 'Lugar de ahorro no encontrado.',
  'La moneda del lugar no coincide con la del objetivo.', 'Los montos deben sumar exactamente el objetivo.',
  'Cada lugar de ahorro puede aparecer una sola vez.', 'Ingresá un monto mayor a cero, con hasta dos decimales.',
  'Financial profile not found.', 'Allocation draft must contain exactly the active goals',
  'Goal not found.', 'Only active goals can be paused.',
]);

const monthNow = () => new Date().toISOString().slice(0, 7);
const iso = (date: Date | string | null | undefined) => date == null ? date : date instanceof Date ? date.toISOString() : String(date);
const pick = <T extends object>(value: T, keys: readonly (keyof T)[]) => Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));

function projectGoalPreview<T extends { proposal: { proposedSource: GoalCreationState['source'] } }>(preview: T): T {
  const source = preview.proposal.proposedSource;
  return {
    ...preview,
    proposal: {
      ...preview.proposal,
      proposedSource: {
        profile: source.profile && pick(source.profile, ['userId', 'baseCurrency', 'expensesKnowledge', 'plannedMonthlyContribution', 'goalDedicationPercentage', 'onboardingCompleted']),
        goals: source.goals.map((row) => pick(row, ['id', 'userId', 'name', 'type', 'targetAmount', 'currency', 'priority', 'strategy', 'status', 'desiredDate', 'completedAt', 'emergencyFundMonths', 'createdAt'])),
        savingsPositions: source.savingsPositions.map((row) => pick(row, ['id', 'goalId', 'amount', 'currency', 'location'])),
        investmentPositions: source.investmentPositions.map((row) => pick(row, ['id', 'goalId', 'currentValue', 'currency', 'annualReturnRate', 'availability', 'availableFrom'])),
        snapshots: source.snapshots.map((row) => pick(row, ['id', 'userId', 'effectiveMonth'])),
        allocations: source.allocations.map((row) => pick(row, ['id', 'snapshotId', 'goalId', 'percentage'])),
        ...(source.contributions && { contributions: source.contributions.map((row) => pick(row, ['id', 'kind', 'userId', 'amount', 'currency', 'placeId', 'placeName', 'arsSpent', 'effectiveRate', 'createdAt', 'allocations'])) }),
        ...(source.savingContributions && { savingContributions: source.savingContributions.map((row) => pick(row, ['id', 'kind', 'userId', 'amount', 'currency', 'placeId', 'placeName', 'arsSpent', 'effectiveRate', 'createdAt', 'allocations'])) }),
        ...(source.incomes && { incomes: source.incomes.map((row) => pick(row, ['id', 'sourceKind', 'sourceId', 'sourceName', 'concept', 'amount', 'currency', 'recurring', 'effectiveMonth'])) }),
        ...(source.expenses && { expenses: source.expenses.map((row) => pick(row, ['id', 'sourceKind', 'sourceId', 'sourceName', 'concept', 'amount', 'currency', 'recurring', 'effectiveMonth', 'endMonth'])) }),
        ...(source.completionWithdrawals && { completionWithdrawals: source.completionWithdrawals.map((row) => pick(row, ['id', 'goalId', 'placeId', 'placeName', 'amount', 'currency', 'createdAt'])) }),
      },
    },
  } as T;
}

export { mapRowsToGoalsWorkspaceSource } from './goals.source';

export function selectWorkspaceSnapshots<T extends { id: string; effectiveMonth: string }>(snapshots: T[], month: string) {
  const eligible = snapshots.filter((row) => row.effectiveMonth.slice(0, 7) <= month).sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
  const current = eligible[0] ? [eligible[0]] : [...snapshots].sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth)).slice(0, 1);
  const next = new Date(`${month}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const nextMonth = next.toISOString().slice(0, 7);
  return [...current, ...snapshots.filter((row) => row.effectiveMonth.slice(0, 7) === nextMonth && !current.some((selected) => selected.id === row.id))];
}

@Injectable()
export class GoalsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private currentMonth() { return monthNow(); }

  async getCreationContext(userId: string): Promise<GoalCreationContextState> {
    const currentMonth = this.currentMonth();
    const state = await getGoalCreationState(this.db, userId, currentMonth);
    if (!state) return GoalCreationContextStateSchema.parse({ profile: 'missing' });
    return GoalCreationContextStateSchema.parse({ profile: 'present', context: this.mapCreationContext(state, currentMonth) }) as GoalCreationContextState;
  }

  async getPlanContext(userId: string, goalId?: string) {
    const currentMonth = this.currentMonth();
    try {
      const state = goalId
        ? await getGoalEditState(this.db, userId, currentMonth, goalId)
        : await getGoalCreationState(this.db, userId, currentMonth);
      if (!state) return GoalPlanContextStateSchema.parse({ profile: 'missing' });
      const activeGoals = state.source.goals.filter((candidate) => candidate.status === 'active');
      const { allocations } = selectGoalPlanSnapshot(state.source, state.pendingSnapshots, state.pendingAllocations, currentMonth);
      const selected = allocations.filter((entry) => activeGoals.some((active) => active.id === entry.goalId))
        .map(({ goalId: id, percentage }) => ({ goalId: id, percentage: new BigNumber(percentage).toFixed(2) }));
      const selectedIds = new Set(selected.map(({ goalId: id }) => id));
      const fallbackPercentage = allocations.length === 0 && activeGoals.length === 1 ? '100.00' : '0.00';
      const editContext = goalId ? (() => {
        const goal = state.source.goals.find((candidate) => candidate.id === goalId)!;
        const investment = state.source.investmentPositions.find((position) => position.goalId === goalId);
        return {
          goalId, status: goal.status,
          draft: {
            type: goal.type, name: goal.name, targetAmount: goal.targetAmount ?? '', currency: goal.currency,
            desiredMonth: goal.desiredDate?.slice(0, 7) ?? '', priority: goal.priority, strategy: goal.strategy,
            annualReturnRate: investment?.annualReturnRate || '8', availability: investment?.availability || 'available_now',
            availableFromMonth: investment?.availableFrom?.slice(0, 7) ?? '',
            allocations: [...selected, ...activeGoals.filter((active) => !selectedIds.has(active.id)).map((active) => ({ goalId: active.id, percentage: fallbackPercentage }))],
          },
        };
      })() : undefined;
      return GoalPlanContextStateSchema.parse({
        profile: 'present', context: this.mapCreationContext(state, currentMonth),
        ...(editContext ? { editContext } : {}), allocationContext: this.mapAllocationContext(state, currentMonth),
      });
    } catch (error) { this.rethrowEditError(error); }
  }

  private mapAllocationContext(state: GoalCreationState, currentMonth: string) {
    const workspace = buildCurrentGoalsPlanWorkspace(state, currentMonth);
    const workspaceGoals = workspace.groups.flatMap((group) => group.goals);
    const snapshot = (item: GoalCreationState['source']['snapshots'][number] | undefined, entries: GoalCreationState['source']['allocations']) => item && ({
      effectiveMonth: item.effectiveMonth,
      entries: entries.filter((entry) => entry.snapshotId === item.id).map(({ goalId, percentage }) => ({ goalId, percentage })),
    });
    return {
      currentMonth, financialSummary: workspace.financialSummary,
      ...(state.source.profile?.plannedMonthlyContribution != null ? { plannedMonthlyContribution: createMoney(state.source.profile.plannedMonthlyContribution, state.source.profile.baseCurrency ?? 'ARS') } : {}),
      activeGoals: state.source.goals.filter((goal) => goal.status === 'active').map((goal) => ({
        id: goal.id, name: goal.name, currency: goal.currency,
        projection: workspaceGoals.find((item) => item.id === goal.id)?.projection ?? { status: 'target_unavailable' as const },
      })),
      currentAllocation: snapshot(state.source.snapshots[0], state.source.allocations),
      pendingAllocation: snapshot(state.pendingSnapshots[0], state.pendingAllocations),
    };
  }

  async previewAllocationChange(userId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    const draft = this.parseAllocationDraft(input);
    const state = await getGoalCreationState(this.db, userId, currentMonth);
    if (!state) throw new BadRequestException('Completá tu perfil financiero antes de cambiar la planificación.');
    try {
      const proposal = buildAllocationChangeProposal({ draft, state, currentMonth });
      return AllocationChangePreviewSchema.parse(projectGoalPreview({
        proposal, previewToken: createAllocationChangePreviewToken(state, currentMonth, draft),
      }));
    } catch (error) { this.rethrowAllocationError(error); }
  }

  async confirmAllocationChange(userId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    const parsed = this.parseAllocationConfirmation(input);
    try {
      await confirmAllocationChangeInRepository(this.db, { userId, currentMonth, ...parsed });
      return AllocationChangeConfirmationSchema.parse({ status: 'updated' });
    } catch (error) {
      if (error instanceof StaleAllocationChangePreviewError) {
        return AllocationChangeConfirmationSchema.parse({ status: 'stale', preview: projectGoalPreview(error.refreshedPreview) });
      }
      this.rethrowAllocationError(error);
    }
  }

  private parseAllocationDraft(input: unknown): AllocationChangeDraft {
    try { return allocationChangeDraftSchema.parse(input); }
    catch (error) {
      const message = error instanceof ZodError ? error.issues[0]?.message ?? 'Datos inválidos.' : 'Datos inválidos.';
      throw new BadRequestException(message);
    }
  }

  private parseAllocationConfirmation(input: unknown) {
    try { return confirmAllocationChangeSchema.parse(input); }
    catch (error) {
      const message = error instanceof ZodError ? error.issues[0]?.message ?? 'Datos inválidos.' : 'Datos inválidos.';
      throw new BadRequestException(message);
    }
  }

  private rethrowAllocationError(error: unknown): never {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof Error) {
      if (error.message.startsWith('Allocation percentages must sum to 100%') || error.message === 'Allocation draft must contain exactly the active goals') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Financial profile not found.') throw new BadRequestException('Completá tu perfil financiero antes de cambiar la planificación.');
    }
    throw new InternalServerErrorException();
  }

  async previewEdit(userId: string, goalId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    try {
      const state = await getGoalEditState(this.db, userId, currentMonth, goalId);
      if (!state) throw new BadRequestException('Completá tu perfil financiero antes de editar un objetivo.');
      const draft = this.parseCreation(input, currentMonth);
      const goal = state.source.goals.find((candidate) => candidate.id === goalId)!;
      if (draft.type !== goal.type || draft.currency !== goal.currency || draft.strategy !== goal.strategy) {
        throw new Error('Cannot modify immutable goal fields (type, currency, strategy).');
      }
      const proposal = buildGoalCreationProposal({ draft, state, currentMonth, subjectGoalId: goalId });
      return GoalCreationPreviewSchema.parse(projectGoalPreview({ proposal, previewToken: createGoalEditPreviewToken(state, currentMonth, goalId, draft) }));
    } catch (error) { this.rethrowEditError(error); }
  }

  async confirmEdit(userId: string, goalId: string, input: { draft: unknown; previewToken: string }) {
    const currentMonth = this.currentMonth();
    try {
      const draft = this.parseCreation(input.draft, currentMonth);
      await confirmGoalEditInRepository(this.db, { userId, goalId, currentMonth, draft, previewToken: input.previewToken });
      return GoalEditConfirmationSchema.parse({ status: 'updated' });
    } catch (error) {
      if (error instanceof StaleGoalEditPreviewError) {
        return GoalEditConfirmationSchema.parse({ status: 'stale', preview: projectGoalPreview(error.refreshedPreview) });
      }
      this.rethrowEditError(error);
    }
  }

  async getLifecyclePlanContext(userId: string, goalId: string, lifecycle: GoalLifecycle) {
    const currentMonth = this.currentMonth();
    try {
      const state = await getGoalLifecycleState(this.db, userId, currentMonth);
      if (!state) return GoalPlanContextStateSchema.parse({ profile: 'missing' });
      return GoalPlanContextStateSchema.parse({
        profile: 'present',
        context: this.mapCreationContext(state, currentMonth),
        lifecycleContext: buildGoalLifecycleContext(state, currentMonth, goalId, lifecycle),
      });
    } catch (error) { this.rethrowLifecycleError(error); }
  }

  async previewLifecycle(userId: string, goalId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    const parsed = this.parseGoalBody(goalLifecyclePreviewSchema, goalId, input);
    const draft = parsed.allocations !== undefined ? { allocations: parsed.allocations } : undefined;
    try {
      const state = await getGoalLifecycleState(this.db, userId, currentMonth);
      if (!state) throw new BadRequestException('Completá tu perfil financiero antes de pausar o reanudar un objetivo.');
      const proposal = buildGoalLifecycleProposal({ lifecycle: parsed.lifecycle, goalId, state, currentMonth, draft });
      return GoalLifecyclePreviewSchema.parse(projectGoalPreview({
        proposal, previewToken: createGoalLifecyclePreviewToken(parsed.lifecycle, goalId, state, currentMonth, draft),
      }));
    } catch (error) { this.rethrowLifecycleError(error); }
  }

  async confirmLifecycle(userId: string, goalId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    const parsed = this.parseGoalBody(confirmGoalLifecycleSchema, goalId, input);
    try {
      await confirmGoalLifecycleInRepository(this.db, {
        userId, goalId, lifecycle: parsed.lifecycle, currentMonth, draft: { allocations: parsed.allocations }, previewToken: parsed.previewToken,
      });
      return GoalLifecycleConfirmationSchema.parse({ status: 'updated' });
    } catch (error) {
      if (error instanceof StaleGoalLifecyclePreviewError) {
        return GoalLifecycleConfirmationSchema.parse({ status: 'stale', preview: projectGoalPreview(error.refreshedPreview) });
      }
      this.rethrowLifecycleError(error);
    }
  }

  private parseGoalBody<T>(schema: ZodType<T>, goalId: string, input: unknown): T {
    try { return schema.parse({ ...(input as object), goalId }); }
    catch (error) {
      throw new BadRequestException(error instanceof ZodError ? error.issues[0]?.message ?? 'Datos inválidos.' : 'Datos inválidos.');
    }
  }

  private rethrowLifecycleError(error: unknown): never {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof Error && (error.message.startsWith('Allocation percentages must sum to 100%') || LIFECYCLE_DOMAIN_ERRORS.has(error.message))) {
      throw new BadRequestException(error.message);
    }
    throw new InternalServerErrorException();
  }

  async getCompletionContext(userId: string, goalId: string) {
    const currentMonth = this.currentMonth();
    try {
      const state = await getGoalCompletionState(this.db, userId, currentMonth, goalId);
      if (!state) return GoalCompletionContextStateSchema.parse({ profile: 'missing' });
      return GoalCompletionContextStateSchema.parse({ profile: 'present', context: buildGoalCompletionContext(state, currentMonth, goalId) });
    } catch (error) { this.rethrowCompletionError(error); }
  }

  async previewCompletion(userId: string, goalId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    const draft: GoalCompletionDraft = this.parseGoalBody(goalCompletionPreviewSchema, goalId, input);
    try {
      const state = await getGoalCompletionState(this.db, userId, currentMonth, goalId);
      if (!state) throw new BadRequestException('Completá tu perfil financiero antes de completar un objetivo.');
      const proposal = buildGoalCompletionProposal({ state, currentMonth, draft });
      return GoalCompletionPreviewSchema.parse(projectGoalPreview({ proposal, previewToken: createGoalCompletionPreviewToken(state, currentMonth, draft) }));
    } catch (error) { this.rethrowCompletionError(error); }
  }

  async confirmCompletion(userId: string, goalId: string, input: unknown) {
    const currentMonth = this.currentMonth();
    const { previewToken, ...draft }: GoalCompletionDraft & { previewToken: string } = this.parseGoalBody(confirmGoalCompletionSchema, goalId, input);
    try {
      const completed = await confirmGoalCompletionInRepository(this.db, { userId, currentMonth, draft, previewToken });
      return GoalCompletionConfirmationSchema.parse({ status: 'completed', completedAt: completed.completedAt });
    } catch (error) {
      if (error instanceof StaleGoalCompletionPreviewError) {
        return GoalCompletionConfirmationSchema.parse({ status: 'stale', preview: projectGoalPreview(error.refreshedPreview) });
      }
      if (error instanceof GoalCompletionStateInvalidError) {
        return GoalCompletionConfirmationSchema.parse({ status: 'invalid', message: error.message });
      }
      this.rethrowCompletionError(error);
    }
  }

  private rethrowCompletionError(error: unknown): never {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof Error && (COMPLETION_DOMAIN_ERRORS.has(error.message) || error.message.startsWith('El monto supera el saldo disponible en ') || error.message.startsWith('Allocation percentages must sum to 100%'))) {
      throw new BadRequestException(error.message);
    }
    throw new InternalServerErrorException();
  }

  private mapCreationContext(state: GoalCreationState, currentMonth: string) {
    const profile = state.source.profile;
    const snapshot = state.source.snapshots[0];
    return {
      currentMonth,
      expensesKnowledge: profile?.expensesKnowledge === 'known' ? 'known' as const : 'unknown' as const,
      hasEmergencyFund: state.source.goals.some((goal) => goal.type === 'emergency_fund'),
      ...(profile?.plannedMonthlyContribution != null ? { plannedMonthlyContribution: createMoney(profile.plannedMonthlyContribution, profile.baseCurrency ?? 'ARS') } : {}),
      ...(snapshot ? { currentAllocation: { effectiveMonth: snapshot.effectiveMonth, entries: state.source.allocations.filter((entry) => entry.snapshotId === snapshot.id).map(({ goalId, percentage }) => ({ goalId, percentage })) } } : {}),
    };
  }

  private rethrowEditError(error: unknown): never {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof Error) {
      if (error.message.startsWith('Allocation percentages must sum to 100%')) throw new BadRequestException('La distribución debe sumar 100%.');
      if (error.message === 'Allocation draft must contain exactly the active goals') throw new BadRequestException('La distribución de objetivos no es válida.');
      if (error.message === 'Financial profile not found.') throw new BadRequestException('Completá tu perfil financiero antes de editar un objetivo.');
      if (error.message === 'Cannot edit a completed goal.' || error.message === 'Goal not found or is not active.' || error.message.startsWith('Cannot modify immutable goal fields')) throw new BadRequestException(error.message);
    }
    throw new InternalServerErrorException();
  }

  async previewCreation(userId: string, input: GoalCreationDraft) {
    const currentMonth = this.currentMonth();
    const state = await getGoalCreationState(this.db, userId, currentMonth);
    if (!state) throw new BadRequestException('Completá tu perfil financiero antes de crear un objetivo.');
    const draft = this.parseCreation(input, currentMonth);
    let proposal;
    try { proposal = buildGoalCreationProposal({ draft, state, currentMonth }); }
    catch (error) { this.rethrowCreationDomainError(error); }
    const result = projectGoalPreview({ proposal, previewToken: createGoalCreationPreviewToken(state, currentMonth, draft) });
    return GoalCreationPreviewSchema.parse(result);
  }

  async confirmCreation(userId: string, input: { draft: GoalCreationDraft; previewToken: string }) {
    const currentMonth = this.currentMonth();
    const draft = this.parseCreation(input.draft, currentMonth);
    try {
      const created = await confirmGoalCreationInRepository(this.db, { userId, currentMonth, draft, previewToken: input.previewToken });
      return GoalCreationConfirmationSchema.parse({ status: 'created', goalId: created.goalId });
    } catch (error) {
      if (error instanceof StaleGoalCreationPreviewError) {
        return GoalCreationConfirmationSchema.parse({ status: 'stale', preview: projectGoalPreview(error.refreshedPreview) });
      }
      this.rethrowCreationDomainError(error);
    }
  }

  private parseCreation(input: unknown, currentMonth: string): GoalCreationDraft {
    try { return parseGoalCreationSubmission(input, currentMonth); }
    catch (error) {
      const message = error instanceof ZodError ? error.issues[0]?.message ?? 'Datos inválidos.' : 'Datos inválidos.';
      throw new BadRequestException(message);
    }
  }

  private rethrowCreationDomainError(error: unknown): never {
    if (!(error instanceof Error)) throw error;
    if (error.message.startsWith('Allocation percentages must sum to 100%')) throw new BadRequestException('La distribución debe sumar 100%.');
    if (error.message === 'Allocation draft must contain exactly the active goals') throw new BadRequestException('La distribución de objetivos no es válida.');
    if (error.message === 'Financial profile not found.') throw new BadRequestException('Completá tu perfil financiero antes de crear un objetivo.');
    throw error;
  }

  async getWorkspace(userId: string, currentMonth = monthNow()): Promise<GoalsWorkspace> {
    const profile = await this.db.query.financialProfiles.findFirst({ where: eq(financialProfiles.userId, userId) });
    if (!profile) return { profile: 'missing' };
    const [goalRows, incomeRows, expenseRows, allSnapshots] = await Promise.all([
      this.db.query.financialGoals.findMany({ where: eq(financialGoals.userId, userId) }),
      this.db.query.incomes.findMany({ where: eq(incomes.userId, userId) }),
      this.db.query.expenses.findMany({ where: eq(expenses.userId, userId) }),
      this.db.query.allocationPlanSnapshots.findMany({ where: eq(allocationPlanSnapshots.userId, userId) }),
    ]);
    const goalIds = goalRows.map(({ id }) => id);
    const selectedSnapshots = selectWorkspaceSnapshots(allSnapshots, currentMonth);
    const snapshotIds = selectedSnapshots.map(({ id }) => id);
    const [savingsPositions, investmentPositions, allocations, places, [savings, investments]] = await Promise.all([
      goalIds.length ? this.db.query.goalSavingsPositions.findMany({ where: inArray(goalSavingsPositions.goalId, goalIds) }) : [],
      goalIds.length ? this.db.query.goalInvestmentPositions.findMany({ where: inArray(goalInvestmentPositions.goalId, goalIds) }) : [],
      snapshotIds.length ? this.db.query.allocationPlanEntries.findMany({ where: inArray(allocationPlanEntries.snapshotId, snapshotIds) }) : [],
      this.db.query.savingsPlaces.findMany({ where: eq(savingsPlaces.userId, userId) }),
      findUserContributions(this.db, userId),
    ]);
    const placeIds = places.map(({ id }) => id);
    const savingIds = savings.map(({ id }) => id);
    const investmentIds = investments.map(({ id }) => id);
    const [savingAllocations, investmentAllocations, withdrawals] = await Promise.all([
      savingIds.length ? this.db.query.savingContributionAllocations.findMany({ where: inArray(savingContributionAllocations.contributionId, savingIds) }) : [],
      investmentIds.length ? this.db.query.investmentContributionAllocations.findMany({ where: inArray(investmentContributionAllocations.contributionId, investmentIds) }) : [],
      goalIds.length && placeIds.length ? this.db.query.goalCompletionWithdrawals.findMany({ where: and(inArray(goalCompletionWithdrawals.goalId, goalIds), inArray(goalCompletionWithdrawals.placeId, placeIds)) }) : [],
    ]);
    const safeWithdrawals: Array<typeof goalCompletionWithdrawals.$inferSelect> = withdrawals;
    const names = new Map(goalRows.map(({ id, name }) => [id, name]));
    const placeNames = new Map(places.map(({ id, name }) => [id, name]));
    const mapActivity = (rows: any[], activityAllocations: any[], kind: 'saving' | 'investment') => rows.map((row) => ({
      ...row, kind, placeName: kind === 'saving' ? placeNames.get(row.placeId) ?? '' : undefined,
      allocations: activityAllocations.filter((allocation) => allocation.contributionId === row.id).map((allocation) => ({
        goalId: allocation.goalId, goalName: names.get(allocation.goalId) ?? '', amount: allocation.amount, percentage: allocation.percentage,
      })),
    }));
    const contributions = [...mapActivity(savings, savingAllocations, 'saving'), ...mapActivity(investments, investmentAllocations, 'investment')]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const rows = {
      profile, goals: goalRows, savingsPositions, investmentPositions,
      snapshots: selectedSnapshots, allocations, incomes: incomeRows, expenses: expenseRows, contributions,
      completionWithdrawals: safeWithdrawals.filter((row) => names.has(row.goalId) && placeNames.has(row.placeId)).map((row) => ({
        ...row, placeName: placeNames.get(row.placeId)!,
      })),
    };
    const workspace = buildGoalsWorkspace(mapRowsToGoalsWorkspaceSource(rows), currentMonth);
    return GoalsWorkspaceSchema.parse({ profile: 'present', workspace }) as GoalsWorkspace;
  }
}
