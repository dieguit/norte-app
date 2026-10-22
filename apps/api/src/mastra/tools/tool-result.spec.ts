import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestContext } from '@mastra/core/request-context';
import type { PostHog } from 'posthog-node';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setPostHog } from '../../analytics/posthog';
import { toolResult } from './tool-result';
import { MissingUserError, requireUserId } from './user-context';

describe('requireUserId', () => {
  it('returns the userId from request context', () => {
    const rc = new RequestContext();
    rc.set('userId', 'u1');
    expect(requireUserId(rc)).toBe('u1');
  });

  it('throws without a userId', () => {
    expect(() => requireUserId(new RequestContext())).toThrow(MissingUserError);
    expect(() => requireUserId(undefined)).toThrow(MissingUserError);
  });
});

describe('toolResult', () => {
  it('passes results through', async () => {
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        return { ok: 1 };
      }),
    ).resolves.toEqual({ ok: 1 });
  });

  it('returns client-error messages as-is', async () => {
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        throw new BadRequestException('La distribución debe sumar 100%.');
      }),
    ).resolves.toEqual({ error: 'La distribución debe sumar 100%.' });
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        throw new NotFoundException('Ingreso no encontrado.');
      }),
    ).resolves.toEqual({ error: 'Ingreso no encontrado.' });
  });

  it('hides unexpected errors behind a generic message', async () => {
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        throw new Error('db down');
      }),
    ).resolves.toEqual({
      error: 'No pude hacerlo ahora, probá de nuevo en un rato.',
    });
  });

  it('hides missing-user errors behind the generic message', async () => {
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        return requireUserId(new RequestContext());
      }),
    ).resolves.toEqual({
      error: 'No pude hacerlo ahora, probá de nuevo en un rato.',
    });
  });

  it('handles non-Error or non-exception thrown values gracefully', async () => {
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        throw null as unknown as Error;
      }),
    ).resolves.toEqual({
      error: 'No pude hacerlo ahora, probá de nuevo en un rato.',
    });
    await expect(
      toolResult('test-tool', undefined, async () => {
        await Promise.resolve();
        throw { getStatus: 42 } as unknown as Error;
      }),
    ).resolves.toEqual({
      error: 'No pude hacerlo ahora, probá de nuevo en un rato.',
    });
  });
});

describe('toolResult analytics', () => {
  const capture = vi.fn();
  beforeEach(() => {
    capture.mockReset();
    setPostHog({ capture } as unknown as PostHog);
  });
  const rc = (userId?: string) => {
    const r = new RequestContext();
    if (userId) r.set('userId', userId);
    return r;
  };
  const event = (outcome: string) => ({
    distinctId: 'u1',
    event: 'bot_tool_called',
    properties: { tool: 'record-expense', outcome },
  });

  it('tracks ok results', async () => {
    await toolResult('record-expense', rc('u1'), () => ({ created: 1 }));
    expect(capture).toHaveBeenCalledWith(event('ok'));
  });

  it('tracks returned and thrown client errors', async () => {
    await toolResult('record-expense', rc('u1'), () => ({ error: 'x' }));
    await toolResult('record-expense', rc('u1'), () => {
      throw new BadRequestException('x');
    });
    expect(capture).toHaveBeenNthCalledWith(1, event('client_error'));
    expect(capture).toHaveBeenNthCalledWith(2, event('client_error'));
  });

  it('tracks unexpected errors', async () => {
    await toolResult('record-expense', rc('u1'), () => {
      throw new Error('db down');
    });
    expect(capture).toHaveBeenCalledWith(event('error'));
  });

  it('does not track without a userId', async () => {
    await expect(
      toolResult('record-expense', rc(), () => requireUserId(rc())),
    ).resolves.toHaveProperty('error');
    expect(capture).not.toHaveBeenCalled();
  });
});
