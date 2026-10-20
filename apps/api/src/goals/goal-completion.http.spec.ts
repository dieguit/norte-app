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
import { DATABASE_CONNECTION } from '../database/database.constants';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
  savingsPlaces,
} from '../profile/profile.schema';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import {
  createGoalCompletionPreviewToken,
  getGoalCompletionState,
} from './goal-creation.repository';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const goalId = '195cb991-5704-4b80-a696-405e92c907df';
const otherGoalId = '2b5e7162-00f4-4f03-a1b6-1d69443251a0';
const pausedGoalId = '3a1e9a38-30ab-4a15-85cb-1d31b152a79e';
const unknownGoalId = '3a1e9a38-30ab-4a15-85cb-1d31b152a79d';
const bankId = '4b3d1c1e-1111-4111-8111-111111111111';
const cashId = '4b3d1c1e-2222-4222-8222-222222222222';
const foreignPlaceId = '4b3d1c1e-3333-4333-8333-333333333333';
const draftWithdrawals = [
  { placeId: bankId, amount: '700.00' },
  { placeId: cashId, amount: '300.00' },
];
const draftAllocations = [{ goalId: otherGoalId, percentage: '100.00' }];

function completionDatabase() {
  const profile: any = {
    userId: 'user-1',
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '1000.00',
    goalDedicationPercentage: '90.00',
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const goals: any[] = [
    {
      id: goalId,
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
      id: otherGoalId,
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
      id: pausedGoalId,
      userId: 'user-1',
      name: 'Pausado',
      type: 'purchase',
      targetAmount: '600.00',
      currency: 'ARS',
      priority: 'low',
      strategy: 'save',
      status: 'paused',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-03-01T00:00:00Z'),
      updatedAt: new Date(),
    },
  ];
  const savingsPositions = [
    {
      id: 'saving-1',
      goalId,
      amount: '1000.00',
      currency: 'ARS',
      location: 'Banco',
    },
  ];
  const places: any[] = [
    {
      id: bankId,
      userId: 'user-1',
      name: 'Banco',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: cashId,
      userId: 'user-1',
      name: 'Efectivo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const contributions = [
    {
      id: 'contribution-bank',
      userId: 'user-1',
      placeId: bankId,
      amount: '700.00',
      currency: 'ARS',
      createdAt: new Date(),
    },
    {
      id: 'contribution-cash',
      userId: 'user-1',
      placeId: cashId,
      amount: '500.00',
      currency: 'ARS',
      createdAt: new Date(),
    },
  ];
  const transfers: any[] = [];
  const completionWithdrawals: any[] = [];
  const snapshots: any[] = [
    {
      id: 'snapshot-current',
      userId: 'user-1',
      effectiveMonth: '2026-08-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const allocations: any[] = [
    {
      id: 'allocation-goal',
      snapshotId: 'snapshot-current',
      goalId,
      percentage: '60.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'allocation-other',
      snapshotId: 'snapshot-current',
      goalId: otherGoalId,
      percentage: '40.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const writes: Array<{ table: unknown; values: unknown; params: unknown[] }> =
    [];
  const params = (condition: unknown) =>
    new PgDialect().sqlToQuery(condition as never).params;
  const owned = (rows: any[], condition: unknown) =>
    rows.filter((row) => params(condition).includes(row.id));
  const queries = {
    financialProfiles: { findFirst: vi.fn(async () => profile) },
    financialGoals: { findMany: vi.fn(async () => goals) },
    incomes: { findMany: vi.fn(async () => []) },
    expenses: { findMany: vi.fn(async () => []) },
    allocationPlanSnapshots: { findMany: vi.fn(async () => snapshots) },
    allocationPlanEntries: { findMany: vi.fn(async () => allocations) },
    goalSavingsPositions: { findMany: vi.fn(async () => savingsPositions) },
    goalInvestmentPositions: { findMany: vi.fn(async () => []) },
    savingsPlaces: { findMany: vi.fn(async () => places) },
    savingContributions: { findMany: vi.fn(async () => contributions) },
    savingsPlaceTransfers: { findMany: vi.fn(async () => transfers) },
    goalCompletionWithdrawals: {
      findMany: vi.fn(async () => completionWithdrawals),
    },
  };
  const tx = {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          for: async () => {
            if (table === financialProfiles) return [profile];
            if (table === financialGoals) return owned(goals, condition);
            if (table === savingsPlaces) return owned(places, condition);
            return [];
          },
          limit: async () =>
            table === allocationPlanSnapshots
              ? snapshots.filter((row) =>
                  params(condition).includes(row.effectiveMonth),
                )
              : [],
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: any) => {
        writes.push({ table, values, params: [] });
        if (table === allocationPlanEntries) {
          allocations.push(
            ...values.map((row: any, index: number) => ({
              ...row,
              id: `allocation-created-${writes.length}-${index}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
          return Object.assign(Promise.resolve(), {
            returning: async () => [],
          });
        }
        if (table === goalCompletionWithdrawals) {
          completionWithdrawals.push(
            ...values.map((row: any, index: number) => ({
              ...row,
              id: `withdrawal-${writes.length}-${index}`,
              createdAt: row.createdAt,
            })),
          );
          return Object.assign(Promise.resolve(), {
            returning: async () => [],
          });
        }
        snapshots.push({
          ...values,
          id: 'snapshot-created',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return Object.assign(Promise.resolve([{ id: 'snapshot-created' }]), {
          returning: async () => [{ id: 'snapshot-created' }],
        });
      },
    }),
    update: (table: unknown) => ({
      set: (values: any) => ({
        where: (condition: unknown) => {
          const conditionParams = params(condition);
          writes.push({ table, values, params: conditionParams });
          const updated =
            table === financialGoals
              ? owned(goals, condition)
              : table === allocationPlanSnapshots
                ? owned(snapshots, condition)
                : [];
          if (table === financialGoals)
            updated.forEach((goal) => Object.assign(goal, values));
          if (table === allocationPlanSnapshots)
            updated.forEach((row) => Object.assign(row, values));
          if (table === financialProfiles) Object.assign(profile, values);
          return Object.assign(Promise.resolve(), {
            returning: async () => updated.map(({ id }) => ({ id })),
          });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: async (condition: unknown) => {
        const conditionParams = params(condition);
        writes.push({ table, values: undefined, params: conditionParams });
        if (table === allocationPlanEntries)
          allocations.splice(
            0,
            allocations.length,
            ...allocations.filter(
              (row) => !conditionParams.includes(row.snapshotId),
            ),
          );
      },
    }),
  };
  const db = {
    query: queries,
    transaction: async (callback: (executor: typeof tx) => unknown) =>
      callback(tx),
  };
  return {
    db,
    profile,
    goals,
    places,
    snapshots,
    allocations,
    completionWithdrawals,
    writes,
  };
}

describe('goal completion HTTP with actual service and repository', () => {
  let app: INestApplication;
  let state: ReturnType<typeof completionDatabase>;
  const authorization = 'Bearer token';

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(async () => {
    state = completionDatabase();
    app = await makeApp(state.db);
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'user-1',
      iss: 'https://clerk.example.test',
    } as never);
  });
  afterEach(async () => app.close());

  const previewBody = {
    withdrawals: draftWithdrawals,
    allocations: draftAllocations,
  };

  it('returns the completion context with owned savings places and no raw metadata', async () => {
    const response = await request(app.getHttpServer())
      .get(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .expect(200);
    expect(response.body).toMatchObject({
      profile: 'present',
      context: {
        goalId,
        goalName: 'Notebook',
        targetAmount: { amount: '1000.00', currency: 'ARS' },
        savingsValue: { amount: '1000.00', currency: 'ARS' },
        currentMonth: '2026-08',
        plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
        savingsPlaces: [
          {
            id: bankId,
            name: 'Banco',
            balance: { amount: '700.00', currency: 'ARS' },
          },
          {
            id: cashId,
            name: 'Efectivo',
            balance: { amount: '500.00', currency: 'ARS' },
          },
        ],
        activeGoals: [
          { id: goalId, name: 'Notebook', currency: 'ARS' },
          { id: otherGoalId, name: 'Viaje', currency: 'ARS' },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /updatedAt|userId|createdAt/,
    );
  });

  it('returns the missing profile state without reading goal rows', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(
      async () => undefined,
    ) as never;
    await request(app.getHttpServer())
      .get(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .expect(200, { profile: 'missing' });
  });

  it('keeps original domain errors for unowned and not-completable targets', async () => {
    await request(app.getHttpServer())
      .get(`/goals/${unknownGoalId}/completion`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Objetivo no encontrado.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/${pausedGoalId}/completion`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'El objetivo no está listo para completarse.',
        ),
      );
  });

  it('validates auth, path, body shape, and first Spanish Zod issues before writes', async () => {
    await request(app.getHttpServer())
      .get(`/goals/${goalId}/completion`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .send(previewBody)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .send({ ...previewBody, previewToken: 'a'.repeat(64) })
      .expect(401);
    await request(app.getHttpServer())
      .get('/goals/not-a-uuid/completion')
      .set('Authorization', authorization)
      .expect(400);
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send({ ...previewBody, goalId })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send({
        withdrawals: [{ placeId: bankId, amount: '0x10' }],
        allocations: draftAllocations,
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Ingresá un monto mayor a cero, con hasta dos decimales.',
        ),
      );
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send({
        withdrawals: draftWithdrawals,
        allocations: [{ goalId: otherGoalId, percentage: 'bad' }],
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.',
        ),
      );
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: 'bad' })
      .expect(400);
    expect(state.writes).toHaveLength(0);
  });

  it('previews completion with safe projection and no writes', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    expect(preview.body.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.body.proposal).toMatchObject({
      goalId,
      goalName: 'Notebook',
      targetAmount: { amount: '1000.00', currency: 'ARS' },
      withdrawals: [
        {
          placeId: bankId,
          placeName: 'Banco',
          amount: { amount: '700.00', currency: 'ARS' },
        },
        {
          placeId: cashId,
          placeName: 'Efectivo',
          amount: { amount: '300.00', currency: 'ARS' },
        },
      ],
      pauseMonthlyCommitment: false,
    });
    expect(
      preview.body.proposal.proposedSource.goals.find(
        (goal: any) => goal.id === goalId,
      ),
    ).toMatchObject({ status: 'completed' });
    expect(JSON.stringify(preview.body)).not.toMatch(/updatedAt/);
    expect(state.writes).toHaveLength(0);
  });

  it('confirms completion with the exact previewed token, recording withdrawals and completing the goal without touching savings positions', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: preview.body.previewToken })
      .expect(200);
    expect(confirmed.body).toEqual({
      status: 'completed',
      completedAt: expect.any(String),
    });
    expect(state.goals.find((goal) => goal.id === goalId)).toMatchObject({
      status: 'completed',
    });
    expect(
      state.completionWithdrawals.map(({ placeId, amount, goalId: id }) => ({
        placeId,
        amount,
        goalId: id,
      })),
    ).toEqual([
      { placeId: bankId, amount: '700.00', goalId },
      { placeId: cashId, amount: '300.00', goalId },
    ]);
    expect(state.writes.some(({ table }) => table === financialProfiles)).toBe(
      false,
    );
  });

  it('returns a refreshed stale preview from the actual loader after source drift without writes', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    state.goals.find((goal) => goal.id === goalId)!.name =
      'Changed after preview';
    const writesBefore = state.writes.length;
    const stale = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: preview.body.previewToken })
      .expect(200);
    expect(stale.body.status).toBe('stale');
    expect(stale.body.preview.previewToken).not.toBe(preview.body.previewToken);
    expect(
      stale.body.preview.proposal.proposedSource.goals.find(
        (goal: any) => goal.id === goalId,
      ),
    ).toMatchObject({ name: 'Changed after preview' });
    expect(state.writes).toHaveLength(writesBefore);
    expect(state.goals.find((goal) => goal.id === goalId)!.status).toBe(
      'active',
    );
  });

  it('returns the original invalid union with no writes when the target stops being completable after preview', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    state.goals.find((goal) => goal.id === goalId)!.status = 'paused';
    const writesBefore = state.writes.length;
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: preview.body.previewToken })
      .expect(200);
    expect(confirmed.body).toEqual({
      status: 'invalid',
      message: 'No se puede completar el objetivo con el estado actual.',
    });
    expect(state.writes).toHaveLength(writesBefore);
  });

  it('keeps the original domain error when the token matches an already non-completable state', async () => {
    state.goals.find((goal) => goal.id === goalId)!.status = 'paused';
    const loaded = await getGoalCompletionState(
      state.db as never,
      'user-1',
      '2026-08',
      goalId,
    );
    const previewToken = createGoalCompletionPreviewToken(loaded!, '2026-08', {
      goalId,
      withdrawals: draftWithdrawals,
      allocations: draftAllocations,
    });
    const writesBefore = state.writes.length;
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'El objetivo no está listo para completarse.',
        ),
      );
    expect(state.writes).toHaveLength(writesBefore);
  });

  it('rejects foreign savings places before any write', async () => {
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send({
        withdrawals: [{ placeId: foreignPlaceId, amount: '1000.00' }],
        allocations: draftAllocations,
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Lugar de ahorro no encontrado.'),
      );
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({
        withdrawals: [{ placeId: foreignPlaceId, amount: '1000.00' }],
        allocations: draftAllocations,
        previewToken: preview.body.previewToken,
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Lugar de ahorro no encontrado.'),
      );
    expect(state.writes).toHaveLength(0);
  });

  it.each([
    [
      'sum mismatch',
      [{ goalId: otherGoalId, percentage: '50.00' }],
      'Allocation percentages must sum to 100%, got 50.00%',
    ],
    [
      'goal set mismatch',
      [{ goalId: pausedGoalId, percentage: '100.00' }],
      'Allocation draft must contain exactly the active goals',
    ],
  ])(
    'maps pause-builder allocation errors (%s) to safe 400 with zero writes on preview and token-matched confirm',
    async (_name, allocations, message) => {
      await request(app.getHttpServer())
        .post(`/goals/${goalId}/completion/preview`)
        .set('Authorization', authorization)
        .send({ withdrawals: draftWithdrawals, allocations })
        .expect(400)
        .expect(({ body }) => expect(body.message).toBe(message));

      const loaded = await getGoalCompletionState(
        state.db as never,
        'user-1',
        '2026-08',
        goalId,
      );
      const previewToken = createGoalCompletionPreviewToken(
        loaded!,
        '2026-08',
        { goalId, withdrawals: draftWithdrawals, allocations },
      );
      await request(app.getHttpServer())
        .post(`/goals/${goalId}/completion`)
        .set('Authorization', authorization)
        .send({ withdrawals: draftWithdrawals, allocations, previewToken })
        .expect(400)
        .expect(({ body }) => expect(body.message).toBe(message));
      expect(state.writes).toHaveLength(0);
    },
  );

  it('hides unexpected database errors behind a generic 500 without leaking SQL', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(async () => {
      throw new Error('SELECT secret_column FROM financial_profiles');
    }) as never;
    const context = await request(app.getHttpServer())
      .get(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .expect(500);
    expect(context.body.message).toBe('Internal Server Error');
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(500);
    const confirm = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: 'a'.repeat(64) })
      .expect(500);
    expect(
      JSON.stringify({
        context: context.body,
        preview: preview.body,
        confirm: confirm.body,
      }),
    ).not.toContain('secret_column');
  });
});

async function makeApp(db: unknown): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [GoalsController],
    providers: [
      GoalsService,
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
