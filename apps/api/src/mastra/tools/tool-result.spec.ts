import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it } from 'vitest';
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
      toolResult(async () => {
        await Promise.resolve();
        return { ok: 1 };
      }),
    ).resolves.toEqual({ ok: 1 });
  });

  it('returns client-error messages as-is', async () => {
    await expect(
      toolResult(async () => {
        await Promise.resolve();
        throw new BadRequestException('La distribución debe sumar 100%.');
      }),
    ).resolves.toEqual({ error: 'La distribución debe sumar 100%.' });
    await expect(
      toolResult(async () => {
        await Promise.resolve();
        throw new NotFoundException('Ingreso no encontrado.');
      }),
    ).resolves.toEqual({ error: 'Ingreso no encontrado.' });
  });

  it('hides unexpected errors behind a generic message', async () => {
    await expect(
      toolResult(async () => {
        await Promise.resolve();
        throw new Error('db down');
      }),
    ).resolves.toEqual({
      error: 'No pude hacerlo ahora, probá de nuevo en un rato.',
    });
  });

  it('hides missing-user errors behind the generic message', async () => {
    await expect(
      toolResult(async () => {
        await Promise.resolve();
        return requireUserId(new RequestContext());
      }),
    ).resolves.toEqual({
      error: 'No pude hacerlo ahora, probá de nuevo en un rato.',
    });
  });
});
