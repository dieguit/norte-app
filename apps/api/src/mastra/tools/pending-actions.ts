import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getPostHog } from '../../analytics/posthog';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

export type UserAction = {
  actionType: string;
  summary: string;
  run: () => Promise<unknown>;
};
export type ActionStores = { pending: UserActionStore; undo: UserActionStore };

const TEN_MINUTES = 10 * 60_000;

// ponytail: in-memory, lost on restart and single-instance only; move to a Postgres table if the API scales out.
export class UserActionStore {
  private readonly entries = new Map<
    string,
    UserAction & { expiresAt: number }
  >();

  constructor(
    private readonly ttlMs = TEN_MINUTES,
    private readonly now: () => number = Date.now,
    private readonly trackPreviews = false,
  ) {}

  set(userId: string, action: UserAction) {
    this.entries.set(userId, { ...action, expiresAt: this.now() + this.ttlMs });
    if (this.trackPreviews)
      getPostHog().capture({
        distinctId: userId,
        event: 'bot_action_previewed',
        properties: { action_type: action.actionType },
      });
  }

  take(userId: string): UserAction | undefined {
    const entry = this.entries.get(userId);
    this.entries.delete(userId);
    return entry && entry.expiresAt > this.now() ? entry : undefined;
  }

  has(userId: string): boolean {
    const entry = this.entries.get(userId);
    return !!entry && entry.expiresAt > this.now();
  }
}

// The stored closure captures the previewed input, so what runs on "sí" is exactly what the user saw.
export function stagePreview<P extends { previewToken: string }>(args: {
  store: UserActionStore;
  userId: string;
  actionType: string;
  summary: string;
  preview: P;
  present: (preview: P) => unknown;
  confirm: (
    previewToken: string,
  ) => Promise<{ status: string; preview?: P } | undefined>;
}) {
  const { store, userId, actionType, summary, preview, present, confirm } =
    args;
  const { previewToken } = preview;
  store.set(userId, {
    actionType,
    summary,
    run: async () => {
      const result = await confirm(previewToken);
      if (result?.status === 'stale' && result.preview) {
        if (store.has(userId)) {
          return {
            status: 'superseded',
            message:
              'Hay una propuesta más nueva pendiente; esta quedó descartada.',
          };
        }
        stagePreview({ ...args, preview: result.preview });
        return {
          status: 'stale',
          message:
            'Los datos cambiaron. Mostrá esta nueva vista previa y pedí confirmación otra vez.',
          preview: present(result.preview),
        };
      }
      return result;
    },
  });
  return { needsConfirmation: true as const, preview: present(preview) };
}

const trackAction = (
  event: 'bot_action_confirmed' | 'bot_action_undone',
  userId: string,
  outcome: string,
  action?: UserAction,
) =>
  getPostHog().capture({
    distinctId: userId,
    event,
    properties: { action_type: action?.actionType, outcome },
  });

export function createPendingActionTools({ pending, undo }: ActionStores) {
  return {
    confirmPendingAction: createTool({
      id: 'confirm-pending-action',
      description:
        'Executes the latest staged preview. Call immediately when authorized by a clear explicit write instruction from the user, or right after the user explicitly accepts a proposal ("sí", "dale", "confirmo"). Never call it on unrequested changes, agent proposals without confirmation, or stale refreshed previews without fresh explicit user approval.',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(
          'confirm-pending-action',
          context?.requestContext,
          async () => {
            const userId = requireUserId(context?.requestContext);
            const action = pending.take(userId);
            if (!action) {
              trackAction('bot_action_confirmed', userId, 'expired');
              return {
                error:
                  'No hay ninguna propuesta pendiente o ya venció. Pedímela de nuevo.',
              };
            }
            const result = await action.run();
            const status = (result as { status?: unknown } | null | undefined)
              ?.status;
            if (
              status === 'stale' ||
              status === 'superseded' ||
              status === 'invalid'
            ) {
              trackAction('bot_action_confirmed', userId, status, action);
              return result;
            }
            trackAction('bot_action_confirmed', userId, 'done', action);
            return { done: action.summary, result };
          },
        ),
    }),
    undoLastWrite: createTool({
      id: 'undo-last-write',
      description:
        'Undoes the last one-time income or expense write in this chat (a whole recordExpenses batch counts as one), within 10 minutes. Use when the user asks to undo ("deshacer", "borralo", "me equivoqué").',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('undo-last-write', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const action = undo.take(userId);
          if (!action) {
            trackAction('bot_action_undone', userId, 'expired');
            return { error: 'No hay nada para deshacer.' };
          }
          await action.run();
          trackAction('bot_action_undone', userId, 'done', action);
          return { done: action.summary };
        }),
    }),
  };
}
