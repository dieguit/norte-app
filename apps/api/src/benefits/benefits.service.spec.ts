import { ConfigService } from '@nestjs/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { BenefitsService } from './benefits.service';

const write = vi.fn().mockResolvedValue(undefined);
const setting = vi.fn();
const tx = {
  insert: () => ({ values: () => ({ onConflictDoUpdate: write }) }),
};
const transaction = vi.fn(async (fn) => fn(tx));
const service = new BenefitsService(
  { transaction } as never,
  { updateSetting: setting } as never,
  new ConfigService({ WEB_APP_URL: 'https://app.test' }),
);
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(service, 'banks').mockResolvedValue({
    banks: [
      {
        slug: 'galicia',
        name: 'Galicia',
        coverage: 'modo_and_own',
        ownCatalogScope: null,
        tiers: [{ code: 'eminent', label: 'Éminent' }],
        stale: false,
      },
    ],
  });
  vi.spyOn(service, 'getPreferences').mockResolvedValue({
    banks: [],
    usesModo: false,
    categories: [],
    enabled: false,
  });
});
it('validates dynamic bank/tier and categories before writing', async () => {
  const input = {
    banks: [{ slug: 'unknown', tier: null, cards: [] }],
    usesModo: false,
    categories: ['supermercados' as const],
  };
  await expect(service.savePreferences('u', input)).rejects.toThrow();
  await expect(
    service.savePreferences('u', {
      ...input,
      banks: [{ slug: 'galicia', tier: 'wrong', cards: [] }],
    }),
  ).rejects.toThrow();
  await expect(
    service.savePreferences('u', { ...input, banks: [], categories: [] }),
  ).rejects.toThrow();
  expect(transaction).not.toHaveBeenCalled();
});
it('PUT activates digest transactionally, agent patches do not', async () => {
  await service.savePreferences('u', {
    banks: [{ slug: 'galicia', tier: null, cards: [] }],
    usesModo: false,
    categories: ['supermercados'],
  });
  expect(setting).toHaveBeenCalledWith(
    'u',
    'savings_digest',
    { enabled: true },
    tx,
  );
  setting.mockClear();
  await service.updateProfile('u', { usesModo: true });
  expect(setting).not.toHaveBeenCalled();
  expect(write).toHaveBeenCalledTimes(2);
});
it('marks a dual-source bank stale when either source has no fresh run', async () => {
  const rows = [
    [
      {
        slug: 'galicia',
        name: 'Galicia',
        playdigitalId: 'pd',
        ownCatalog: true,
        ownCatalogScope: null,
      },
    ],
    [{ source: 'galicia', bankSlug: 'galicia' }],
  ];
  const db = {
    select: () => ({ from: () => ({ where: async () => rows.shift() }) }),
  };
  const fresh = new BenefitsService(
    db as never,
    {} as never,
    new ConfigService({}),
  );
  expect((await fresh.banks()).banks[0]!.stale).toBe(true);
});
