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
import type {
  GoalCompletionCompletedDto,
  GoalCompletionStaleDto,
  GoalCompletionInvalidDto,
} from './goals.dto';
import type { GoalCompletionPreview } from '@repo/shared-types';
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

type ProfileRow = typeof financialProfiles.$inferSelect;
type GoalRow = typeof financialGoals.$inferSelect;
type PlaceRow = typeof savingsPlaces.$inferSelect;
type SnapshotRow = typeof allocationPlanSnapshots.$inferSelect;
type AllocationRow = typeof allocationPlanEntries.$inferSelect;
type WithdrawalRow = typeof goalCompletionWithdrawals.$inferSelect;
type WithId = { id: string };

function completionDatabase() {
  const profile: ProfileRow = {
    userId: 'user-1',
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '1000.00',
    goalDedicationPercentage: '90.00',
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const goals: GoalRow[] = [
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
  const places: PlaceRow[] = [
    {
      id: bankId,
      userId: 'user-1',
      name: 'Banco',
      normalizedName: 'banco',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: cashId,
      userId: 'user-1',
      name: 'Efectivo',
      normalizedName: 'efectivo',
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
  const completionWithdrawals: WithdrawalRow[] = [];
  const snapshots: SnapshotRow[] = [
    {
      id: 'snapshot-current',
      userId: 'user-1',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '1000.00',
      createdAt: new Date(),
    },
  ];
  const allocations: AllocationRow[] = [
    {
      id: 'allocation-goal',
      snapshotId: 'snapshot-current',
      goalId,
      percentage: '60.00',
    },
    {
      id: 'allocation-other',
      snapshotId: 'snapshot-current',
      goalId: otherGoalId,
      percentage: '40.00',
    },
  ];
  const writes: Array<{ table: unknown; values: unknown; params: unknown[] }> =
    [];
  const params = (condition: unknown) =>
    new PgDialect().sqlToQuery(condition as never).params;
  const owned = <T extends WithId>(rows: T[], condition: unknown): T[] =>
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
      findMany: vi.fn(() => Promise.resolve(savingsPositions)),
    },
    goalInvestmentPositions: { findMany: vi.fn(() => Promise.resolve([])) },
    savingsPlaces: { findMany: vi.fn(() => Promise.resolve(places)) },
    savingContributions: {
      findMany: vi.fn(() => Promise.resolve(contributions)),
    },
    savingsPlaceTransfers: {
      findMany: vi.fn(() => Promise.resolve(transfers)),
    },
    goalCompletionWithdrawals: {
      findMany: vi.fn(() => Promise.resolve(completionWithdrawals)),
    },
  };
  const tx = {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          for: () => {
            if (table === financialProfiles) return Promise.resolve([profile]);
            if (table === financialGoals)
              return Promise.resolve(owned(goals, condition));
            if (table === savingsPlaces)
              return Promise.resolve(owned(places, condition));
            return Promise.resolve([]);
          },
          limit: () =>
            Promise.resolve(
              table === allocationPlanSnapshots
                ? snapshots.filter((row) =>
                    params(condition).includes(row.effectiveMonth),
                  )
                : [],
            ),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values, params: [] });
        if (table === allocationPlanEntries) {
          const rows = Array.isArray(values) ? values : [values];
          allocations.push(
            ...rows.map((row: unknown, index: number) => ({
              ...(row as AllocationRow),
              id: `allocation-created-${writes.length}-${index}`,
            })),
          );
          return Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([]),
          });
        }
        if (table === goalCompletionWithdrawals) {
          const rows = Array.isArray(values) ? values : [values];
          completionWithdrawals.push(
            ...rows.map((row: unknown, index: number) => {
              const r = row as WithdrawalRow;
              return {
                ...r,
                id: `withdrawal-${writes.length}-${index}`,
                createdAt: r.createdAt ?? new Date(),
              };
            }),
          );
          return Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([]),
          });
        }
        snapshots.push({
          ...(values as SnapshotRow),
          id: 'snapshot-created',
          createdAt: new Date(),
        });
        return Object.assign(Promise.resolve([{ id: 'snapshot-created' }]), {
          returning: () => Promise.resolve([{ id: 'snapshot-created' }]),
        });
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: (condition: unknown) => {
          const conditionParams = params(condition);
          writes.push({ table, values, params: conditionParams });
          const updated: WithId[] =
            table === financialGoals
              ? owned(goals, condition)
              : table === allocationPlanSnapshots
                ? owned(snapshots, condition)
                : [];
          if (table === financialGoals) {
            updated.forEach((goal) => {
              Object.assign(goal, values as GoalRow);
            });
          }
          if (table === allocationPlanSnapshots) {
            updated.forEach((row) => {
              Object.assign(row, values as SnapshotRow);
            });
          }
          if (table === financialProfiles)
            Object.assign(profile, values as ProfileRow);
          return Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve(updated.map(({ id }) => ({ id }))),
          });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: (condition: unknown) => {
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
        return Promise.resolve();
      },
    }),
  };
  const db = {
    query: queries,
    transaction: (callback: (executor: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
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
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.resolve(undefined),
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
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Objetivo no encontrado.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/${pausedGoalId}/completion`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
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
      .expect(({ body }: { body: { message: string } }) =>
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
      .expect(({ body }: { body: { message: string } }) =>
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
    const previewResBody = preview.body as GoalCompletionPreview;
    expect(previewResBody.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(previewResBody.proposal).toMatchObject({
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
      previewResBody.proposal.proposedSource.goals.find(
        (goal) => goal.id === goalId,
      ),
    ).toMatchObject({ status: 'completed' });
    expect(JSON.stringify(previewResBody)).not.toMatch(/updatedAt/);
    expect(state.writes).toHaveLength(0);
  });

  it('confirms completion with the exact previewed token, recording withdrawals and completing the goal without touching savings positions', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    const previewResBody = preview.body as GoalCompletionPreview;
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: previewResBody.previewToken })
      .expect(200);
    const confirmedBody = confirmed.body as GoalCompletionCompletedDto;
    expect(confirmedBody).toEqual({
      status: 'completed',
      completedAt: expect.any(String) as unknown,
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
    const previewResBody = preview.body as GoalCompletionPreview;
    state.goals.find((goal) => goal.id === goalId)!.name =
      'Changed after preview';
    const writesBefore = state.writes.length;
    const stale = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: previewResBody.previewToken })
      .expect(200);
    const staleBody = stale.body as GoalCompletionStaleDto;
    expect(staleBody.status).toBe('stale');
    expect(staleBody.preview.previewToken).not.toBe(
      previewResBody.previewToken,
    );
    expect(
      staleBody.preview.proposal.proposedSource.goals.find(
        (goal) => goal.id === goalId,
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
    const previewResBody = preview.body as GoalCompletionPreview;
    state.goals.find((goal) => goal.id === goalId)!.status = 'paused';
    const writesBefore = state.writes.length;
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: previewResBody.previewToken })
      .expect(200);
    const confirmedBody = confirmed.body as GoalCompletionInvalidDto;
    expect(confirmedBody).toEqual({
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
      .expect(({ body }: { body: { message: string } }) =>
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
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Lugar de ahorro no encontrado.'),
      );
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(200);
    const previewResBody = preview.body as GoalCompletionPreview;
    await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({
        withdrawals: [{ placeId: foreignPlaceId, amount: '1000.00' }],
        allocations: draftAllocations,
        previewToken: previewResBody.previewToken,
      })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
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
        .expect(({ body }: { body: { message: string } }) =>
          expect(body.message).toBe(message),
        );

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
        .expect(({ body }: { body: { message: string } }) =>
          expect(body.message).toBe(message),
        );
      expect(state.writes).toHaveLength(0);
    },
  );

  it('hides unexpected database errors behind a generic 500 without leaking SQL', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.reject(new Error('SELECT secret_column FROM financial_profiles')),
    );
    const context = await request(app.getHttpServer())
      .get(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .expect(500);
    const contextBody = context.body as { message: string };
    expect(contextBody.message).toBe('Internal Server Error');
    const preview = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion/preview`)
      .set('Authorization', authorization)
      .send(previewBody)
      .expect(500);
    const previewResBody = preview.body as { message: string };
    const confirm = await request(app.getHttpServer())
      .post(`/goals/${goalId}/completion`)
      .set('Authorization', authorization)
      .send({ ...previewBody, previewToken: 'a'.repeat(64) })
      .expect(500);
    const confirmBody = confirm.body as { message: string };
    expect(
      JSON.stringify({
        context: contextBody,
        preview: previewResBody,
        confirm: confirmBody,
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
