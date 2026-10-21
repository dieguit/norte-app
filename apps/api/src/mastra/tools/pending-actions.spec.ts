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
  const confirm = () => tools.confirmPendingAction.execute!({}, ctx('u1'));
  const undoLast = () => tools.undoLastWrite.execute!({}, ctx('u1'));
  return {
    pending,
    undo,
    confirm,
    undoLast,
    advance: (ms: number) => (now += ms),
  };
}

describe('UserActionStore', () => {
  it('reports active entry presence and ignores expired entries', () => {
    let now = 0;
    const store = new UserActionStore(1000, () => now);
    expect(store.has('u1')).toBe(false);
    store.set('u1', { summary: 'A', run: vi.fn() });
    expect(store.has('u1')).toBe(true);
    now += 1001;
    expect(store.has('u1')).toBe(false);
  });
});

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
      error:
        'No hay ninguna propuesta pendiente o ya venció. Pedímela de nuevo.',
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('returns non-done outcomes directly without done flag', async () => {
    const { pending, confirm } = setup();
    const staleResult = {
      status: 'stale',
      message: 'Los datos cambiaron.',
    };
    pending.set('u1', {
      summary: 'Gasto mensual',
      run: vi.fn().mockResolvedValue(staleResult),
    });
    await expect(confirm()).resolves.toEqual(staleResult);
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
    const tools = createPendingActionTools({
      pending,
      undo: new UserActionStore(),
    });
    await expect(
      tools.confirmPendingAction.execute!({}, ctx()),
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
    await expect(undoLast()).resolves.toEqual({
      error: 'No hay nada para deshacer.',
    });
    expect(run).not.toHaveBeenCalled();
  });
});

describe('stagePreview', () => {
  it('captures previewToken at staging and is immune to later mutation', async () => {
    const store = new UserActionStore();
    const confirmFn = vi.fn().mockResolvedValue({ status: 'created' });
    const preview = { previewToken: 'orig', n: 1 };
    stagePreview({
      store,
      userId: 'u1',
      summary: 'Crear objetivo',
      preview,
      present: (p) => p,
      confirm: confirmFn,
    });
    preview.previewToken = 'x';
    await store.take('u1')!.run();
    expect(confirmFn).toHaveBeenCalledWith('orig');
  });

  it('does not overwrite newer proposals when a stale confirm resolves', async () => {
    const store = new UserActionStore();
    let resolveConfirm!: (value: {
      status: string;
      preview?: { previewToken: string; n: number };
    }) => void;
    const confirmPromise = new Promise<{
      status: string;
      preview?: { previewToken: string; n: number };
    }>((res) => {
      resolveConfirm = res;
    });
    const confirmFn = vi.fn().mockReturnValue(confirmPromise);

    stagePreview({
      store,
      userId: 'u1',
      summary: 'Proposal A',
      preview: { previewToken: 'token-a', n: 1 },
      present: (p) => p,
      confirm: confirmFn,
    });

    const actionA = store.take('u1')!;
    const runPromiseA = actionA.run();

    store.set('u1', { summary: 'Proposal B', run: vi.fn() });

    resolveConfirm({
      status: 'stale',
      preview: { previewToken: 'token-b', n: 2 },
    });
    const resA = await runPromiseA;

    expect(resA).toEqual({
      status: 'superseded',
      message: 'Hay una propuesta más nueva pendiente; esta quedó descartada.',
    });
    expect(store.take('u1')?.summary).toBe('Proposal B');
  });

  it('re-stages with the refreshed token when confirm is stale', async () => {
    const store = new UserActionStore();
    const confirmFn = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'stale',
        preview: { previewToken: 'b', n: 2 },
      })
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
      message:
        'Los datos cambiaron. Mostrá esta nueva vista previa y pedí confirmación otra vez.',
      preview: { n: 2 },
    });
    await expect(store.take('u1')!.run()).resolves.toEqual({
      status: 'created',
    });
    expect(confirmFn.mock.calls).toEqual([['a'], ['b']]);
  });
});
