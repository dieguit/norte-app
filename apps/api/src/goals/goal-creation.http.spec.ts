import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
} from '../profile/profile.schema';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import type {
  GoalPlanContextPresentDto,
  GoalEditUpdatedDto,
  GoalEditStaleDto,
} from './goals.dto';
import type {
  AllocationChangeConfirmation,
  AllocationChangePreview,
  GoalCreationConfirmation,
  GoalCreationPreview,
} from '@repo/shared-types';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const draft = {
  type: 'purchase',
  name: 'Trip',
  targetAmount: '1000',
  currency: 'ARS',
  desiredMonth: '2027-01',
  priority: 'medium',
  strategy: 'save',
  annualReturnRate: '',
  availability: 'available_now',
  availableFromMonth: '',
  allocations: [
    { goalId: '195cb991-5704-4b80-a696-405e92c907df', percentage: '50.00' },
    { goalId: 'pending-goal', percentage: '50.00' },
  ],
};
const activeGoalId = '195cb991-5704-4b80-a696-405e92c907df';
const editGoalId = '2b5e7162-00f4-4f03-a1b6-1d69443251a0';
const editDraft = {
  ...draft,
  name: 'Edited trip',
  targetAmount: '700',
  desiredMonth: '2027-02',
  allocations: [{ goalId: activeGoalId, percentage: '100.00' }],
};

type GoalRow = typeof financialGoals.$inferSelect;
type AllocationRow = typeof allocationPlanEntries.$inferSelect;

function creationDatabase() {
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
      id: editGoalId,
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
  const snapshots = [
    {
      id: 'snapshot-current',
      userId: 'user-1',
      effectiveMonth: '2026-08-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const allocations: AllocationRow[] = [
    {
      id: 'allocation-old',
      snapshotId: 'snapshot-current',
      goalId: activeGoalId,
      percentage: '100.00',
    },
  ];
  let writes = 0;
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
    select: () => {
      let table: unknown;
      return {
        from: (selected: unknown) => {
          table = selected;
          return {
            where: () => ({
              for: () => Promise.resolve([profile]),
              limit: () =>
                Promise.resolve(
                  table === allocationPlanSnapshots
                    ? snapshots.filter(
                        (row) => row.effectiveMonth === '2026-08-01',
                      )
                    : [],
                ),
            }),
          };
        },
      };
    },
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        if (table === allocationPlanEntries) {
          writes++;
          const rows = Array.isArray(values) ? values : [values];
          allocations.push(
            ...rows.map((row: unknown, index: number) => ({
              ...(row as AllocationRow),
              id: `allocation-${writes}-${index}`,
            })),
          );
          return Promise.resolve();
        }
        return {
          returning: () => {
            writes++;
            if (table === financialGoals)
              goals.push({
                ...(values as GoalRow),
                id: 'goal-created',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            return Promise.resolve([
              {
                id:
                  table === financialGoals
                    ? 'goal-created'
                    : 'snapshot-created',
              },
            ]);
          },
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: () => {
          writes++;
          return Promise.resolve();
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        writes++;
        if (table === allocationPlanEntries) allocations.splice(0);
        return Promise.resolve();
      },
    }),
  };
  const db = {
    query: queries,
    transaction: (callback: (executor: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
  };
  return { db, goals, allocations, snapshots, writes: () => writes };
}

describe('goal creation HTTP with actual service and repository', () => {
  let app: INestApplication;
  let state: ReturnType<typeof creationDatabase>;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
  beforeEach(async () => {
    state = creationDatabase();
    app = await makeApp(state.db);
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'user-1',
      iss: 'https://clerk.example.test',
    } as never);
  });
  afterEach(async () => app.close());

  it('projects realistic row metadata and returns the original present context and validated preview', async () => {
    const context = await request(app.getHttpServer())
      .get('/goals/plan')
      .set('Authorization', 'Bearer token')
      .expect(200);
    expect(context.body).toMatchObject({
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
    });

    const response = await request(app.getHttpServer())
      .post('/goals/preview')
      .set('Authorization', 'Bearer token')
      .send(draft)
      .expect(200);
    const body = response.body as GoalCreationPreview;
    expect(body.proposal.normalizedGoal.name).toBe('Trip');
    expect(body.proposal.proposedSource.goals[0]).not.toHaveProperty(
      'updatedAt',
    );
    expect(body.proposal.proposedSource.incomes?.[0]).not.toHaveProperty(
      'userId',
    );
    expect(body.proposal.proposedSource.incomes?.[0]).not.toHaveProperty(
      'createdAt',
    );
    expect(body.proposal.proposedSource.incomes?.[0]).not.toHaveProperty(
      'updatedAt',
    );
    expect(body.proposal.proposedSource.expenses?.[0]).not.toHaveProperty(
      'userId',
    );
    expect(body.proposal.proposedSource.expenses?.[0]).not.toHaveProperty(
      'createdAt',
    );
    expect(body.proposal.proposedSource.expenses?.[0]).not.toHaveProperty(
      'updatedAt',
    );
  });

  it('routes static allocation preview before the UUID edit route and returns safe parsed preview plus source-driven stale result', async () => {
    state.snapshots.push({
      id: 'snapshot-pending',
      userId: 'user-1',
      effectiveMonth: '2026-09-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    state.allocations.push({
      id: 'allocation-pending',
      snapshotId: 'snapshot-pending',
      goalId: activeGoalId,
      percentage: '100.00',
    });
    const plan = await request(app.getHttpServer())
      .get('/goals/plan')
      .set('Authorization', 'Bearer token')
      .expect(200);
    const planBody = plan.body as GoalPlanContextPresentDto;
    expect(planBody.allocationContext).toMatchObject({
      currentMonth: '2026-08',
      financialSummary: { month: '2026-08' },
      plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
      activeGoals: [{ id: activeGoalId, name: 'Old goal', currency: 'ARS' }],
      currentAllocation: {
        effectiveMonth: '2026-08-01',
        entries: [{ goalId: activeGoalId, percentage: '100.00' }],
      },
      pendingAllocation: {
        effectiveMonth: '2026-09-01',
        entries: [{ goalId: activeGoalId, percentage: '100.00' }],
      },
    });

    const allocationDraft = {
      dedicationPercentage: 70,
      allocations: [{ goalId: activeGoalId, percentage: '100.00' }],
    };
    const preview = await request(app.getHttpServer())
      .post('/goals/allocation/preview')
      .set('Authorization', 'Bearer token')
      .send(allocationDraft)
      .expect(200);
    const previewBody = preview.body as AllocationChangePreview;
    expect(previewBody).toMatchObject({
      proposal: {
        dedicationPercentage: 70,
        allocation: { effectiveMonth: '2026-08-01', totalPercentage: '100.00' },
      },
    });
    expect(previewBody.proposal.proposedSource.goals[0]).not.toHaveProperty(
      'updatedAt',
    );
    expect(previewBody.proposal.proposedSource.incomes?.[0]).not.toHaveProperty(
      'userId',
    );
    expect(previewBody.previewToken).toMatch(/^[a-f0-9]{64}$/);

    state.goals[0].name = 'Changed after allocation preview';
    const writesBeforeStale = state.writes();
    const stale = await request(app.getHttpServer())
      .put('/goals/allocation')
      .set('Authorization', 'Bearer token')
      .send({ draft: allocationDraft, previewToken: previewBody.previewToken })
      .expect(200);
    const staleBody = stale.body as Extract<
      AllocationChangeConfirmation,
      { status: 'stale' }
    >;
    expect(staleBody.status).toBe('stale');
    expect(staleBody.preview.proposal.proposedSource.goals[0].name).toBe(
      'Changed after allocation preview',
    );
    expect(
      staleBody.preview.proposal.proposedSource.goals[0],
    ).not.toHaveProperty('updatedAt');
    expect(state.writes()).toBe(writesBeforeStale);
  });

  it('guards allocation routes and preserves the first Spanish validation issue', async () => {
    await request(app.getHttpServer())
      .post('/goals/allocation/preview')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .put('/goals/allocation')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .post('/goals/allocation/preview')
      .set('Authorization', 'Bearer token')
      .send({
        dedicationPercentage: 70,
        allocations: [{ goalId: activeGoalId, percentage: 'bad' }],
      })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe(
          'Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.',
        ),
      );
    await request(app.getHttpServer())
      .post('/goals/allocation/preview')
      .set('Authorization', 'Bearer token')
      .send({
        dedicationPercentage: 70,
        allocations: [{ goalId: activeGoalId, percentage: '100.00' }],
        userId: 'attacker',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/goals/allocation/preview')
      .set('Authorization', 'Bearer token')
      .send({
        dedicationPercentage: 70,
        allocations: [{ goalId: 'not-owned', percentage: '100.00' }],
      })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe(
          'Allocation draft must contain exactly the active goals',
        ),
      );
  });

  it('returns the first Spanish Zod issue as a safe 400 response', async () => {
    await request(app.getHttpServer())
      .post('/goals/preview')
      .set('Authorization', 'Bearer token')
      .send({ ...draft, name: '' })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Ingresá un nombre.'),
      );
  });

  it('returns actual created result and refreshed stale preview without stale writes', async () => {
    const preview = await request(app.getHttpServer())
      .post('/goals/preview')
      .set('Authorization', 'Bearer token')
      .send(draft)
      .expect(200);
    const previewBody = preview.body as GoalCreationPreview;
    const created = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', 'Bearer token')
      .send({ draft, previewToken: previewBody.previewToken })
      .expect(200);
    const createdBody = created.body as GoalCreationConfirmation;
    expect(createdBody).toEqual({ status: 'created', goalId: 'goal-created' });
    expect(state.writes()).toBeGreaterThan(0);

    const refreshedFixture = creationDatabase();
    const freshApp = await makeApp(refreshedFixture.db);
    const freshPreview = await request(freshApp.getHttpServer())
      .post('/goals/preview')
      .set('Authorization', 'Bearer token')
      .send(draft)
      .expect(200);
    const freshPreviewBody = freshPreview.body as GoalCreationPreview;
    refreshedFixture.goals[0].name = 'Changed after preview';
    const beforeStaleWrites = refreshedFixture.writes();
    const stale = await request(freshApp.getHttpServer())
      .post('/goals')
      .set('Authorization', 'Bearer token')
      .send({ draft, previewToken: freshPreviewBody.previewToken })
      .expect(200);
    const staleBody = stale.body as Extract<
      GoalCreationConfirmation,
      { status: 'stale' }
    >;
    expect(staleBody.status).toBe('stale');
    expect(staleBody.preview.proposal.proposedSource.goals[0].name).toBe(
      'Changed after preview',
    );
    expect(
      staleBody.preview.proposal.proposedSource.goals[0],
    ).not.toHaveProperty('updatedAt');
    expect(refreshedFixture.writes()).toBe(beforeStaleWrites);
    await freshApp.close();
  });

  it('returns safe paused edit context and completes edit preview/confirmation over HTTP', async () => {
    const context = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .expect(200);
    const contextBody = context.body as GoalPlanContextPresentDto;
    expect(contextBody.editContext).toMatchObject({
      goalId: editGoalId,
      status: 'paused',
      draft: { name: 'Paused goal' },
    });
    expect(contextBody.editContext).not.toHaveProperty('updatedAt');
    const preview = await request(app.getHttpServer())
      .post(`/goals/${editGoalId}/preview`)
      .set('Authorization', 'Bearer token')
      .send(editDraft)
      .expect(200);
    const previewBody = preview.body as GoalCreationPreview;
    expect(previewBody.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(
      previewBody.proposal.proposedSource.goals.find(
        (goal) => goal.id === editGoalId,
      ),
    ).not.toHaveProperty('updatedAt');
    const updated = await request(app.getHttpServer())
      .patch(`/goals/${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .send({ draft: editDraft, previewToken: previewBody.previewToken })
      .expect(200);
    const updatedBody = updated.body as GoalEditUpdatedDto;
    expect(updatedBody).toEqual({ status: 'updated' });
  });

  it('includes active target state and returns first Spanish draft issue for edit preview', async () => {
    const context = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${activeGoalId}`)
      .set('Authorization', 'Bearer token')
      .expect(200);
    const contextBody = context.body as GoalPlanContextPresentDto;
    expect(contextBody.editContext).toMatchObject({
      goalId: activeGoalId,
      status: 'active',
      draft: { name: 'Old goal' },
    });
    await request(app.getHttpServer())
      .post(`/goals/${editGoalId}/preview`)
      .set('Authorization', 'Bearer token')
      .send({ ...editDraft, name: '' })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Ingresá un nombre.'),
      );
  });

  it('uses zero for an unallocated active goal when selected pending allocations belong only to paused goals', async () => {
    state.allocations.splice(0);
    state.snapshots.push({
      id: 'snapshot-pending',
      userId: 'user-1',
      effectiveMonth: '2026-09-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    state.allocations.push({
      id: 'allocation-pending-paused',
      snapshotId: 'snapshot-pending',
      goalId: editGoalId,
      percentage: '100.00',
    });
    const withPausedAllocation = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .expect(200);
    const withPausedBody =
      withPausedAllocation.body as GoalPlanContextPresentDto;
    expect(withPausedBody.editContext?.draft.allocations).toEqual([
      { goalId: activeGoalId, percentage: '0.00' },
    ]);

    state.allocations.splice(0);
    const withoutAllocations = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .expect(200);
    const withoutAllocationsBody =
      withoutAllocations.body as GoalPlanContextPresentDto;
    expect(withoutAllocationsBody.editContext?.draft.allocations).toEqual([
      { goalId: activeGoalId, percentage: '100.00' },
    ]);
  });

  it('rejects invalid edit UUID, immutable edits, and foreign targets with safe 4xx responses', async () => {
    await request(app.getHttpServer())
      .post('/goals/not-a-uuid/preview')
      .set('Authorization', 'Bearer token')
      .send(editDraft)
      .expect(400);
    await request(app.getHttpServer())
      .post(`/goals/${editGoalId}/preview`)
      .set('Authorization', 'Bearer token')
      .send({ ...editDraft, strategy: 'invest', annualReturnRate: '8' })
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe(
          'Cannot modify immutable goal fields (type, currency, strategy).',
        ),
      );
    await request(app.getHttpServer())
      .post('/goals/3a1e9a38-30ab-4a15-85cb-1d31b152a79d/preview')
      .set('Authorization', 'Bearer token')
      .send(editDraft)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Goal not found or is not active.'),
      );
    state.goals.push({
      id: '3a1e9a38-30ab-4a15-85cb-1d31b152a79e',
      userId: 'user-1',
      name: 'Completed',
      type: 'purchase',
      targetAmount: '1.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'save',
      status: 'completed',
      desiredDate: '2027-01-01',
      completedAt: new Date(),
      emergencyFundMonths: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await request(app.getHttpServer())
      .post('/goals/3a1e9a38-30ab-4a15-85cb-1d31b152a79e/preview')
      .set('Authorization', 'Bearer token')
      .send(editDraft)
      .expect(400)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('Cannot edit a completed goal.'),
      );
    await request(app.getHttpServer())
      .patch(`/goals/${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .send({ draft: editDraft, previewToken: 'bad' })
      .expect(400);
  });

  it('returns a refreshed stale edit preview without writes', async () => {
    await request(app.getHttpServer())
      .patch(`/goals/${editGoalId}`)
      .send({})
      .expect(401);
    const preview = await request(app.getHttpServer())
      .post(`/goals/${editGoalId}/preview`)
      .set('Authorization', 'Bearer token')
      .send(editDraft)
      .expect(200);
    const previewBody = preview.body as GoalCreationPreview;
    state.goals[1].name = 'Changed after preview';
    const beforeWrites = state.writes();
    const stale = await request(app.getHttpServer())
      .patch(`/goals/${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .send({ draft: editDraft, previewToken: previewBody.previewToken })
      .expect(200);
    const staleBody = stale.body as GoalEditStaleDto;
    expect(staleBody.status).toBe('stale');
    expect(staleBody.preview.previewToken).not.toBe(previewBody.previewToken);
    expect(
      staleBody.preview.proposal.proposedSource.goals.find(
        (goal) => goal.id === editGoalId,
      ),
    ).not.toHaveProperty('updatedAt');
    expect(state.writes()).toBe(beforeWrites);
  });

  it('hides unexpected database errors behind a generic 500', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(() =>
      Promise.reject(new Error('SELECT secret_column FROM financial_profiles')),
    );
    const response = await request(app.getHttpServer())
      .get(`/goals/plan?goalId=${editGoalId}`)
      .set('Authorization', 'Bearer token')
      .expect(500);
    const responseBody = response.body as { message: string };
    expect(responseBody.message).toBe('Internal Server Error');
    expect(JSON.stringify(responseBody)).not.toContain('secret_column');
    const preview = await request(app.getHttpServer())
      .post('/goals/allocation/preview')
      .set('Authorization', 'Bearer token')
      .send({
        dedicationPercentage: 70,
        allocations: [{ goalId: activeGoalId, percentage: '100.00' }],
      })
      .expect(500);
    const previewBody = preview.body as { message: string };
    expect(previewBody.message).toMatch(/^internal server error$/i);
    const confirm = await request(app.getHttpServer())
      .put('/goals/allocation')
      .set('Authorization', 'Bearer token')
      .send({
        draft: {
          dedicationPercentage: 70,
          allocations: [{ goalId: activeGoalId, percentage: '100.00' }],
        },
        previewToken: 'a'.repeat(64),
      })
      .expect(500);
    const confirmBody = confirm.body as { message: string };
    expect(confirmBody.message).toMatch(/^internal server error$/i);
    expect(
      JSON.stringify({ preview: previewBody, confirm: confirmBody }),
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
