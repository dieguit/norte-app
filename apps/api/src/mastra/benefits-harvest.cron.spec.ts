import { describe, expect, it, vi } from 'vitest';
import { BenefitsHarvestCron } from './benefits-harvest.cron';

describe('BenefitsHarvestCron', () => {
  it('runs the harvest with the extractor agent and survives failures', async () => {
    const generate = vi.fn().mockResolvedValue({ object: { benefits: [] } });
    const mastra = { getAgent: vi.fn(() => ({ generate })) };
    const harvest = vi.fn(async (extract: (p: string) => Promise<unknown>) => {
      await extract('prompt');
      return [
        {
          provider: 'galicia',
          url: 'u1',
          status: 'ok',
          extracted: 0,
          inserted: 0,
          benefits: [],
        },
        {
          provider: 'galicia',
          url: 'u2',
          status: 'failed',
          extracted: 0,
          inserted: 0,
          error: 'HTTP 503',
          benefits: [],
        },
      ];
    });
    const cron = new BenefitsHarvestCron(mastra as never, { harvest } as never);
    await cron.run(new Date('2026-10-21T06:00:00Z'));
    expect(mastra.getAgent).toHaveBeenCalledWith('benefitsExtractor');
    expect(generate).toHaveBeenCalledWith(
      'prompt',
      expect.objectContaining({ structuredOutput: expect.anything() }),
    );

    harvest.mockRejectedValueOnce(new Error('db down'));
    await expect(cron.tick()).resolves.toBeUndefined();
  });
});
