import { createTool } from '@mastra/core/tools';
import { BadRequestException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
  getPreviousCalendarMonth,
  rebalanceAllocationEntries,
} from '@repo/finance-utils';
import {
  AllocationChangeDraftWireSchema,
  ContributionDraftWireBaseSchema,
  GoalCompletionPreviewWireSchema,
  GoalCreationDraftWireSchema,
  GoalLifecycleActionSchema,
  type GoalCompletionContext,
  SavingContributionDraftWireSchema,
} from '@repo/shared-types';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { type ActionStores, stagePreview } from './pending-actions';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

const GoalIdSchema = z.string().uuid().describe('Goal id from listGoals');

const PENDING_GOAL_ID = 'pending-goal';

function defaultWithdrawals(completion: GoalCompletionContext) {
  const places = completion.savingsPlaces.filter((place) =>
    new BigNumber(place.balance.amount).isGreaterThanOrEqualTo(
      completion.targetAmount.amount,
    ),
  );
  return places.length === 1
    ? [{ placeId: places[0].id, amount: completion.targetAmount.amount }]
    : undefined;
}

type AllocationSnapshot = { entries: { goalId: string; percentage: string }[] };
type AllocationPlan = {
  activeGoals: { id: string }[];
  currentAllocation?: AllocationSnapshot;
  pendingAllocation?: AllocationSnapshot;
};

function activeEntries(plan: AllocationPlan, extraGoalId?: string) {
  const current = new Map(
    (plan.pendingAllocation ?? plan.currentAllocation)?.entries.map((entry) => [
      entry.goalId,
      entry.percentage,
    ]),
  );
  const ids = new Set(plan.activeGoals.map((goal) => goal.id));
  if (extraGoalId) ids.add(extraGoalId);
  return [...ids].map((goalId) => ({
    goalId,
    percentage: current.get(goalId) ?? '0.00',
  }));
}

function planAllocations({
  plan,
  goalId,
  share,
  keepGoal = true,
}: {
  plan: AllocationPlan;
  goalId: string;
  share?: string;
  keepGoal?: boolean;
}) {
  const base = activeEntries(plan, goalId);
  const percentage = share ?? new BigNumber(100).div(base.length).toFixed(2);
  const result =
    base.length === 1 && new BigNumber(percentage).isZero()
      ? [{ goalId, percentage: '0.00' }]
      : rebalanceAllocationEntries(base, goalId, percentage);
  return keepGoal ? result : result.filter((entry) => entry.goalId !== goalId);
}
const AllocationsSchema = z
  .array(z.object({ goalId: z.string(), percentage: z.string() }).strict())
  .describe('Percentages per active goal; must sum 100');

const ToolGoalCreationDraftSchema = GoalCreationDraftWireSchema.extend({
  allocations: AllocationsSchema.optional(),
  desiredMonth: z.string().default(''),
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  strategy: z.enum(['save', 'invest']).default('save'),
  availability: z
    .enum(['available_now', 'available_from', 'long_term'])
    .default('available_now'),
  annualReturnRate: z.string().default(''),
  availableFromMonth: z.string().default(''),
});

const OMITTED_GOAL_KEYS = [
  'funding',
  'contributions',
  'savingContributions',
  'completionWithdrawals',
] as const;

function omit<T extends object, K extends readonly (keyof T)[]>(
  source: T,
  keys: K,
): Omit<T, K[number]> {
  const omitSet = new Set<string | number | symbol>(keys);
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !omitSet.has(key)),
  ) as Omit<T, K[number]>;
}

// proposedSource is the user's whole financial dataset; the model only needs the impacts.
function present<P extends { proposal: { proposedSource: unknown } }>(
  preview: P,
) {
  return omit(preview.proposal, ['proposedSource'] as const);
}

export function createGoalTools(
  { goals }: Pick<NorteServices, 'goals'>,
  { pending }: ActionStores,
) {
  async function getAllocationContext(userId: string) {
    const state = await goals.getPlanContext(userId);
    if (state.profile === 'missing' || !state.allocationContext)
      throw new BadRequestException(
        'No se pudo cargar la distribución. Completá tu perfil primero.',
      );
    return state.allocationContext;
  }
  return {
    listGoals: createTool({
      id: 'list-goals',
      description:
        "The user's goals with current share and financial summary. Pass goalId for the latest 20 contributions and completion withdrawals. Contribution ids are for previewSavingEdit/previewSavingDelete.",
      inputSchema: z.object({ goalId: GoalIdSchema.optional() }),
      execute: ({ goalId }, context) =>
        toolResult('list-goals', context?.requestContext, async () => {
          const state = await goals.getWorkspace(
            requireUserId(context?.requestContext),
          );
          if (state.profile === 'missing') return state;
          return {
            financialSummary: state.workspace.financialSummary,
            goals: state.workspace.groups.flatMap((group) =>
              group.goals
                .filter((goal) => !goalId || goal.id === goalId)
                .map((goal) => ({
                  ...omit(goal, OMITTED_GOAL_KEYS),
                  share:
                    goal.funding
                      .filter(
                        (row) =>
                          row.effectiveMonth.slice(0, 7) <=
                          state.workspace.financialSummary.month,
                      )
                      .sort((a, b) =>
                        b.effectiveMonth.localeCompare(a.effectiveMonth),
                      )[0]?.percentage ?? '0.00',
                  ...(goalId
                    ? {
                        contributions: (
                          goal.savingContributions ??
                          goal.contributions ??
                          []
                        )
                          .slice()
                          .sort((a, b) =>
                            b.createdAt.localeCompare(a.createdAt),
                          )
                          .slice(0, 20)
                          .map((row) => ({
                            id: row.id,
                            kind: row.kind,
                            amount: row.amount,
                            currency: row.currency,
                            placeName: row.placeName,
                            createdAt: row.createdAt,
                            allocationAmount:
                              row.allocations.find(
                                (entry) => entry.goalId === goal.id,
                              )?.amount ?? '0.00',
                          })),
                        completionWithdrawals: goal.completionWithdrawals ?? [],
                      }
                    : {}),
                })),
            ),
          };
        }),
    }),

    previewGoalCreation: createTool({
      id: 'preview-goal-creation',
      description:
        'Stages creating a goal; no prior call needed (execute via confirmPendingAction). Defaults: ARS, medium priority, save, available_now, no desired date, equal share. Optional share sets the new goal percentage; explicit draft.allocations must include all active goals plus pending-goal.',
      inputSchema: z.object({
        draft: ToolGoalCreationDraftSchema,
        share: z.string().optional(),
      }),
      execute: ({ draft: inputDraft, share }, context) =>
        toolResult(
          'preview-goal-creation',
          context?.requestContext,
          async () => {
            const userId = requireUserId(context?.requestContext);
            let allocations = inputDraft.allocations;
            if (!allocations) {
              const allocation = await getAllocationContext(userId);
              allocations = planAllocations({
                plan: allocation,
                goalId: PENDING_GOAL_ID,
                share,
              });
            }
            const draft = { ...inputDraft, allocations };
            return stagePreview({
              store: pending,
              userId,
              actionType: 'preview-goal-creation',
              summary: 'Objetivo creado',
              preview: await goals.previewCreation(userId, draft),
              present,
              confirm: (previewToken) =>
                goals.confirmCreation(userId, { draft, previewToken }),
            });
          },
        ),
    }),

    previewGoalEdit: createTool({
      id: 'preview-goal-edit',
      description:
        'Stages editing only the supplied changes (execute via confirmPendingAction); no prior call needed. Type, currency and strategy cannot change. Use previewAllocationChange for share changes.',
      inputSchema: z.object({
        goalId: GoalIdSchema,
        changes: GoalCreationDraftWireSchema.pick({
          name: true,
          targetAmount: true,
          desiredMonth: true,
          priority: true,
          annualReturnRate: true,
          availability: true,
          availableFromMonth: true,
        }).partial(),
      }),
      execute: ({ goalId, changes }, context) =>
        toolResult('preview-goal-edit', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const state = await goals.getPlanContext(userId, goalId);
          if (state.profile === 'missing' || !state.editContext)
            return { error: 'No se pudo cargar el objetivo para editar.' };
          const draft = { ...state.editContext.draft, ...changes };
          return stagePreview({
            store: pending,
            userId,
            actionType: 'preview-goal-edit',
            summary: 'Objetivo actualizado',
            preview: await goals.previewEdit(userId, goalId, draft),
            present,
            confirm: (previewToken) =>
              goals.confirmEdit(userId, goalId, { draft, previewToken }),
          });
        }),
    }),

    previewAllocationChange: createTool({
      id: 'preview-allocation-change',
      description:
        'Stages changing the share of income dedicated to goals (dedicationPercentage, integer 0-100) and/or the split between active goals (execute via confirmPendingAction).',
      inputSchema: AllocationChangeDraftWireSchema.partial().extend({
        share: z
          .object({ goalId: GoalIdSchema, percentage: z.string() })
          .optional(),
      }),
      execute: ({ dedicationPercentage, allocations, share }, context) =>
        toolResult(
          'preview-allocation-change',
          context?.requestContext,
          async () => {
            const userId = requireUserId(context?.requestContext);
            const allocation = await getAllocationContext(userId);
            const entries = activeEntries(allocation);
            const draft = {
              dedicationPercentage:
                dedicationPercentage ??
                Number(allocation.financialSummary.dedicationPercentage),
              allocations: share
                ? planAllocations({
                    plan: allocation,
                    goalId: share.goalId,
                    share: share.percentage,
                  })
                : (allocations ?? entries),
            };
            return stagePreview({
              store: pending,
              userId,
              actionType: 'preview-allocation-change',
              summary: 'Distribución actualizada',
              preview: await goals.previewAllocationChange(userId, draft),
              present,
              confirm: (previewToken) =>
                goals.confirmAllocationChange(userId, { draft, previewToken }),
            });
          },
        ),
    }),

    previewGoalLifecycle: createTool({
      id: 'preview-goal-lifecycle',
      description:
        'Stages pausing or resuming a goal, redistributing proportionally (execute via confirmPendingAction). Resume defaults to equal share; optional share overrides it. No prior call needed.',
      inputSchema: z.object({
        goalId: GoalIdSchema,
        lifecycle: GoalLifecycleActionSchema,
        share: z.string().optional(),
      }),
      execute: ({ goalId, lifecycle, share }, context) =>
        toolResult(
          'preview-goal-lifecycle',
          context?.requestContext,
          async () => {
            const userId = requireUserId(context?.requestContext);
            const allocation = await getAllocationContext(userId);
            const allocations = planAllocations({
              plan: allocation,
              goalId,
              share: lifecycle === 'pause' ? '0' : share,
            });
            return stagePreview({
              store: pending,
              userId,
              actionType: 'preview-goal-lifecycle',
              summary:
                lifecycle === 'pause'
                  ? 'Objetivo pausado'
                  : 'Objetivo reactivado',
              preview: await goals.previewLifecycle(userId, goalId, {
                lifecycle,
                allocations,
              }),
              present,
              confirm: (previewToken) =>
                goals.confirmLifecycle(userId, goalId, {
                  lifecycle,
                  allocations,
                  previewToken,
                }),
            });
          },
        ),
    }),

    previewGoalCompletion: createTool({
      id: 'preview-goal-completion',
      description:
        'Stages marking a goal as completed (execute via confirmPendingAction). withdrawals and allocations are optional: defaults to a single place covering the target and proportional redistribution.',
      inputSchema: z.object({
        goalId: GoalIdSchema,
        withdrawals:
          GoalCompletionPreviewWireSchema.shape.withdrawals.optional(),
        allocations:
          GoalCompletionPreviewWireSchema.shape.allocations.optional(),
      }),
      execute: ({ goalId, ...body }, context) =>
        toolResult(
          'preview-goal-completion',
          context?.requestContext,
          async () => {
            const userId = requireUserId(context?.requestContext);
            const state = await goals.getCompletionContext(userId, goalId);
            if (state.profile === 'missing') return state;
            const completion = state.context;
            if (!body.allocations) {
              body.allocations = planAllocations({
                plan: completion,
                goalId,
                share: '0',
                keepGoal: false,
              });
            }
            if (!body.withdrawals) {
              const withdrawals = defaultWithdrawals(completion);
              if (!withdrawals)
                return {
                  error:
                    'Elegí de qué lugares sacar el dinero (deben sumar el objetivo).',
                  targetAmount: completion.targetAmount,
                  savingsPlaces: completion.savingsPlaces,
                };
              body.withdrawals = withdrawals;
            }
            return stagePreview({
              store: pending,
              userId,
              actionType: 'preview-goal-completion',
              summary: 'Objetivo completado',
              preview: await goals.previewCompletion(userId, goalId, body),
              present,
              confirm: (previewToken) =>
                goals.confirmCompletion(userId, goalId, {
                  ...body,
                  previewToken,
                }),
            });
          },
        ),
    }),
  };
}

const ContributionIdSchema = z
  .string()
  .uuid()
  .describe('Contribution id from listGoals({ goalId })');

const ToolSavingContributionDraftSchema =
  ContributionDraftWireBaseSchema.extend({
    currency: z.enum(['ARS', 'USD']).default('ARS'),
  });

async function resolveSavingsPlace(
  contributions: Pick<NorteServices['contributions'], 'getContext'>,
  userId: string,
  kind: string | undefined,
  place: unknown,
) {
  if (kind !== 'investment' && !place) {
    const res = await contributions.getContext(userId);
    if (res?.profile === 'present' && res.context.places.length === 1) {
      return { kind: 'existing' as const, placeId: res.context.places[0].id };
    }
  }
  return place;
}

export function createContributionTools(
  { contributions }: Pick<NorteServices, 'contributions'>,
  { pending }: ActionStores,
) {
  return {
    getContributionContext: createTool({
      id: 'get-contribution-context',
      description:
        'Context needed before recording a saving or investment: eligible goals, monthly targets, and existing savings places with ids.',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('get-contribution-context', context?.requestContext, () =>
          contributions.getContext(requireUserId(context?.requestContext)),
        ),
    }),

    previewSaving: createTool({
      id: 'preview-saving',
      description:
        'Stages recording money the user actually saved or invested ("ahorré", "invertí"; execute via confirmPendingAction), split across goals by the current allocation. Currency defaults to ARS. If the user has a single savings place it is used automatically. Otherwise kind "saving" requires a place (existing placeId or a new name). USD bought with pesos: send arsSpent. Set catchUpPreviousMonth to record it in the previous month (catching up a shortfall or a forgotten saving); older months are not supported.',
      inputSchema: z.object({
        draft: ToolSavingContributionDraftSchema,
        catchUpPreviousMonth: z.boolean().optional(),
      }),
      execute: ({ draft, catchUpPreviousMonth }, context) =>
        toolResult('preview-saving', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const catchUpMonth = catchUpPreviousMonth
            ? getPreviousCalendarMonth(new Date())
            : undefined;
          const place = await resolveSavingsPlace(
            contributions,
            userId,
            draft.kind,
            draft.place,
          );
          const preparedDraft = {
            ...draft,
            ...(place ? { place } : {}),
          };
          const parsed =
            SavingContributionDraftWireSchema.safeParse(preparedDraft);
          if (!parsed.success) {
            return {
              error:
                parsed.error.issues[0]?.message ?? 'Datos de ahorro inválidos.',
            };
          }
          const validDraft = parsed.data;
          return stagePreview({
            store: pending,
            userId,
            actionType: 'preview-saving',
            summary:
              (validDraft.kind === 'investment'
                ? 'Inversión registrada'
                : 'Ahorro registrado') +
              (catchUpMonth ? ` (regularización ${catchUpMonth})` : ''),
            preview: await contributions.previewSaving(userId, validDraft),
            present: ({ preview }) => preview,
            confirm: (previewToken) =>
              contributions.confirmSaving(userId, {
                draft: validDraft,
                previewToken,
                ...(catchUpMonth ? { catchUpMonth } : {}),
              }),
          });
        }),
    }),

    previewSavingEdit: createTool({
      id: 'preview-saving-edit',
      description:
        'Stages correcting a recorded saving or investment (execute via confirmPendingAction).',
      inputSchema: z.object({
        contributionId: ContributionIdSchema,
        draft: SavingContributionDraftWireSchema,
      }),
      execute: ({ contributionId, draft }, context) =>
        toolResult('preview-saving-edit', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const { preview } = await contributions.previewSavingEdit(
            userId,
            contributionId,
            draft,
          );
          pending.set(userId, {
            actionType: 'preview-saving-edit',
            summary: 'Aporte corregido',
            run: () =>
              contributions.updateSaving(userId, contributionId, { draft }),
          });
          return { needsConfirmation: true, preview };
        }),
    }),

    previewSavingDelete: createTool({
      id: 'preview-saving-delete',
      description:
        'Stages deleting a recorded saving or investment (execute via confirmPendingAction).',
      inputSchema: z.object({ contributionId: ContributionIdSchema }),
      execute: ({ contributionId }, context) =>
        toolResult('preview-saving-delete', context?.requestContext, () => {
          const userId = requireUserId(context?.requestContext);
          pending.set(userId, {
            actionType: 'preview-saving-delete',
            summary: 'Aporte eliminado',
            run: () => contributions.deleteSaving(userId, contributionId),
          });
          return {
            needsConfirmation: true,
            preview: { delete: contributionId },
          };
        }),
    }),
  };
}
