import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { allocationPlanEntries, allocationPlanSnapshots, financialGoals, goalInvestmentPositions } from '../profile/profile.schema';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const draft = {
  type: 'purchase', name: 'Trip', targetAmount: '1000', currency: 'ARS', desiredMonth: '2027-01',
  priority: 'medium', strategy: 'save', annualReturnRate: '', availability: 'available_now',
  availableFromMonth: '', allocations: [
    { goalId: '195cb991-5704-4b80-a696-405e92c907df', percentage: '50.00' }, { goalId: 'pending-goal', percentage: '50.00' },
  ],
};
const activeGoalId = '195cb991-5704-4b80-a696-405e92c907df';
const editGoalId = '2b5e7162-00f4-4f03-a1b6-1d69443251a0';
const editDraft = { ...draft, name: 'Edited trip', targetAmount: '700', desiredMonth: '2027-02', allocations: [{ goalId: activeGoalId, percentage: '100.00' }] };

function creationDatabase() {
  const profile = { userId: 'user-1', baseCurrency: 'ARS', expensesKnowledge: 'known', plannedMonthlyContribution: '1000.00', goalDedicationPercentage: '90.00', onboardingCompleted: true, createdAt: new Date(), updatedAt: new Date() };
  const goals: any[] = [
    { id: activeGoalId, userId: 'user-1', name: 'Old goal', type: 'purchase', targetAmount: '500.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', desiredDate: '2027-01-01', completedAt: null, emergencyFundMonths: null, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date() },
    { id: editGoalId, userId: 'user-1', name: 'Paused goal', type: 'purchase', targetAmount: '600.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'paused', desiredDate: '2027-01-01', completedAt: null, emergencyFundMonths: null, createdAt: new Date('2026-02-01T00:00:00Z'), updatedAt: new Date() },
  ];
  const incomes = [{ id: 'income-1', userId: 'user-1', sourceKind: 'salary', sourceId: null, concept: null, amount: '5000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01', createdAt: new Date(), updatedAt: new Date() }];
  const expenses = [{ id: 'expense-1', userId: 'user-1', sourceKind: 'housing', sourceId: null, concept: null, amount: '3000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01', endMonth: null, createdAt: new Date(), updatedAt: new Date() }];
  const snapshots = [{ id: 'snapshot-current', userId: 'user-1', effectiveMonth: '2026-08-01', createdAt: new Date(), updatedAt: new Date() }];
  const allocations: any[] = [{ id: 'allocation-old', snapshotId: 'snapshot-current', goalId: activeGoalId, percentage: '100.00', createdAt: new Date(), updatedAt: new Date() }];
  let writes = 0;
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
    select: () => {
      let table: unknown;
      return { from: (selected: unknown) => { table = selected; return { where: () => ({
        for: async () => [profile],
        limit: async () => table === allocationPlanSnapshots ? snapshots.filter((row) => row.effectiveMonth === '2026-08-01') : [],
      }) }; } };
    },
    insert: (table: unknown) => ({ values: (values: any) => table === allocationPlanEntries
      ? (writes++, allocations.push(...values.map((row: any, index: number) => ({ ...row, id: `allocation-${writes}-${index}`, createdAt: new Date(), updatedAt: new Date() }))), Promise.resolve())
      : ({ returning: async () => {
        writes++;
        if (table === financialGoals) goals.push({ ...values, id: 'goal-created', createdAt: new Date(), updatedAt: new Date() });
        return [{ id: table === financialGoals ? 'goal-created' : 'snapshot-created' }];
      } }),
    }),
    update: () => ({ set: () => ({ where: async () => { writes++; } }) }),
    delete: (table: unknown) => ({ where: async () => {
      writes++;
      if (table === allocationPlanEntries) allocations.splice(0);
    } }),
  };
  const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) };
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
    vi.mocked(verifyToken).mockResolvedValue({ sub: 'user-1', iss: 'https://clerk.example.test' } as never);
  });
  afterEach(async () => app.close());

  it('projects realistic row metadata and returns the original present context and validated preview', async () => {
    const context = await request(app.getHttpServer()).get('/goals/plan').set('Authorization', 'Bearer token').expect(200);
    expect(context.body).toMatchObject({ profile: 'present', context: {
      currentMonth: '2026-08', expensesKnowledge: 'known', hasEmergencyFund: false,
      plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
      currentAllocation: { effectiveMonth: '2026-08-01', entries: [{ goalId: activeGoalId, percentage: '100.00' }] },
    } });

    const response = await request(app.getHttpServer()).post('/goals/preview').set('Authorization', 'Bearer token').send(draft).expect(200);
    expect(response.body.proposal.normalizedGoal.name).toBe('Trip');
    expect(response.body.proposal.proposedSource.goals[0]).not.toHaveProperty('updatedAt');
    expect(response.body.proposal.proposedSource.incomes[0]).not.toHaveProperty('userId');
    expect(response.body.proposal.proposedSource.incomes[0]).not.toHaveProperty('createdAt');
    expect(response.body.proposal.proposedSource.incomes[0]).not.toHaveProperty('updatedAt');
    expect(response.body.proposal.proposedSource.expenses[0]).not.toHaveProperty('userId');
    expect(response.body.proposal.proposedSource.expenses[0]).not.toHaveProperty('createdAt');
    expect(response.body.proposal.proposedSource.expenses[0]).not.toHaveProperty('updatedAt');
  });

  it('routes static allocation preview before the UUID edit route and returns safe parsed preview plus source-driven stale result', async () => {
    state.snapshots.push({ id: 'snapshot-pending', userId: 'user-1', effectiveMonth: '2026-09-01', createdAt: new Date(), updatedAt: new Date() });
    state.allocations.push({ id: 'allocation-pending', snapshotId: 'snapshot-pending', goalId: activeGoalId, percentage: '100.00', createdAt: new Date(), updatedAt: new Date() });
    const plan = await request(app.getHttpServer()).get('/goals/plan').set('Authorization', 'Bearer token').expect(200);
    expect(plan.body.allocationContext).toMatchObject({
      currentMonth: '2026-08', financialSummary: { month: '2026-08' },
      plannedMonthlyContribution: { amount: '1000.00', currency: 'ARS' },
      activeGoals: [{ id: activeGoalId, name: 'Old goal', currency: 'ARS' }],
      currentAllocation: { effectiveMonth: '2026-08-01', entries: [{ goalId: activeGoalId, percentage: '100.00' }] },
      pendingAllocation: { effectiveMonth: '2026-09-01', entries: [{ goalId: activeGoalId, percentage: '100.00' }] },
    });

    const allocationDraft = { dedicationPercentage: 70, allocations: [{ goalId: activeGoalId, percentage: '100.00' }] };
    const preview = await request(app.getHttpServer()).post('/goals/allocation/preview')
      .set('Authorization', 'Bearer token').send(allocationDraft).expect(200);
    expect(preview.body).toMatchObject({
      proposal: { dedicationPercentage: 70, allocation: { effectiveMonth: '2026-08-01', totalPercentage: '100.00' } },
    });
    expect(preview.body.proposal.proposedSource.goals[0]).not.toHaveProperty('updatedAt');
    expect(preview.body.proposal.proposedSource.incomes[0]).not.toHaveProperty('userId');
    expect(preview.body.previewToken).toMatch(/^[a-f0-9]{64}$/);

    state.goals[0].name = 'Changed after allocation preview';
    const writesBeforeStale = state.writes();
    const stale = await request(app.getHttpServer()).put('/goals/allocation')
      .set('Authorization', 'Bearer token')
      .send({ draft: allocationDraft, previewToken: preview.body.previewToken }).expect(200);
    expect(stale.body.status).toBe('stale');
    expect(stale.body.preview.proposal.proposedSource.goals[0].name).toBe('Changed after allocation preview');
    expect(stale.body.preview.proposal.proposedSource.goals[0]).not.toHaveProperty('updatedAt');
    expect(state.writes()).toBe(writesBeforeStale);
  });

  it('guards allocation routes and preserves the first Spanish validation issue', async () => {
    await request(app.getHttpServer()).post('/goals/allocation/preview').send({}).expect(401);
    await request(app.getHttpServer()).put('/goals/allocation').send({}).expect(401);
    await request(app.getHttpServer()).post('/goals/allocation/preview').set('Authorization', 'Bearer token')
      .send({ dedicationPercentage: 70, allocations: [{ goalId: activeGoalId, percentage: 'bad' }] })
      .expect(400).expect(({ body }) => expect(body.message).toBe('Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.'));
    await request(app.getHttpServer()).post('/goals/allocation/preview').set('Authorization', 'Bearer token')
      .send({ dedicationPercentage: 70, allocations: [{ goalId: activeGoalId, percentage: '100.00' }], userId: 'attacker' }).expect(400);
    await request(app.getHttpServer()).post('/goals/allocation/preview').set('Authorization', 'Bearer token')
      .send({ dedicationPercentage: 70, allocations: [{ goalId: 'not-owned', percentage: '100.00' }] }).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Allocation draft must contain exactly the active goals'));
  });

  it('returns the first Spanish Zod issue as a safe 400 response', async () => {
    await request(app.getHttpServer()).post('/goals/preview').set('Authorization', 'Bearer token')
      .send({ ...draft, name: '' }).expect(400).expect(({ body }) => expect(body.message).toBe('Ingresá un nombre.'));
  });

  it('returns actual created result and refreshed stale preview without stale writes', async () => {
    const preview = await request(app.getHttpServer()).post('/goals/preview').set('Authorization', 'Bearer token').send(draft).expect(200);
    const created = await request(app.getHttpServer()).post('/goals').set('Authorization', 'Bearer token')
      .send({ draft, previewToken: preview.body.previewToken }).expect(200);
    expect(created.body).toEqual({ status: 'created', goalId: 'goal-created' });
    expect(state.writes()).toBeGreaterThan(0);

    const refreshedFixture = creationDatabase();
    const freshApp = await makeApp(refreshedFixture.db);
    const freshPreview = await request(freshApp.getHttpServer()).post('/goals/preview').set('Authorization', 'Bearer token').send(draft).expect(200);
    refreshedFixture.goals[0].name = 'Changed after preview';
    const beforeStaleWrites = refreshedFixture.writes();
    const stale = await request(freshApp.getHttpServer()).post('/goals').set('Authorization', 'Bearer token')
      .send({ draft, previewToken: freshPreview.body.previewToken }).expect(200);
    expect(stale.body.status).toBe('stale');
    expect(stale.body.preview.proposal.proposedSource.goals[0].name).toBe('Changed after preview');
    expect(stale.body.preview.proposal.proposedSource.goals[0]).not.toHaveProperty('updatedAt');
    expect(refreshedFixture.writes()).toBe(beforeStaleWrites);
    await freshApp.close();
  });

  it('returns safe paused edit context and completes edit preview/confirmation over HTTP', async () => {
    const context = await request(app.getHttpServer()).get(`/goals/plan?goalId=${editGoalId}`).set('Authorization', 'Bearer token').expect(200);
    expect(context.body.editContext).toMatchObject({ goalId: editGoalId, status: 'paused', draft: { name: 'Paused goal' } });
    expect(context.body.editContext).not.toHaveProperty('updatedAt');
    const preview = await request(app.getHttpServer()).post(`/goals/${editGoalId}/preview`).set('Authorization', 'Bearer token').send(editDraft).expect(200);
    expect(preview.body.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.body.proposal.proposedSource.goals.find((goal: any) => goal.id === editGoalId)).not.toHaveProperty('updatedAt');
    const updated = await request(app.getHttpServer()).patch(`/goals/${editGoalId}`).set('Authorization', 'Bearer token')
      .send({ draft: editDraft, previewToken: preview.body.previewToken }).expect(200);
    expect(updated.body).toEqual({ status: 'updated' });
  });

  it('includes active target state and returns first Spanish draft issue for edit preview', async () => {
    const context = await request(app.getHttpServer()).get(`/goals/plan?goalId=${activeGoalId}`).set('Authorization', 'Bearer token').expect(200);
    expect(context.body.editContext).toMatchObject({ goalId: activeGoalId, status: 'active', draft: { name: 'Old goal' } });
    await request(app.getHttpServer()).post(`/goals/${editGoalId}/preview`).set('Authorization', 'Bearer token')
      .send({ ...editDraft, name: '' }).expect(400).expect(({ body }) => expect(body.message).toBe('Ingresá un nombre.'));
  });

  it('uses zero for an unallocated active goal when selected pending allocations belong only to paused goals', async () => {
    state.allocations.splice(0);
    state.snapshots.push({ id: 'snapshot-pending', userId: 'user-1', effectiveMonth: '2026-09-01', createdAt: new Date(), updatedAt: new Date() });
    state.allocations.push({ id: 'allocation-pending-paused', snapshotId: 'snapshot-pending', goalId: editGoalId, percentage: '100.00', createdAt: new Date(), updatedAt: new Date() });
    const withPausedAllocation = await request(app.getHttpServer()).get(`/goals/plan?goalId=${editGoalId}`).set('Authorization', 'Bearer token').expect(200);
    expect(withPausedAllocation.body.editContext.draft.allocations).toEqual([{ goalId: activeGoalId, percentage: '0.00' }]);

    state.allocations.splice(0);
    const withoutAllocations = await request(app.getHttpServer()).get(`/goals/plan?goalId=${editGoalId}`).set('Authorization', 'Bearer token').expect(200);
    expect(withoutAllocations.body.editContext.draft.allocations).toEqual([{ goalId: activeGoalId, percentage: '100.00' }]);
  });

  it('rejects invalid edit UUID, immutable edits, and foreign targets with safe 4xx responses', async () => {
    await request(app.getHttpServer()).post('/goals/not-a-uuid/preview').set('Authorization', 'Bearer token').send(editDraft).expect(400);
    await request(app.getHttpServer()).post(`/goals/${editGoalId}/preview`).set('Authorization', 'Bearer token')
      .send({ ...editDraft, strategy: 'invest', annualReturnRate: '8' }).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Cannot modify immutable goal fields (type, currency, strategy).'));
    await request(app.getHttpServer()).post('/goals/3a1e9a38-30ab-4a15-85cb-1d31b152a79d/preview')
      .set('Authorization', 'Bearer token').send(editDraft).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Goal not found or is not active.'));
    state.goals.push({ id: '3a1e9a38-30ab-4a15-85cb-1d31b152a79e', userId: 'user-1', name: 'Completed', type: 'purchase', targetAmount: '1.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'completed', desiredDate: '2027-01-01', completedAt: new Date(), emergencyFundMonths: null, createdAt: new Date(), updatedAt: new Date() });
    await request(app.getHttpServer()).post('/goals/3a1e9a38-30ab-4a15-85cb-1d31b152a79e/preview')
      .set('Authorization', 'Bearer token').send(editDraft).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Cannot edit a completed goal.'));
    await request(app.getHttpServer()).patch(`/goals/${editGoalId}`).set('Authorization', 'Bearer token')
      .send({ draft: editDraft, previewToken: 'bad' }).expect(400);
  });

  it('returns a refreshed stale edit preview without writes', async () => {
    await request(app.getHttpServer()).patch(`/goals/${editGoalId}`).send({}).expect(401);
    const preview = await request(app.getHttpServer()).post(`/goals/${editGoalId}/preview`).set('Authorization', 'Bearer token').send(editDraft).expect(200);
    state.goals[1].name = 'Changed after preview';
    const beforeWrites = state.writes();
    const stale = await request(app.getHttpServer()).patch(`/goals/${editGoalId}`).set('Authorization', 'Bearer token')
      .send({ draft: editDraft, previewToken: preview.body.previewToken }).expect(200);
    expect(stale.body.status).toBe('stale');
    expect(stale.body.preview.previewToken).not.toBe(preview.body.previewToken);
    expect(stale.body.preview.proposal.proposedSource.goals.find((goal: any) => goal.id === editGoalId)).not.toHaveProperty('updatedAt');
    expect(state.writes()).toBe(beforeWrites);
  });

  it('hides unexpected database errors behind a generic 500', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(async () => { throw new Error('SELECT secret_column FROM financial_profiles'); });
    const response = await request(app.getHttpServer()).get(`/goals/plan?goalId=${editGoalId}`).set('Authorization', 'Bearer token').expect(500);
    expect(response.body.message).toBe('Internal Server Error');
    expect(JSON.stringify(response.body)).not.toContain('secret_column');
    const preview = await request(app.getHttpServer()).post('/goals/allocation/preview').set('Authorization', 'Bearer token')
      .send({ dedicationPercentage: 70, allocations: [{ goalId: activeGoalId, percentage: '100.00' }] }).expect(500);
    expect(preview.body.message).toMatch(/^internal server error$/i);
    const confirm = await request(app.getHttpServer()).put('/goals/allocation').set('Authorization', 'Bearer token')
      .send({ draft: { dedicationPercentage: 70, allocations: [{ goalId: activeGoalId, percentage: '100.00' }] }, previewToken: 'a'.repeat(64) }).expect(500);
    expect(confirm.body.message).toMatch(/^internal server error$/i);
    expect(JSON.stringify({ preview: preview.body, confirm: confirm.body })).not.toContain('secret_column');
  });
});

async function makeApp(db: unknown): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [GoalsController],
    providers: [GoalsService, ClerkAuthGuard,
      { provide: DATABASE_CONNECTION, useValue: db },
      { provide: ConfigService, useValue: { getOrThrow: (key: string) => ({ CLERK_SECRET_KEY: 'key', CLERK_ISSUER_URL: 'https://clerk.example.test', CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'] })[key] } },
    ],
  }).compile();
  const app = module.createNestApplication();
  await app.init();
  return app;
}
