import { describe, expect, it, vi } from 'vitest';
import { BenefitsHarvestCron } from './benefits-harvest.cron';

describe('BenefitsHarvestCron', () => {
  it('delegates nightly persistence and logs each source at its severity', async () => {
    const generate = vi.fn().mockResolvedValue({ object: { benefits: [] } });
    const mastra = { getAgent: vi.fn(() => ({ generate })) };
    const harvestNightly = vi.fn(
      async (extract: (p: string) => Promise<unknown>) => {
        await extract('prompt');
        return {
          results: ['ok', 'blocked', 'partial', 'failed'].map((outcome) => ({
            sourceId: outcome,
            outcome,
            candidates: outcome === 'ok' ? [{}] : [],
            rejected: [],
            diagnostics: ['diagnostic'],
          })),
          summaries: {},
          expired: 0,
        };
      },
    );
    const cron = new BenefitsHarvestCron(
      mastra as never,
      { harvestNightly } as never,
    );
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    Object.assign(cron, { logger });
    const now = new Date('2026-10-30T06:00:00Z');
    await cron.run(now);
    expect(harvestNightly).toHaveBeenCalledWith(expect.any(Function), now);
    expect(mastra.getAgent).toHaveBeenCalledWith('benefitsExtractor');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
    harvestNightly.mockRejectedValueOnce(new Error('db down'));
    await expect(cron.tick()).resolves.toBeUndefined();
  });
});
