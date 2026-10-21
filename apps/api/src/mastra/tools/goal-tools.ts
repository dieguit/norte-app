import { createTool } from '@mastra/core/tools';
import {
  AllocationChangeDraftWireSchema,
  GoalCompletionPreviewWireSchema,
  GoalCreationDraftWireSchema,
  GoalLifecycleActionSchema,
} from '@repo/shared-types';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { type ActionStores, stagePreview } from './pending-actions';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

const GoalIdSchema = z.string().uuid().describe('Goal id from listGoals');
const AllocationsSchema = z
  .array(z.object({ goalId: z.string(), percentage: z.string() }).strict())
  .describe('Percentages per active goal; must sum 100');

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
  return {
    listGoals: createTool({
      id: 'list-goals',
      description:
        "The user's goals (active, paused, completed) with ids, target, progress, projection and the month's financial summary.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(async () => {
          const state = await goals.getWorkspace(
            requireUserId(context?.requestContext),
          );
          if (state.profile === 'missing') return state;
          return {
            financialSummary: state.workspace.financialSummary,
            goals: state.workspace.groups.flatMap((group) =>
              group.goals.map((goal) => omit(goal, OMITTED_GOAL_KEYS)),
            ),
          };
        }),
    }),

    getGoalPlan: createTool({
      id: 'get-goal-plan',
      description:
        'Planning context needed BEFORE any goal preview: current allocation percentages, planned monthly contribution, active goals. Pass goalId to get the editable draft of that goal; pass goalId + action to get pause/resume context.',
      inputSchema: z.object({
        goalId: GoalIdSchema.optional(),
        action: GoalLifecycleActionSchema.optional(),
      }),
      execute: ({ goalId, action }, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          return goalId && action
            ? goals.getLifecyclePlanContext(userId, goalId, action)
            : goals.getPlanContext(userId, goalId);
        }),
    }),

    getGoalCompletionContext: createTool({
      id: 'get-goal-completion-context',
      description:
        'Savings places with balances and allocation context needed before previewing a goal completion.',
      inputSchema: z.object({ goalId: GoalIdSchema }),
      execute: ({ goalId }, context) =>
        toolResult(() =>
          goals.getCompletionContext(
            requireUserId(context?.requestContext),
            goalId,
          ),
        ),
    }),

    previewGoalCreation: createTool({
      id: 'preview-goal-creation',
      description:
        'Previews creating a goal (Antes → Con este cambio). Call getGoalPlan first. allocations must include every active goal plus { goalId: "pending-goal" } for the new one, summing 100. For strategy "save" send annualReturnRate "" and availableFromMonth "". Needs confirmation.',
      inputSchema: z.object({ draft: GoalCreationDraftWireSchema }),
      execute: ({ draft }, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          return stagePreview({
            store: pending,
            userId,
            summary: 'Objetivo creado',
            preview: await goals.previewCreation(userId, draft),
            present,
            confirm: (previewToken) =>
              goals.confirmCreation(userId, { draft, previewToken }),
          });
        }),
    }),

    previewGoalEdit: createTool({
      id: 'preview-goal-edit',
      description:
        'Previews editing a goal. Get the current draft with getGoalPlan({ goalId }) and change only what the user asked. Needs confirmation.',
      inputSchema: z.object({
        goalId: GoalIdSchema,
        draft: GoalCreationDraftWireSchema,
      }),
      execute: ({ goalId, draft }, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          return stagePreview({
            store: pending,
            userId,
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
        'Previews changing the share of income dedicated to goals (dedicationPercentage, integer 0-100) and/or the split between active goals. Needs confirmation.',
      inputSchema: z.object({ draft: AllocationChangeDraftWireSchema }),
      execute: ({ draft }, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          return stagePreview({
            store: pending,
            userId,
            summary: 'Distribución actualizada',
            preview: await goals.previewAllocationChange(userId, draft),
            present,
            confirm: (previewToken) =>
              goals.confirmAllocationChange(userId, { draft, previewToken }),
          });
        }),
    }),

    previewGoalLifecycle: createTool({
      id: 'preview-goal-lifecycle',
      description:
        'Previews pausing or resuming a goal. Call getGoalPlan({ goalId, action }) first to get the allocation to redistribute. Needs confirmation.',
      inputSchema: z.object({
        goalId: GoalIdSchema,
        lifecycle: GoalLifecycleActionSchema,
        allocations: AllocationsSchema,
      }),
      execute: ({ goalId, lifecycle, allocations }, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          return stagePreview({
            store: pending,
            userId,
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
        }),
    }),

    previewGoalCompletion: createTool({
      id: 'preview-goal-completion',
      description:
        'Previews marking a goal as completed, withdrawing money from savings places and redistributing its allocation. Call getGoalCompletionContext first. Needs confirmation.',
      inputSchema: z.object({
        goalId: GoalIdSchema,
        ...GoalCompletionPreviewWireSchema.shape,
      }),
      execute: ({ goalId, ...body }, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          return stagePreview({
            store: pending,
            userId,
            summary: 'Objetivo completado',
            preview: await goals.previewCompletion(userId, goalId, body),
            present,
            confirm: (previewToken) =>
              goals.confirmCompletion(userId, goalId, {
                ...body,
                previewToken,
              }),
          });
        }),
    }),
  };
}
