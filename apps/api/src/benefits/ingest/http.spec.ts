import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPacedJsonFetch, IngestHttpError } from './http';

afterEach(() => vi.useRealTimers());
describe('paced JSON fetch', () => {
  it('paces concurrent requests globally', async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const fetchImpl = vi.fn(async () => {
      starts.push(Date.now());
      return Response.json({ ok: true });
    });
    const get = createPacedJsonFetch({
      fetchImpl,
      pacing: { minIntervalMs: 300, timeoutMs: 1000, retries: 0 },
    });
    const result = Promise.all([
      get('https://example.com/a'),
      get('https://example.com/b'),
      get('https://example.com/c'),
    ]);
    await vi.advanceTimersByTimeAsync(600);
    expect(await result).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(starts.map((t) => t - starts[0])).toEqual([0, 300, 600]);
  });

  it('bounds request timeout even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    const get = createPacedJsonFetch({
      fetchImpl: vi.fn(() => new Promise<Response>(() => {})),
      pacing: { minIntervalMs: 0, timeoutMs: 50, retries: 0 },
    });
    const result = expect(get('https://example.com')).rejects.toMatchObject({
      kind: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(50);
    await result;
  });

  it('also times out stalled JSON bodies', async () => {
    vi.useFakeTimers();
    const response = new Response(new ReadableStream({ start() {} }));
    const get = createPacedJsonFetch({
      fetchImpl: vi.fn(async () => response),
      pacing: { minIntervalMs: 0, timeoutMs: 50, retries: 0 },
    });
    const result = expect(get('https://example.com')).rejects.toMatchObject({
      kind: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(50);
    await result;
  });

  it('retries with bounded exponential backoff', async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const fetchImpl = vi.fn(async () => {
      starts.push(Date.now());
      return new Response('', { status: 503 });
    });
    const get = createPacedJsonFetch({
      fetchImpl,
      pacing: { minIntervalMs: 0, timeoutMs: 100, retries: 2 },
    });
    const result = expect(get('https://example.com')).rejects.toMatchObject({
      kind: 'http',
      status: 503,
    });
    await vi.advanceTimersByTimeAsync(1500);
    await result;
    expect(starts.map((t) => t - starts[0])).toEqual([0, 500, 1500]);
  });

  it('retries transient network errors and returns a typed final error', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const get = createPacedJsonFetch({
      fetchImpl,
      pacing: { minIntervalMs: 0, timeoutMs: 100, retries: 1 },
    });
    const result = expect(get('https://example.com')).rejects.toMatchObject({
      kind: 'network',
    });
    await vi.advanceTimersByTimeAsync(500);
    await result;
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([429, 503])('honors Retry-After seconds on %s', async (status) => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', { status, headers: { 'Retry-After': '2' } }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const get = createPacedJsonFetch({
      fetchImpl,
      pacing: { minIntervalMs: 0, timeoutMs: 100, retries: 1 },
    });
    const result = get('https://example.com');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual({ ok: true });
  });

  it('honors Retry-After HTTP dates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 429,
          headers: { 'Retry-After': 'Sat, 31 Oct 2026 12:00:03 GMT' },
        }),
      )
      .mockResolvedValueOnce(Response.json(null));
    const get = createPacedJsonFetch({
      fetchImpl,
      pacing: { minIntervalMs: 0, timeoutMs: 100, retries: 1 },
    });
    const result = get('https://example.com');
    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBeNull();
  });

  it('returns typed parse and HTTP errors without retrying permanent failures', async () => {
    for (const [response, kind] of [
      [new Response('invalid'), 'json'],
      [new Response('', { status: 404 }), 'http'],
    ] as const) {
      const fetchImpl = vi.fn(async () => response);
      await expect(
        createPacedJsonFetch({ fetchImpl })('https://example.com'),
      ).rejects.toBeInstanceOf(IngestHttpError);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const fresh = vi.fn(async () =>
        kind === 'json'
          ? new Response('invalid')
          : new Response('', { status: 404 }),
      );
      await expect(
        createPacedJsonFetch({ fetchImpl: fresh })('https://example.com'),
      ).rejects.toMatchObject({ kind });
    }
  });
});
