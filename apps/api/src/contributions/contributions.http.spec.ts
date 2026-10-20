import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PgDialect } from 'drizzle-orm/pg-core';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SavingContributionConfirmationSchema, SavingContributionContextStateSchema, SavingContributionEditPreviewSchema, SavingContributionPreviewSchema } from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { financialProfiles, savingContributions, investmentContributions, goalInvestmentPositions, goalSavingsPositions, savingContributionAllocations, investmentContributionAllocations, savingsPlaces } from '../profile/profile.schema';
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
const savingDraft = { currency: 'ARS', amount: '300.00', place: { kind: 'existing', placeId: bankId } };
const investmentDraft = { kind: 'investment', currency: 'ARS', amount: '200.00' };

function contributionDatabase() {
  const profile: any = { userId: 'user-1', baseCurrency: 'ARS', expensesKnowledge: 'known', plannedMonthlyContribution: '1000.00', goalDedicationPercentage: '90.00', onboardingCompleted: true, createdAt: new Date(), updatedAt: new Date() };
  const goals: any[] = [
    { id: goalNotebook, userId: 'user-1', name: 'Notebook', type: 'purchase', targetAmount: '1000.00', currency: 'ARS', priority: 'high', strategy: 'save', status: 'active', desiredDate: null, completedAt: null, emergencyFundMonths: null, createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date() },
    { id: goalTrip, userId: 'user-1', name: 'Viaje', type: 'other', targetAmount: '5000.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', desiredDate: null, completedAt: null, emergencyFundMonths: null, createdAt: new Date('2026-02-01T00:00:00Z'), updatedAt: new Date() },
    { id: goalFund, userId: 'user-1', name: 'Fondo', type: 'retirement', targetAmount: '9000.00', currency: 'ARS', priority: 'medium', strategy: 'invest', status: 'active', desiredDate: null, completedAt: null, emergencyFundMonths: null, createdAt: new Date('2026-03-01T00:00:00Z'), updatedAt: new Date() },
  ];
  const places: any[] = [
    { id: cashId, userId: 'user-1', name: 'Efectivo', normalizedName: 'efectivo', createdAt: new Date(), updatedAt: new Date() },
    { id: bankId, userId: 'user-1', name: 'Banco', normalizedName: 'banco', createdAt: new Date(), updatedAt: new Date() },
  ];
  const savingRows: any[] = [{ id: savingContributionId, userId: 'user-1', placeId: bankId, amount: '300.00', currency: 'ARS', arsSpent: null, effectiveRate: null, createdAt: new Date('2026-08-02T00:00:00Z') }];
  const investmentRows: any[] = [{ id: investmentContributionId, userId: 'user-1', amount: '200.00', currency: 'ARS', arsSpent: null, effectiveRate: null, createdAt: new Date('2026-08-03T00:00:00Z') }];
  const savingAllocations: any[] = [
    { id: 'sal-1', contributionId: savingContributionId, goalId: goalNotebook, amount: '180.00', percentage: '60.00', savingPositionId: 'sp-1' },
    { id: 'sal-2', contributionId: savingContributionId, goalId: goalTrip, amount: '120.00', percentage: '40.00', savingPositionId: 'sp-2' },
  ];
  const investmentAllocations: any[] = [
    { id: 'ial-1', contributionId: investmentContributionId, goalId: goalFund, amount: '200.00', percentage: '100.00', investmentPositionId: 'ip-1' },
  ];
  const savingPositions: any[] = [
    { id: 'sp-1', goalId: goalNotebook, amount: '180.00', currency: 'ARS' },
    { id: 'sp-2', goalId: goalTrip, amount: '120.00', currency: 'ARS' },
  ];
  const investmentPositions: any[] = [{ id: 'ip-1', goalId: goalFund, currentValue: '1200.00', currency: 'ARS' }];
  const snapshots: any[] = [{ id: 'snapshot-current', userId: 'user-1', effectiveMonth: '2026-08-01', createdAt: new Date(), updatedAt: new Date() }];
  const allocations: any[] = [
    { id: 'plan-notebook', snapshotId: 'snapshot-current', goalId: goalNotebook, percentage: '60.00', createdAt: new Date(), updatedAt: new Date() },
    { id: 'plan-trip', snapshotId: 'snapshot-current', goalId: goalTrip, percentage: '40.00', createdAt: new Date(), updatedAt: new Date() },
    { id: 'plan-fund', snapshotId: 'snapshot-current', goalId: goalFund, percentage: '100.00', createdAt: new Date(), updatedAt: new Date() },
  ];
  const writes: Array<{ table: unknown; values: unknown; params: unknown[] }> = [];
  const params = (condition: unknown) => new PgDialect().sqlToQuery(condition as never).params;
  const byId = (rows: any[], condition: unknown) => rows.filter((row) => params(condition).includes(row.id));
  const queries = {
    financialProfiles: { findFirst: vi.fn(async () => profile) },
    financialGoals: { findMany: vi.fn(async () => goals) },
    incomes: { findMany: vi.fn(async () => []) },
    expenses: { findMany: vi.fn(async () => []) },
    allocationPlanSnapshots: { findMany: vi.fn(async () => snapshots) },
    allocationPlanEntries: { findMany: vi.fn(async () => allocations) },
    goalSavingsPositions: { findMany: vi.fn(async () => savingPositions) },
    goalInvestmentPositions: {
      findMany: vi.fn(async () => investmentPositions),
      findFirst: vi.fn(async (args: any) => filterRows(investmentPositions, args.where)[0]),
    },
    savingsPlaces: {
      findMany: vi.fn(async () => places),
      findFirst: vi.fn(async (args: any) => filterRows(places, args.where)[0]),
    },
    savingContributions: {
      findMany: vi.fn(async () => savingRows),
      findFirst: vi.fn(async (args: any) => filterRows(savingRows, args.where)[0]),
    },
    investmentContributions: {
      findMany: vi.fn(async () => investmentRows),
      findFirst: vi.fn(async (args: any) => filterRows(investmentRows, args.where)[0]),
    },
    savingContributionAllocations: { findMany: vi.fn(async (args: any) => filterRows(savingAllocations, args.where)) },
    investmentContributionAllocations: { findMany: vi.fn(async (args: any) => filterRows(investmentAllocations, args.where)) },
  };
  const tx = {
    query: queries,
    select: () => ({ from: (table: unknown) => ({ where: (condition: unknown) => ({
      for: async () => {
        if (table === financialProfiles) return [profile];
        if (table === savingsPlaces) return byId(places, condition);
        return [];
      },
    }) }) }),
    insert: (table: unknown) => ({ values: (values: any) => {
      writes.push({ table, values, params: [] });
      return Object.assign(Promise.resolve([]), { returning: async () => [{ id: createdContributionId }] });
    } }),
    update: (table: unknown) => ({ set: (values: any) => ({ where: (condition: unknown) => {
      writes.push({ table, values, params: params(condition) });
      return Object.assign(Promise.resolve([]), { returning: async () => [{ id: 'updated' }] });
    } }) }),
    delete: (table: unknown) => ({ where: async (condition: unknown) => {
      writes.push({ table, values: undefined, params: params(condition) });
    } }),
  };
  const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) };
  return { db, profile, goals, places, savingRows, investmentRows, writes };
}

const columns = new Proxy({}, { get: (_target, key) => String(key) }) as Record<string, string>;

function operators() {
  return {
    eq: (column: string, value: unknown) => ({ column, value }),
    and: (...conditions: unknown[]) => conditions,
    inArray: (column: string, values: unknown[]) => ({ column, values }),
  };
}

function flattenClauses(node: unknown): Array<{ column: string; value?: unknown; values?: unknown[] }> {
  if (Array.isArray(node)) return node.flatMap(flattenClauses);
  return node ? [node as { column: string; value?: unknown; values?: unknown[] }] : [];
}

function filterRows(rows: any[], where: ((table: unknown, ops: ReturnType<typeof operators>) => unknown) | undefined) {
  const clauses = flattenClauses(where?.(columns, operators()));
  return rows.filter((row) => clauses.every(({ column, value, values }) => (values ? values.includes(row[column]) : row[column] === value)));
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
    vi.mocked(verifyToken).mockResolvedValue({ sub: 'user-1', iss: 'https://clerk.example.test' } as never);
  });
  afterEach(async () => app.close());

  it('requires authentication on every contribution route', async () => {
    await request(app.getHttpServer()).get('/contributions/saving/context').expect(401);
    await request(app.getHttpServer()).post('/contributions/saving/preview').send(savingDraft).expect(401);
    await request(app.getHttpServer()).post('/contributions/saving').send({ draft: savingDraft, previewToken: 'a'.repeat(64) }).expect(401);
    await request(app.getHttpServer()).patch(`/contributions/saving/${savingContributionId}`).send({ draft: savingDraft }).expect(401);
    await request(app.getHttpServer()).delete(`/contributions/saving/${savingContributionId}`).expect(401);
  });

  it('returns the owned context with places sorted and no raw metadata', async () => {
    const response = await request(app.getHttpServer()).get('/contributions/saving/context').set('Authorization', authorization).expect(200);
    expect(SavingContributionContextStateSchema.parse(response.body)).toMatchObject({
      profile: 'present',
      context: {
        currentMonth: '2026-08',
        places: [{ id: bankId, name: 'Banco' }, { id: cashId, name: 'Efectivo' }],
        eligibleGoals: [{ id: goalNotebook, name: 'Notebook' }, { id: goalTrip, name: 'Viaje' }],
        eligibleInvestmentGoals: [{ id: goalFund, name: 'Fondo' }],
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/updatedAt|userId|createdAt/);
  });

  it('returns the missing profile state', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(async () => undefined) as never;
    await request(app.getHttpServer()).get('/contributions/saving/context').set('Authorization', authorization).expect(200, { profile: 'missing' });
  });

  it('validates body shape and first Spanish domain issues before writes', async () => {
    await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization)
      .send({ currency: 'ARS', amount: '300.00' }).expect(400);
    await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization)
      .send({ ...savingDraft, extra: true }).expect(400);
    await request(app.getHttpServer()).post('/contributions/saving').set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: 'bad' }).expect(400);
    await request(app.getHttpServer()).patch('/contributions/saving/not-a-uuid').set('Authorization', authorization)
      .send({ draft: savingDraft }).expect(400);
    await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization)
      .send({ ...savingDraft, amount: '0' }).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Contribution amount must be positive'));
    expect(state.writes).toHaveLength(0);
  });

  it('previews a saving contribution with a safe response and no writes', async () => {
    const response = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization)
      .send(savingDraft).expect(200);
    const parsed = SavingContributionPreviewSchema.parse(response.body);
    expect(parsed.preview.allocations.map(({ goalId, amount }) => [goalId, amount.amount])).toEqual([[goalNotebook, '180.00'], [goalTrip, '120.00']]);
    expect(parsed.previewToken).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(response.body)).not.toMatch(/updatedAt/);
    expect(state.writes).toHaveLength(0);
  });

  it('confirms a saving contribution with the exact previewed token', async () => {
    const preview = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(savingDraft).expect(200);
    const confirmed = await request(app.getHttpServer()).post('/contributions/saving').set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: preview.body.previewToken }).expect(200);
    expect(SavingContributionConfirmationSchema.parse(confirmed.body)).toEqual({ status: 'created', contributionId: expect.any(String) });
    expect(state.writes).toContainEqual(expect.objectContaining({ table: savingContributions, values: expect.objectContaining({ amount: '300.00', placeId: bankId }) }));
    expect(state.writes.some(({ table }) => table === financialProfiles)).toBe(false);
  });

  it('returns a refreshed stale preview with zero writes after the loaded goal changes', async () => {
    const preview = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(savingDraft).expect(200);
    state.goals.find((goal) => goal.id === goalNotebook)!.name = 'Changed after preview';
    const writesBefore = state.writes.length;
    const stale = await request(app.getHttpServer()).post('/contributions/saving').set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: preview.body.previewToken }).expect(200);
    expect(SavingContributionConfirmationSchema.parse(stale.body).status).toBe('stale');
    expect(stale.body.preview.previewToken).not.toBe(preview.body.previewToken);
    expect(state.writes).toHaveLength(writesBefore);
  });

  it('confirms an investment contribution and moves the investment position value', async () => {
    const preview = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(investmentDraft).expect(200);
    expect(preview.body.preview.allocations.map((allocation: any) => [allocation.goalId, allocation.amount.amount])).toEqual([[goalFund, '200.00']]);
    await request(app.getHttpServer()).post('/contributions/saving').set('Authorization', authorization)
      .send({ draft: investmentDraft, previewToken: preview.body.previewToken }).expect(200)
      .expect(({ body }) => expect(body.status).toBe('created'));
    expect(state.writes).toContainEqual(expect.objectContaining({ table: investmentContributions, values: expect.objectContaining({ amount: '200.00' }) }));
    expect(state.writes).toContainEqual({ table: goalInvestmentPositions, values: { currentValue: '1400.00' }, params: expect.any(Array) });
    expect(state.writes.some(({ table }) => table === savingContributions)).toBe(false);
  });

  it('previews an owned contribution edit against its own goals and stored percentages without writes', async () => {
    const response = await request(app.getHttpServer()).post(`/contributions/saving/${savingContributionId}/preview`).set('Authorization', authorization)
      .send({ ...savingDraft, amount: '500.00' }).expect(200);
    expect(SavingContributionEditPreviewSchema.parse(response.body).preview.allocations.map(({ goalId, amount }) => [goalId, amount.amount]))
      .toEqual([[goalNotebook, '300.00'], [goalTrip, '200.00']]);
    expect(state.writes).toHaveLength(0);
    await request(app.getHttpServer()).post(`/contributions/saving/${foreignContributionId}/preview`).set('Authorization', authorization)
      .send(savingDraft).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Contribution not found or not owned by user.'));
  });

  it('keeps the create preview route distinct from the edit preview route', async () => {
    await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(savingDraft).expect(200)
      .expect(({ body }) => expect(body.previewToken).toMatch(/^[a-f0-9]{64}$/));
  });

  it('updates an owned saving contribution with its place and allocation amounts', async () => {
    await request(app.getHttpServer()).patch(`/contributions/saving/${savingContributionId}`).set('Authorization', authorization)
      .send({ draft: { ...savingDraft, amount: '500.00' } }).expect(200, { status: 'updated' });
    expect(state.writes).toContainEqual(expect.objectContaining({ table: savingContributions, values: expect.objectContaining({ amount: '500.00', placeId: bankId }) }));
  });

  it('deletes an owned investment contribution and reverses its position value', async () => {
    await request(app.getHttpServer()).delete(`/contributions/saving/${investmentContributionId}`).set('Authorization', authorization)
      .expect(200, { status: 'deleted' });
    expect(state.writes).toContainEqual({ table: goalInvestmentPositions, values: { currentValue: '1000.00' }, params: expect.any(Array) });
    expect(state.writes).toContainEqual({ table: investmentContributions, values: undefined, params: expect.any(Array) });
  });

  it('keeps ownership and place errors as original domain messages with zero writes', async () => {
    await request(app.getHttpServer()).patch(`/contributions/saving/${foreignContributionId}`).set('Authorization', authorization)
      .send({ draft: savingDraft }).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Contribution not found or not owned by user.'));
    await request(app.getHttpServer()).delete(`/contributions/saving/${foreignContributionId}`).set('Authorization', authorization).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Contribution not found or not owned by user.'));
    const foreignDraft = { currency: 'ARS', amount: '300.00', place: { kind: 'existing', placeId: foreignPlaceId } };
    const preview = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(foreignDraft).expect(200);
    await request(app.getHttpServer()).post('/contributions/saving').set('Authorization', authorization)
      .send({ draft: foreignDraft, previewToken: preview.body.previewToken }).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Lugar de ahorro no encontrado.'));
    expect(state.writes).toHaveLength(0);
  });

  it('rejects a catch-up month other than the previous calendar month before writes', async () => {
    const preview = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(savingDraft).expect(200);
    await request(app.getHttpServer()).post('/contributions/saving').set('Authorization', authorization)
      .send({ draft: savingDraft, previewToken: preview.body.previewToken, catchUpMonth: '2026-06' }).expect(400)
      .expect(({ body }) => expect(body.message).toBe('Solo podés regularizar el mes anterior.'));
    expect(state.writes).toHaveLength(0);
  });

  it('hides unexpected database errors behind a generic 500 without leaking SQL', async () => {
    state.db.query.financialProfiles.findFirst = vi.fn(async () => { throw new Error('SELECT secret_column FROM financial_profiles'); }) as never;
    const context = await request(app.getHttpServer()).get('/contributions/saving/context').set('Authorization', authorization).expect(500);
    expect(context.body.message).toEqual(expect.stringMatching(/internal server error/i));
    const preview = await request(app.getHttpServer()).post('/contributions/saving/preview').set('Authorization', authorization).send(savingDraft).expect(500);
    expect(JSON.stringify({ context: context.body, preview: preview.body })).not.toContain('secret_column');
  });
});

async function makeApp(db: unknown): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [ContributionsController],
    providers: [ContributionsService, ClerkAuthGuard,
      { provide: DATABASE_CONNECTION, useValue: db },
      { provide: ConfigService, useValue: { getOrThrow: (key: string) => ({ CLERK_SECRET_KEY: 'key', CLERK_ISSUER_URL: 'https://clerk.example.test', CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'] })[key] } },
    ],
  }).compile();
  const app = module.createNestApplication();
  await app.init();
  return app;
}
