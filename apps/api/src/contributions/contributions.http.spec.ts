import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PgDialect } from 'drizzle-orm/pg-core';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  SavingContributionConfirmationSchema,
  SavingContributionContextStateSchema,
  SavingContributionEditPreviewSchema,
  SavingContributionPreviewSchema,
} from '@repo/shared-types';
import type { SavingContributionPreview } from '@repo/shared-types';
import type { SavingContributionStaleDto } from './contributions.dto';
import { DATABASE_CONNECTION } from '../database/database.constants';
import {
  financialProfiles,
  savingContributions,
  investmentContributions,
  goalInvestmentPositions,
  savingsPlaces,
} from '../profile/profile.schema';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const goalNotebook = '195cb991-5704-4b80-a696-405e92c907df';
const goalTrip = '2b5e7162-00f4-4f03-a1b6-1d69443251a0';
const goalFund = '3a1e9a38-30ab-4a15-85cb-1d31b152a79e';
const bankId = '4b3d1c1e-1111-4111-8111-111111111111';
const cashId = '4b3d1c1e-2222-4222-8222-222222222222';
const foreignPlaceId = '4b3d1c1e-3333-4333-8333-333333333333';
const savingContributionId = '5c1d1c1e-1111-4111-8111-111111111111';
const investmentContributionId = '5c1d1c1e-2222-4222-8222-222222222222';
const foreignContributionId = '5c1d1c1e-3333-4333-8333-333333333333';
const authorization = 'Bearer token';
const createdContributionId = '6d1d1c1e-1111-4111-8111-111111111111';
const savingDraft = {
  currency: 'ARS',
  amount: '300.00',
  place: { kind: 'existing', placeId: bankId },
};
const investmentDraft = {
  kind: 'investment',
  currency: 'ARS',
  amount: '200.00',
};

type WithId = { id: string };
type WhereArg = {
  where?: unknown;
};

function contributionDatabase() {
  const profile = {
    userId: 'user-1',
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '1000.00',
    goalDedicationPercentage: '90.00',
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const goals = [
    {
      id: goalNotebook,
      userId: 'user-1',
      name: 'Notebook',
      type: 'purchase',
      targetAmount: '1000.00',
      currency: 'ARS',
      priority: 'high',
      strategy: 'save',
      status: 'active',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date(),
    },
    {
      id: goalTrip,
      userId: 'user-1',
      name: 'Viaje',
      type: 'other',
      targetAmount: '5000.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'save',
      status: 'active',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date(),
    },
    {
      id: goalFund,
      userId: 'user-1',
      name: 'Fondo',
      type: 'retirement',
      targetAmount: '9000.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'invest',
      status: 'active',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-03-01T00:00:00Z'),
      updatedAt: new Date(),
    },
  ];
  const places = [
    {
      id: cashId,
      userId: 'user-1',
      name: 'Efectivo',
      normalizedName: 'efectivo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: bankId,
      userId: 'user-1',
      name: 'Banco',
      normalizedName: 'banco',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const savingRows = [
    {
      id: savingContributionId,
      userId: 'user-1',
      placeId: bankId,
      amount: '300.00',
      currency: 'ARS',
      arsSpent: null,
      effectiveRate: null,
      createdAt: new Date('2026-08-02T00:00:00Z'),
    },
  ];
  const investmentRows = [
    {
      id: investmentContributionId,
      userId: 'user-1',
      amount: '200.00',
      currency: 'ARS',
      arsSpent: null,
      effectiveRate: null,
      createdAt: new Date('2026-08-03T00:00:00Z'),
    },
  ];
  const savingAllocations = [
    {
      id: 'sal-1',
      contributionId: savingContributionId,
      goalId: goalNotebook,
      amount: '180.00',
      percentage: '60.00',
      savingPositionId: 'sp-1',
    },
    {
      id: 'sal-2',
      contributionId: savingContributionId,
      goalId: goalTrip,
      amount: '120.00',
      percentage: '40.00',
      savingPositionId: 'sp-2',
    },
  ];
  const investmentAllocations = [
    {
      id: 'ial-1',
      contributionId: investmentContributionId,
      goalId: goalFund,
      amount: '200.00',
      percentage: '100.00',
      investmentPositionId: 'ip-1',
    },
  ];
  const savingPositions = [
    { id: 'sp-1', goalId: goalNotebook, amount: '180.00', currency: 'ARS' },
    { id: 'sp-2', goalId: goalTrip, amount: '120.00', currency: 'ARS' },
  ];
  const investmentPositions = [
    { id: 'ip-1', goalId: goalFund, currentValue: '1200.00', currency: 'ARS' },
  ];
  const snapshots = [
    {
      id: 'snapshot-current',
      userId: 'user-1',
      effectiveMonth: '2026-08-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const allocations = [
    {
      id: 'plan-notebook',
      snapshotId: 'snapshot-current',
      goalId: goalNotebook,
      percentage: '60.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'plan-trip',
      snapshotId: 'snapshot-current',
      goalId: goalTrip,
      percentage: '40.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'plan-fund',
      snapshotId: 'snapshot-current',
      goalId: goalFund,
      percentage: '100.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const writes: Array<{ table: unknown; values: unknown; params: unknown[] }> =
    [];
  const params = (condition: unknown) =>
    new PgDialect().sqlToQuery(condition as never).params;
  const byId = <T extends WithId>(rows: T[], condition: unknown): T[] =>
    rows.filter((row) => params(condition).includes(row.id));
  const queries = {
    financialProfiles: { findFirst: vi.fn(() => Promise.resolve(profile)) },
    financialGoals: { findMany: vi.fn(() => Promise.resolve(goals)) },
    incomes: { findMany: vi.fn(() => Promise.resolve([])) },
    expenses: { findMany: vi.fn(() => Promise.resolve([])) },
    allocationPlanSnapshots: {
      findMany: vi.fn(() => Promise.resolve(snapshots)),
    },
    allocationPlanEntries: {
      findMany: vi.fn(() => Promise.resolve(allocations)),
    },
    goalSavingsPositions: {
      findMany: vi.fn(() => Promise.resolve(savingPositions)),
    },
    goalInvestmentPositions: {
      findMany: vi.fn(() => Promise.resolve(investmentPositions)),
      findFirst: vi.fn((args?: WhereArg) =>
        Promise.resolve(filterRows(investmentPositions, args?.where)[0]),
      ),
    },
    savingsPlaces: {
      findMany: vi.fn(() => Promise.resolve(places)),
      findFirst: vi.fn((args?: WhereArg) =>
        Promise.resolve(filterRows(places, args?.where)[0]),
      ),
    },
    savingContributions: {
      findMany: vi.fn(() => Promise.resolve(savingRows)),
      findFirst: vi.fn((args?: WhereArg) =>
        Promise.resolve(filterRows(savingRows, args?.where)[0]),
      ),
    },
    investmentContributions: {
      findMany: vi.fn(() => Promise.resolve(investmentRows)),
      findFirst: vi.fn((args?: WhereArg) =>
        Promise.resolve(filterRows(investmentRows, args?.where)[0]),
      ),
    },
    savingContributionAllocations: {
      findMany: vi.fn((args?: WhereArg) =>
        Promise.resolve(filterRows(savingAllocations, args?.where)),
      ),
    },
    investmentContributionAllocations: {
      findMany: vi.fn((args?: WhereArg) =>
        Promise.resolve(filterRows(investmentAllocations, args?.where)),
      ),
    },
  };
  const tx = {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          for: () => {
            if (table === financialProfiles) return Promise.resolve([profile]);
            if (table === savingsPlaces)
              return Promise.resolve(byId(places, condition));
            return Promise.resolve([]);
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values, params: [] });
        return Object.assign(Promise.resolve([]), {
          returning: () => Promise.resolve([{ id: createdContributionId }]),
        });
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: (condition: unknown) => {
          writes.push({ table, values, params: params(condition) });
          return Object.assign(Promise.resolve([]), {
            returning: () => Promise.resolve([{ id: 'updated' }]),
          });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: (condition: unknown) => {
        writes.push({ table, values: undefined, params: params(condition) });
        return Promise.resolve();
      },
    }),
  };
  const db = {
    query: queries,
    transaction: (callback: (executor: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
  };
  return { db, profile, goals, places, savingRows, investmentRows, writes };
}

// Interprets the `"column" = $n` / `"column" in ($n, ...)` clauses drizzle renders, ANDed.
function filterRows<T extends Record<string, unknown>>(
  rows: T[],
  where: unknown,
): T[] {
  if (!where) return rows;
  const { sql, params } = new PgDialect().sqlToQuery(where as never);
  const clauses = [
    ...sql.matchAll(/"(\w+)" (?:=|in) \(?(\$\d+(?:, \$\d+)*)\)?/g),
  ].map(([, column, refs]) => ({
    key: column.replace(/_(\w)/g, (_, c: string) => c.toUpperCase()),
    values: refs.split(', ').map((ref) => params[Number(ref.slice(1)) - 1]),
  }));
  return rows.filter((row) =>
    clauses.every(({ key, values }) => values.includes(row[key])),
  );
}

describe('contributions HTTP with actual service and repository', () => {
  let app: INestApplication;
  let state: ReturnType<typeof contributionDatabase>;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(async () => {
    state = contributionDatabase();
    app = await makeApp(state.db);
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'user-1',
      iss: 'https://clerk.example.test',
    } as never);
  });
  afterEach(async () => app.close());

  it('requires authentication on every contribution route', async () => {
    await request(app.getHttpServer())
      .get('/contributions/saving/context')
      .expect(401);
    await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .send(savingDraft)
      .expect(401);
    await request(app.getHttpServer())
      .post('/contributions/saving')
      .send({ draft: savingDraft, previewToken: 'a'.repeat(64) })
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/contributions/saving/${savingContributionId}`)
      .send({ draft: savingDraft })
      .expect(401);
    await request(app.getHttpServer())
      .delete(`/contributions/saving/${savingContributionId}`)
      .expect(401);
  });

  it('returns the owned context with places sorted and no raw metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/contributions/saving/context')
      .set('Authorization', authorization)
      .expect(200);
    expect(
      SavingContributionContextStateSchema.parse(response.body),
    ).toMatchObject({
      profile: 'present',
      context: {
        currentMonth: '2026-08',
        places: [
          { id: bankId, name: 'Banco' },
          { id: cashId, name: 'Efectivo' },
        ],
        eligibleGoals: [
          { id: goalNotebook, name: 'Notebook' },
          { id: goalTrip, name: 'Viaje' },
        ],
        eligibleInvestmentGoals: [{ id: goalFund, name: 'Fondo' }],
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /updatedAt|userId|createdAt/,
    );
  });

  it('returns the missing profile state', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.resolve(undefined),
    ) as never;
    await request(app.getHttpServer())
      .get('/contributions/saving/context')
      .set('Authorization', authorization)
      .expect(200, { profile: 'missing' });
  });

  it('validates body shape and first Spanish domain issues before writes', async () => {
    await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send({ currency: 'ARS', amount: '300.00' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send({ ...savingDraft, extra: true })
      .expect(400);
    await request(app.getHttpServer())
      .post('/contributions/saving')
      .set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: 'bad' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/contributions/saving/not-a-uuid')
      .set('Authorization', authorization)
      .send({ draft: savingDraft })
      .expect(400);
    await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send({ ...savingDraft, amount: '0' })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Contribution amount must be positive'),
      );
    expect(state.writes).toHaveLength(0);
  });

  it('previews a saving contribution with a safe response and no writes', async () => {
    const response = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(200);
    const parsed = SavingContributionPreviewSchema.parse(response.body);
    expect(
      parsed.preview.allocations.map(({ goalId, amount }) => [
        goalId,
        amount.amount,
      ]),
    ).toEqual([
      [goalNotebook, '180.00'],
      [goalTrip, '120.00'],
    ]);
    expect(parsed.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(response.body)).not.toMatch(/updatedAt/);
    expect(state.writes).toHaveLength(0);
  });

  it('confirms a saving contribution with the exact previewed token', async () => {
    const preview = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(200);
    const previewBody = preview.body as SavingContributionPreview;
    const confirmed = await request(app.getHttpServer())
      .post('/contributions/saving')
      .set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: previewBody.previewToken })
      .expect(200);
    expect(SavingContributionConfirmationSchema.parse(confirmed.body)).toEqual({
      status: 'created',
      contributionId: expect.any(String) as unknown,
    });
    expect(state.writes).toContainEqual(
      expect.objectContaining({
        table: savingContributions,
        values: expect.objectContaining({
          amount: '300.00',
          placeId: bankId,
        }) as unknown,
      }),
    );
    expect(state.writes.some(({ table }) => table === financialProfiles)).toBe(
      false,
    );
  });

  it('returns a refreshed stale preview with zero writes after the loaded goal changes', async () => {
    const preview = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(200);
    const previewBody = preview.body as SavingContributionPreview;
    state.goals.find((goal) => goal.id === goalNotebook)!.name =
      'Changed after preview';
    const writesBefore = state.writes.length;
    const stale = await request(app.getHttpServer())
      .post('/contributions/saving')
      .set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: previewBody.previewToken })
      .expect(200);
    const staleBody = stale.body as SavingContributionStaleDto;
    expect(SavingContributionConfirmationSchema.parse(stale.body).status).toBe(
      'stale',
    );
    expect(staleBody.preview.previewToken).not.toBe(previewBody.previewToken);
    expect(state.writes).toHaveLength(writesBefore);
  });

  it('confirms an investment contribution and moves the investment position value', async () => {
    const preview = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(investmentDraft)
      .expect(200);
    const previewBody = preview.body as SavingContributionPreview;
    expect(
      previewBody.preview.allocations.map((allocation) => [
        allocation.goalId,
        allocation.amount.amount,
      ]),
    ).toEqual([[goalFund, '200.00']]);
    await request(app.getHttpServer())
      .post('/contributions/saving')
      .set('Authorization', authorization)
      .send({ draft: investmentDraft, previewToken: previewBody.previewToken })
      .expect(200)
      .expect(({ body }: { body: { status: string } }) =>
        expect(body.status).toBe('created'),
      );
    expect(state.writes).toContainEqual(
      expect.objectContaining({
        table: investmentContributions,
        values: expect.objectContaining({ amount: '200.00' }) as unknown,
      }),
    );
    expect(state.writes).toContainEqual({
      table: goalInvestmentPositions,
      values: { currentValue: '1400.00' },
      params: expect.any(Array) as unknown,
    });
    expect(
      state.writes.some(({ table }) => table === savingContributions),
    ).toBe(false);
  });

  it('previews an owned contribution edit against its own goals and stored percentages without writes', async () => {
    const response = await request(app.getHttpServer())
      .post(`/contributions/saving/${savingContributionId}/preview`)
      .set('Authorization', authorization)
      .send({ ...savingDraft, amount: '500.00' })
      .expect(200);
    expect(
      SavingContributionEditPreviewSchema.parse(
        response.body,
      ).preview.allocations.map(({ goalId, amount }) => [
        goalId,
        amount.amount,
      ]),
    ).toEqual([
      [goalNotebook, '300.00'],
      [goalTrip, '200.00'],
    ]);
    expect(state.writes).toHaveLength(0);
    await request(app.getHttpServer())
      .post(`/contributions/saving/${foreignContributionId}/preview`)
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe(
          'Contribution not found or not owned by user.',
        ),
      );
  });

  it('keeps the create preview route distinct from the edit preview route', async () => {
    await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(200)
      .expect(({ body }: { body: { previewToken: string } }) =>
        expect(body.previewToken).toMatch(/^[a-f0-9]{64}$/),
      );
  });

  it('updates an owned saving contribution with its place and allocation amounts', async () => {
    await request(app.getHttpServer())
      .patch(`/contributions/saving/${savingContributionId}`)
      .set('Authorization', authorization)
      .send({ draft: { ...savingDraft, amount: '500.00' } })
      .expect(200, { status: 'updated' });
    expect(state.writes).toContainEqual(
      expect.objectContaining({
        table: savingContributions,
        values: expect.objectContaining({
          amount: '500.00',
          placeId: bankId,
        }) as unknown,
      }),
    );
  });

  it('deletes an owned investment contribution and reverses its position value', async () => {
    await request(app.getHttpServer())
      .delete(`/contributions/saving/${investmentContributionId}`)
      .set('Authorization', authorization)
      .expect(200, { status: 'deleted' });
    expect(state.writes).toContainEqual({
      table: goalInvestmentPositions,
      values: { currentValue: '1000.00' },
      params: expect.any(Array) as unknown,
    });
    expect(state.writes).toContainEqual({
      table: investmentContributions,
      values: undefined,
      params: expect.any(Array) as unknown,
    });
  });

  it('keeps ownership and place errors as original domain messages with zero writes', async () => {
    await request(app.getHttpServer())
      .patch(`/contributions/saving/${foreignContributionId}`)
      .set('Authorization', authorization)
      .send({ draft: savingDraft })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe(
          'Contribution not found or not owned by user.',
        ),
      );
    await request(app.getHttpServer())
      .delete(`/contributions/saving/${foreignContributionId}`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe(
          'Contribution not found or not owned by user.',
        ),
      );
    const foreignDraft = {
      currency: 'ARS',
      amount: '300.00',
      place: { kind: 'existing', placeId: foreignPlaceId },
    };
    const preview = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(foreignDraft)
      .expect(200);
    const previewBody = preview.body as SavingContributionPreview;
    await request(app.getHttpServer())
      .post('/contributions/saving')
      .set('Authorization', authorization)
      .send({ draft: foreignDraft, previewToken: previewBody.previewToken })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Lugar de ahorro no encontrado.'),
      );
    expect(state.writes).toHaveLength(0);
  });

  it('rejects a catch-up month other than the previous calendar month before writes', async () => {
    const preview = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(200);
    const previewBody = preview.body as SavingContributionPreview;
    await request(app.getHttpServer())
      .post('/contributions/saving')
      .set('Authorization', authorization)
      .send({
        draft: savingDraft,
        previewToken: previewBody.previewToken,
        catchUpMonth: '2026-06',
      })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Solo podés regularizar el mes anterior.'),
      );
    expect(state.writes).toHaveLength(0);
  });

  it('hides unexpected database errors behind a generic 500 without leaking SQL', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.reject(new Error('SELECT secret_column FROM financial_profiles')),
    );
    const context = await request(app.getHttpServer())
      .get('/contributions/saving/context')
      .set('Authorization', authorization)
      .expect(500);
    const contextBody = context.body as { message: string };
    expect(contextBody.message).toEqual(
      expect.stringMatching(/internal server error/i),
    );
    const preview = await request(app.getHttpServer())
      .post('/contributions/saving/preview')
      .set('Authorization', authorization)
      .send(savingDraft)
      .expect(500);
    const previewBody = preview.body as { message: string };
    expect(
      JSON.stringify({ context: contextBody, preview: previewBody }),
    ).not.toContain('secret_column');
  });
});

async function makeApp(db: unknown): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [ContributionsController],
    providers: [
      ContributionsService,
      ClerkAuthGuard,
      { provide: DATABASE_CONNECTION, useValue: db },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: (key: string) =>
            ({
              CLERK_SECRET_KEY: 'key',
              CLERK_ISSUER_URL: 'https://clerk.example.test',
              CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'],
            })[key],
        },
      },
    ],
  }).compile();
  const app = module.createNestApplication();
  await app.init();
  return app;
}
