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
} from '../profile/profile.schema';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const activeGoalId = '195cb991-5704-4b80-a696-405e92c907df';
const pausedGoalId = '2b5e7162-00f4-4f03-a1b6-1d69443251a0';
const completedGoalId = '3a1e9a38-30ab-4a15-85cb-1d31b152a79e';
const unknownGoalId = '3a1e9a38-30ab-4a15-85cb-1d31b152a79d';

function lifecycleDatabase() {
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
      id: activeGoalId,
      userId: 'user-1',
      name: 'Old goal',
      type: 'purchase',
      targetAmount: '500.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'save',
      status: 'active',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date(),
    },
    {
      id: pausedGoalId,
      userId: 'user-1',
      name: 'Paused goal',
      type: 'purchase',
      targetAmount: '600.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'save',
      status: 'paused',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date(),
    },
    {
      id: completedGoalId,
      userId: 'user-1',
      name: 'Done goal',
      type: 'purchase',
      targetAmount: '1.00',
      currency: 'ARS',
      priority: 'low',
      strategy: 'save',
      status: 'completed',
      desiredDate: null,
      completedAt: new Date('2026-03-01T00:00:00Z'),
      emergencyFundMonths: null,
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date(),
    },
  ];
  const incomes = [
    {
      id: 'income-1',
      userId: 'user-1',
      sourceKind: 'salary',
      sourceId: null,
      concept: null,
      amount: '5000.00',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-01-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const expenses = [
    {
      id: 'expense-1',
      userId: 'user-1',
      sourceKind: 'housing',
      sourceId: null,
      concept: null,
      amount: '3000.00',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-01-01',
      endMonth: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
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
      id: 'allocation-current',
      snapshotId: 'snapshot-current',
      goalId: activeGoalId,
      percentage: '100.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const writes: Array<{ table: unknown; values: unknown; params: unknown[] }> =
    [];
  const params = (condition: unknown) =>
    new PgDialect().sqlToQuery(condition as never).params;
  const queries = {
    financialProfiles: { findFirst: vi.fn(async () => profile) },
    financialGoals: { findMany: vi.fn(async () => goals) },
    incomes: { findMany: vi.fn(async () => incomes) },
    expenses: { findMany: vi.fn(async () => expenses) },
    allocationPlanSnapshots: { findMany: vi.fn(async () => snapshots) },
    goalSavingsPositions: { findMany: vi.fn(async () => []) },
    goalInvestmentPositions: { findMany: vi.fn(async () => []) },
    allocationPlanEntries: { findMany: vi.fn(async () => allocations) },
  };
  const tx = {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          for: async () => (table === financialProfiles ? [profile] : []),
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
        if (table === allocationPlanEntries) {
          writes.push({ table, values, params: [] });
          allocations.push(
            ...values.map((row: any, index: number) => ({
              ...row,
              id: `allocation-created-${writes.length}-${index}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
          return Promise.resolve();
        }
        writes.push({ table, values, params: [] });
        return {
          returning: async () => {
            snapshots.push({
              ...values,
              id: 'snapshot-created',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            return [{ id: 'snapshot-created' }];
          },
        };
      },
    }),
    update: (table: unknown) => ({
      set: (values: any) => ({
        where: async (condition: unknown) => {
          const conditionParams = params(condition);
          writes.push({ table, values, params: conditionParams });
          if (table === financialGoals)
            goals
              .filter((goal) => conditionParams.includes(goal.id))
              .forEach((goal) => Object.assign(goal, values));
          if (table === financialProfiles) Object.assign(profile, values);
          if (table === allocationPlanSnapshots)
            snapshots
              .filter((row) => conditionParams.includes(row.id))
              .forEach((row) => Object.assign(row, values));
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
  return { db, profile, goals, snapshots, allocations, writes };
}

describe('goal lifecycle HTTP with actual service and repository', () => {
  let app: INestApplication;
  let state: ReturnType<typeof lifecycleDatabase>;
  const authorization = 'Bearer token';

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(async () => {
    state = lifecycleDatabase();
    app = await makeApp(state.db);
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'user-1',
      iss: 'https://clerk.example.test',
    } as never);
  });
  afterEach(async () => app.close());

  it('returns the selected active goal lifecycle context through the common plan without raw metadata', async () => {
    const response = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(200);
    expect(response.body).toEqual({
      profile: 'present',
      context: {
        currentMonth: '2026-08',
        expensesKnowledge: 'known',
        hasEmergencyFund: false,
        plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [{ goalId: activeGoalId, percentage: '100.00' }],
        },
      },
      lifecycleContext: {
        goalId: activeGoalId,
        lifecycle: 'pause',
        goalName: 'Old goal',
        goalCurrency: 'ARS',
        currentMonth: '2026-08',
        plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
        activeGoals: [{ id: activeGoalId, name: 'Old goal', currency: 'ARS' }],
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [{ goalId: activeGoalId, percentage: '100.00' }],
        },
      },
    });
    expect(response.body).not.toHaveProperty('editContext');
    expect(response.body).not.toHaveProperty('allocationContext');
    expect(JSON.stringify(response.body)).not.toMatch(
      /updatedAt|userId|createdAt/,
    );
  });

  it('returns paused resume context and lifecycle-specific target statuses', async () => {
    const resume = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${pausedGoalId}&action=resume`)
      .set('Authorization', authorization)
      .expect(200);
    expect(resume.body.lifecycleContext).toMatchObject({
      goalId: pausedGoalId,
      lifecycle: 'resume',
      goalName: 'Paused goal',
    });

    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${pausedGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Only active goals can be paused.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=resume`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Only paused goals can be resumed.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${completedGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Only active goals can be paused.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${unknownGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe('Goal not found.'));
  });

  it('returns the missing profile state for lifecycle context without reading goal rows', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(
      async () => undefined,
    ) as never;
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(200, { profile: 'missing' });
  });

  it('validates lifecycle query and body boundaries before service work', async () => {
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=pause`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/goals/plan?action=pause`)
      .set('Authorization', authorization)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=complete`)
      .set('Authorization', authorization)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=bad&action=pause`)
      .set('Authorization', authorization)
      .expect(400);
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .send({ lifecycle: 'pause' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'complete' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', goalId: activeGoalId })
      .expect(400);
    await request(app.getHttpServer())
      .post('/goals/not-a-uuid/lifecycle/preview')
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'resume',
        allocations: [{ goalId: activeGoalId, percentage: 'bad' }],
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.',
        ),
      );
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [], previewToken: 'bad' })
      .expect(400);
    expect(state.writes).toHaveLength(0);
  });

  it('previews pause with safe projection and no writes', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(200);
    expect(preview.body.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.body.proposal).toMatchObject({
      lifecycle: 'pause',
      goalId: activeGoalId,
      nextStatus: 'paused',
      transition: { goalId: activeGoalId, status: 'paused' },
      pauseMonthlyCommitment: true,
    });
    expect(
      preview.body.proposal.proposedSource.goals.find(
        (goal: any) => goal.id === activeGoalId,
      ),
    ).not.toHaveProperty('updatedAt');
    expect(preview.body.proposal.proposedSource.incomes[0]).not.toHaveProperty(
      'userId',
    );
    expect(preview.body.proposal.proposedSource.incomes[0]).not.toHaveProperty(
      'updatedAt',
    );
    expect(state.writes).toHaveLength(0);
  });

  it('confirms pause with the exact previewed token, pausing the goal and clearing the monthly commitment without touching positions', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(200);
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: preview.body.previewToken,
      })
      .expect(200);
    expect(confirmed.body).toEqual({ status: 'updated' });
    expect(state.goals.find((goal) => goal.id === activeGoalId)).toMatchObject({
      status: 'paused',
      name: 'Old goal',
      targetAmount: '500.00',
    });
    expect(state.profile.plannedMonthlyContribution).toBeNull();
    expect(
      state.writes.filter((write) => write.table === financialProfiles),
    ).toEqual([
      expect.objectContaining({ values: { plannedMonthlyContribution: null } }),
    ]);
  });

  it('confirms resume after a valid allocation preview and persists the exact active goals', async () => {
    const draft = {
      lifecycle: 'resume',
      allocations: [
        { goalId: activeGoalId, percentage: '40.00' },
        { goalId: pausedGoalId, percentage: '60.00' },
      ],
    };
    const preview = await request(app.getHttpServer())
      .post(`/goals/${pausedGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send(draft)
      .expect(200);
    expect(preview.body.proposal).toMatchObject({
      lifecycle: 'resume',
      nextStatus: 'active',
    });
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${pausedGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({ ...draft, previewToken: preview.body.previewToken })
      .expect(200);
    expect(confirmed.body).toEqual({ status: 'updated' });
    expect(state.goals.find((goal) => goal.id === pausedGoalId)).toMatchObject({
      status: 'active',
      name: 'Paused goal',
    });
  });

  it('returns a refreshed stale preview from the actual loader after source drift without writes', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(200);
    state.goals.find((goal) => goal.id === activeGoalId)!.name =
      'Changed after preview';
    const writesBefore = state.writes.length;
    const stale = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: preview.body.previewToken,
      })
      .expect(200);
    expect(stale.body.status).toBe('stale');
    expect(stale.body.preview.previewToken).not.toBe(preview.body.previewToken);
    expect(
      stale.body.preview.proposal.proposedSource.goals.find(
        (goal: any) => goal.id === activeGoalId,
      ),
    ).toMatchObject({ name: 'Changed after preview' });
    expect(
      stale.body.preview.proposal.proposedSource.goals.find(
        (goal: any) => goal.id === activeGoalId,
      ),
    ).not.toHaveProperty('updatedAt');
    expect(state.writes).toHaveLength(writesBefore);
    expect(state.goals.find((goal) => goal.id === activeGoalId)!.status).toBe(
      'active',
    );
  });

  it('keeps the original status-drift domain error and writes nothing when the target changed before confirmation', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(200);
    state.goals.find((goal) => goal.id === activeGoalId)!.status = 'paused';
    const writesBefore = state.writes.length;
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: preview.body.previewToken,
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Only active goals can be paused.'),
      );
    expect(state.writes).toHaveLength(writesBefore);
  });

  it('rejects unowned or completed targets with safe 4xx responses', async () => {
    await request(app.getHttpServer())
      .post(`/goals/${unknownGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe('Goal not found.'));
    await request(app.getHttpServer())
      .post(`/goals/${completedGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'resume', allocations: [] })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Only paused goals can be resumed.'),
      );
  });

  it('hides unexpected database errors behind a generic 500 without leaking SQL', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(async () => {
      throw new Error('SELECT secret_column FROM financial_profiles');
    }) as never;
    const context = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(500);
    expect(context.body.message).toBe('Internal Server Error');
    const preview = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(500);
    const confirm = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: 'a'.repeat(64),
      })
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
