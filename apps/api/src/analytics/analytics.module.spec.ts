import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PostHog } from 'posthog-node';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsModule } from './analytics.module';
import { getPostHog } from './posthog';

describe('AnalyticsModule', () => {
  it('provides a disabled PostHog client when POSTHOG_TOKEN is not set', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .useMocker((token) => {
        if (token === ConfigService) {
          return {
            get: vi.fn((key: string) => {
              if (key === 'POSTHOG_TOKEN') return undefined;
              if (key === 'POSTHOG_HOST') return 'https://us.i.posthog.com';
              return undefined;
            }),
          };
        }
      })
      .compile();

    const posthog = moduleRef.get(PostHog);
    expect(posthog).toBeDefined();
    expect(posthog.options.disabled).toBe(true);
    expect(getPostHog()).toBe(posthog);
    await moduleRef.close();
  });

  it('shuts down PostHog on application shutdown', async () => {
    const shutdownSpy = vi.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .useMocker((token) => {
        if (token === ConfigService) {
          return {
            get: vi.fn((key: string) => {
              if (key === 'POSTHOG_TOKEN') return 'phc_valid';
              if (key === 'POSTHOG_HOST') return 'https://eu.i.posthog.com';
              return undefined;
            }),
          };
        }
      })
      .compile();

    const posthog = moduleRef.get(PostHog);
    posthog.shutdown = shutdownSpy;

    await moduleRef.close();
    expect(shutdownSpy).toHaveBeenCalled();
  });
});
