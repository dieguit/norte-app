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
import type {
  GoalPlanContextPresentDto,
  GoalLifecycleUpdatedDto,
  GoalLifecycleStaleDto,
} from './goals.dto';
import type { GoalLifecyclePreview } from '@repo/shared-types';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const activeGoalId = '195cb991-5704-4b80-a696-405e92c907df';
const pausedGoalId = '2b5e7162-00f4-4f03-a1b6-1d69443251a0';
const completedGoalId = '3a1e9a38-30ab-4a15-85cb-1d31b152a79e';
const unknownGoalId = '3a1e9a38-30ab-4a15-85cb-1d31b152a79d';

type ProfileRow = typeof financialProfiles.$inferSelect;
type GoalRow = typeof financialGoals.$inferSelect;
type SnapshotRow = typeof allocationPlanSnapshots.$inferSelect;
type AllocationRow = typeof allocationPlanEntries.$inferSelect;

function lifecycleDatabase() {
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
      id: 'allocation-current',
      snapshotId: 'snapshot-current',
      goalId: activeGoalId,
      percentage: '100.00',
    },
  ];
  const writes: Array<{ table: unknown; values: unknown; params: unknown[] }> =
    [];
  const params = (condition: unknown) =>
    new PgDialect().sqlToQuery(condition as never).params;
  const queries = {
    financialProfiles: { findFirst: vi.fn(() => Promise.resolve(profile)) },
    financialGoals: { findMany: vi.fn(() => Promise.resolve(goals)) },
    incomes: { findMany: vi.fn(() => Promise.resolve(incomes)) },
    expenses: { findMany: vi.fn(() => Promise.resolve(expenses)) },
    allocationPlanSnapshots: {
      findMany: vi.fn(() => Promise.resolve(snapshots)),
    },
    goalSavingsPositions: { findMany: vi.fn(() => Promise.resolve([])) },
    goalInvestmentPositions: { findMany: vi.fn(() => Promise.resolve([])) },
    allocationPlanEntries: {
      findMany: vi.fn(() => Promise.resolve(allocations)),
    },
  };
  const tx = {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          for: () =>
            Promise.resolve(table === financialProfiles ? [profile] : []),
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
        if (table === allocationPlanEntries) {
          writes.push({ table, values, params: [] });
          const rows = Array.isArray(values) ? values : [values];
          allocations.push(
            ...rows.map((row: unknown, index: number) => ({
              ...(row as AllocationRow),
              id: `allocation-created-${writes.length}-${index}`,
            })),
          );
          return Promise.resolve();
        }
        writes.push({ table, values, params: [] });
        return {
          returning: () => {
            snapshots.push({
              ...(values as SnapshotRow),
              id: 'snapshot-created',
              createdAt: new Date(),
            });
            return Promise.resolve([{ id: 'snapshot-created' }]);
          },
        };
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: (condition: unknown) => {
          const conditionParams = params(condition);
          writes.push({ table, values, params: conditionParams });
          if (table === financialGoals)
            goals
              .filter((goal) => conditionParams.includes(goal.id))
              .forEach((goal) => Object.assign(goal, values as GoalRow));
          if (table === financialProfiles)
            Object.assign(profile, values as ProfileRow);
          if (table === allocationPlanSnapshots)
            snapshots
              .filter((row) => conditionParams.includes(row.id))
              .forEach((row) => Object.assign(row, values as SnapshotRow));
          return Promise.resolve();
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
    const resumeBody = resume.body as GoalPlanContextPresentDto;
    expect(resumeBody.lifecycleContext).toMatchObject({
      goalId: pausedGoalId,
      lifecycle: 'resume',
      goalName: 'Paused goal',
    });

    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${pausedGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Only active goals can be paused.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=resume`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Only paused goals can be resumed.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${completedGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Only active goals can be paused.'),
      );
    await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${unknownGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Goal not found.'),
      );
  });

  it('returns the missing profile state for lifecycle context without reading goal rows', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.resolve(undefined),
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
      .expect(({ body }: { body: { message: string } }) =>
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
    const previewBody = preview.body as GoalLifecyclePreview;
    expect(previewBody.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(previewBody.proposal).toMatchObject({
      lifecycle: 'pause',
      goalId: activeGoalId,
      nextStatus: 'paused',
      transition: { goalId: activeGoalId, status: 'paused' },
      pauseMonthlyCommitment: true,
    });
    expect(
      previewBody.proposal.proposedSource.goals.find(
        (goal) => goal.id === activeGoalId,
      ),
    ).not.toHaveProperty('updatedAt');
    expect(previewBody.proposal.proposedSource.incomes?.[0]).not.toHaveProperty(
      'userId',
    );
    expect(previewBody.proposal.proposedSource.incomes?.[0]).not.toHaveProperty(
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
    const previewBody = preview.body as GoalLifecyclePreview;
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: previewBody.previewToken,
      })
      .expect(200);
    const confirmedBody = confirmed.body as GoalLifecycleUpdatedDto;
    expect(confirmedBody).toEqual({ status: 'updated' });
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
    const previewBody = preview.body as GoalLifecyclePreview;
    expect(previewBody.proposal).toMatchObject({
      lifecycle: 'resume',
      nextStatus: 'active',
    });
    const confirmed = await request(app.getHttpServer())
      .post(`/goals/${pausedGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({ ...draft, previewToken: previewBody.previewToken })
      .expect(200);
    const confirmedBody = confirmed.body as GoalLifecycleUpdatedDto;
    expect(confirmedBody).toEqual({ status: 'updated' });
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
    const previewBody = preview.body as GoalLifecyclePreview;
    state.goals.find((goal) => goal.id === activeGoalId)!.name =
      'Changed after preview';
    const writesBefore = state.writes.length;
    const stale = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: previewBody.previewToken,
      })
      .expect(200);
    const staleBody = stale.body as GoalLifecycleStaleDto;
    expect(staleBody.status).toBe('stale');
    expect(staleBody.preview.previewToken).not.toBe(previewBody.previewToken);
    expect(
      staleBody.preview.proposal.proposedSource.goals.find(
        (goal) => goal.id === activeGoalId,
      ),
    ).toMatchObject({ name: 'Changed after preview' });
    expect(
      staleBody.preview.proposal.proposedSource.goals.find(
        (goal) => goal.id === activeGoalId,
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
    const previewBody = preview.body as GoalLifecyclePreview;
    state.goals.find((goal) => goal.id === activeGoalId)!.status = 'paused';
    const writesBefore = state.writes.length;
    await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: previewBody.previewToken,
      })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
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
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Goal not found.'),
      );
    await request(app.getHttpServer())
      .post(`/goals/${completedGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'resume', allocations: [] })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Only paused goals can be resumed.'),
      );
  });

  it('hides unexpected database errors behind a generic 500 without leaking SQL', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.reject(new Error('SELECT secret_column FROM financial_profiles')),
    );
    const context = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}&action=pause`)
      .set('Authorization', authorization)
      .expect(500);
    const contextBody = context.body as { message: string };
    expect(contextBody.message).toBe('Internal Server Error');
    const preview = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle/preview`)
      .set('Authorization', authorization)
      .send({ lifecycle: 'pause', allocations: [] })
      .expect(500);
    const previewBody = preview.body as { message: string };
    const confirm = await request(app.getHttpServer())
      .post(`/goals/${activeGoalId}/lifecycle`)
      .set('Authorization', authorization)
      .send({
        lifecycle: 'pause',
        allocations: [],
        previewToken: 'a'.repeat(64),
      })
      .expect(500);
    const confirmBody = confirm.body as { message: string };
    expect(
      JSON.stringify({
        context: contextBody,
        preview: previewBody,
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
