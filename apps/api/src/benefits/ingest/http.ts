import type { AdapterContext } from './types';

export class IngestHttpError extends Error {
  constructor(
    public readonly kind: 'http' | 'timeout' | 'network' | 'json',
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'IngestHttpError';
  }
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function retryAfterMs(response: Response): number {
  const header = response.headers.get('Retry-After');
  if (!header || ![429, 503].includes(response.status)) return 0;
  if (/^\d+(\.\d+)?$/.test(header)) return Number(header) * 1000;
  return Math.max(0, Date.parse(header) - Date.now()) || 0;
}

function requestError(
  error: unknown,
  aborted: boolean,
  url: string,
): IngestHttpError {
  if (aborted)
    return new IngestHttpError('timeout', `Request timed out: ${url}`);
  if (error instanceof IngestHttpError) return error;
  return new IngestHttpError('network', String(error));
}

function retryable(error: IngestHttpError): boolean {
  if (error.kind === 'json') return false;
  if (error.kind !== 'http') return true;
  return error.status === 429 || (error.status ?? 0) >= 500;
}

export function createPacedJsonFetch(
  ctx: Pick<AdapterContext, 'fetchImpl' | 'pacing'>,
) {
  const {
    minIntervalMs = 300,
    timeoutMs = 15_000,
    retries = 2,
  } = ctx.pacing ?? {};
  let lastStart = -Infinity;
  let queue = Promise.resolve();
  return async (url: string): Promise<unknown> => {
    for (let attempt = 0; ; attempt++) {
      const turn = queue.then(async () => {
        const delay = lastStart + minIntervalMs - Date.now();
        if (delay > 0) await wait(delay);
        lastStart = Date.now();
      });
      queue = turn.catch(() => {});
      await turn;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let retryAfter = 0;
      try {
        return await Promise.race([
          (async () => {
            const response = await ctx.fetchImpl(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NorteBenefitsBot/1.0)',
              },
            });
            if (!response.ok) {
              retryAfter = retryAfterMs(response);
              await response.body?.cancel();
              throw new IngestHttpError(
                'http',
                `HTTP ${response.status}: ${url}`,
                response.status,
              );
            }
            try {
              return await response.json();
            } catch (error) {
              if (controller.signal.aborted) throw error;
              throw new IngestHttpError('json', `Invalid JSON: ${url}`);
            }
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(
                new IngestHttpError('timeout', `Request timed out: ${url}`),
              );
            }, timeoutMs);
          }),
        ]);
      } catch (error) {
        const typed = requestError(error, controller.signal.aborted, url);
        if (timer) clearTimeout(timer);
        if (attempt >= retries || !retryable(typed)) throw typed;
        await wait(Math.max(500 * 2 ** attempt, retryAfter));
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };
}
