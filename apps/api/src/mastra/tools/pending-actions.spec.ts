import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import {
  UserActionStore,
  createPendingActionTools,
  stagePreview,
} from './pending-actions';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

function setup() {
  let now = 0;
  const pending = new UserActionStore(1000, () => now);
  const undo = new UserActionStore(1000, () => now);
  const tools = createPendingActionTools({ pending, undo });
  const confirm = () => tools.confirmPendingAction.execute!({} as never, ctx('u1'));
  const undoLast = () => tools.undoLastWrite.execute!({} as never, ctx('u1'));
  return { pending, undo, confirm, undoLast, advance: (ms: number) => (now += ms) };
}

describe('confirmPendingAction', () => {
  it('runs the stored action once', async () => {
    const { pending, confirm } = setup();
    const run = vi.fn().mockResolvedValue({ status: 'created' });
    pending.set('u1', { summary: 'Gasto mensual', run });
    await expect(confirm()).resolves.toEqual({
      done: 'Gasto mensual',
      result: { status: 'created' },
    });
    await expect(confirm()).resolves.toEqual({
      error: 'No hay ninguna propuesta pendiente o ya venció. Pedímela de nuevo.',
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('only runs the latest preview', async () => {
    const { pending, confirm } = setup();
    const first = vi.fn();
    const second = vi.fn().mockResolvedValue('b');
    pending.set('u1', { summary: 'A', run: first });
    pending.set('u1', { summary: 'B', run: second });
    await confirm();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('expires after the TTL', async () => {
    const { pending, confirm, advance } = setup();
    const run = vi.fn();
    pending.set('u1', { summary: 'A', run });
    advance(1001);
    await expect(confirm()).resolves.toHaveProperty('error');
    expect(run).not.toHaveBeenCalled();
  });

  it('never runs another user action', async () => {
    const { pending, confirm } = setup();
    const run = vi.fn();
    pending.set('u2', { summary: 'A', run });
    await expect(confirm()).resolves.toHaveProperty('error');
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses without a userId', async () => {
    const { pending } = setup();
    const run = vi.fn();
    pending.set('u1', { summary: 'A', run });
    const tools = createPendingActionTools({ pending, undo: new UserActionStore() });
    await expect(
      tools.confirmPendingAction.execute!({} as never, ctx()),
    ).resolves.toHaveProperty('error');
    expect(run).not.toHaveBeenCalled();
  });
});

describe('undoLastWrite', () => {
  it('runs the stored undo once', async () => {
    const { undo, undoLast } = setup();
    const run = vi.fn().mockResolvedValue(undefined);
    undo.set('u1', { summary: 'Borré el gasto', run });
    await expect(undoLast()).resolves.toEqual({ done: 'Borré el gasto' });
    await expect(undoLast()).resolves.toEqual({
      error: 'No hay nada para deshacer.',
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does nothing after the TTL', async () => {
    const { undo, undoLast, advance } = setup();
    const run = vi.fn();
    undo.set('u1', { summary: 'x', run });
    advance(1001);
    await expect(undoLast()).resolves.toEqual({ error: 'No hay nada para deshacer.' });
    expect(run).not.toHaveBeenCalled();
  });
});

describe('stagePreview', () => {
  it('re-stages with the refreshed token when confirm is stale', async () => {
    const store = new UserActionStore();
    const confirmFn = vi
      .fn()
      .mockResolvedValueOnce({ status: 'stale', preview: { previewToken: 'b', n: 2 } })
      .mockResolvedValueOnce({ status: 'created' });
    const staged = stagePreview({
      store,
      userId: 'u1',
      summary: 'Crear objetivo',
      preview: { previewToken: 'a', n: 1 },
      present: (p) => ({ n: p.n }),
      confirm: confirmFn,
    });
    expect(staged).toEqual({ needsConfirmation: true, preview: { n: 1 } });

    await expect(store.take('u1')!.run()).resolves.toEqual({
      status: 'stale',
      message: 'Los datos cambiaron. Mostrá esta nueva vista previa y pedí confirmación otra vez.',
      preview: { n: 2 },
    });
    await expect(store.take('u1')!.run()).resolves.toEqual({ status: 'created' });
    expect(confirmFn.mock.calls).toEqual([['a'], ['b']]);
  });
});
