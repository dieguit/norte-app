import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import {
  GoalsService,
  mapRowsToGoalsWorkspaceSource,
  selectWorkspaceSnapshots,
} from './goals.service';
import { BadRequestException } from '@nestjs/common';

describe('GoalsService', () => {
  it('returns the original missing-profile state without reading dependent data', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const db = { query: { financialProfiles: { findFirst } } };
    await expect(
      new GoalsService(db as never).getWorkspace('subject'),
    ).resolves.toEqual({ profile: 'missing' });
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('returns missing creation context and safely rejects preview without a profile', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const service = new GoalsService({
      query: { financialProfiles: { findFirst } },
    } as never);
    await expect(
      service.getCreationContext('verified-subject'),
    ).resolves.toEqual({ profile: 'missing' });
    await expect(
      service.previewCreation('verified-subject', {} as never),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: {
        message: 'Completá tu perfil financiero antes de crear un objetivo.',
      },
    });
  });

  it('rejects malformed confirmation input as a safe 4xx before persistence', async () => {
    const service = new GoalsService({
      query: { financialProfiles: { findFirst: vi.fn() } },
    } as never);
    await expect(
      service.confirmCreation('verified-subject', {
        draft: {} as never,
        previewToken: 'bad',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the first Spanish allocation validation issue before querying source state', async () => {
    const findFirst = vi.fn();
    const service = new GoalsService({
      query: { financialProfiles: { findFirst } },
    } as never);
    await expect(
      service.previewAllocationChange('verified-subject', {
        dedicationPercentage: 70,
        allocations: [{ goalId: 'g', percentage: 'bad' }],
      }),
    ).rejects.toMatchObject({
      response: {
        message:
          'Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.',
      },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('preserves the allocation-change missing-profile message', async () => {
    const service = new GoalsService({
      query: {
        financialProfiles: { findFirst: vi.fn().mockResolvedValue(undefined) },
      },
    } as never);
    await expect(
      service.previewAllocationChange('verified-subject', {
        dedicationPercentage: 70,
        allocations: [{ goalId: 'g', percentage: '100.00' }],
      }),
    ).rejects.toMatchObject({
      response: {
        message:
          'Completá tu perfil financiero antes de cambiar la planificación.',
      },
    });
  });

  it('uses latest effective snapshot, or earliest upcoming when no current snapshot exists', () => {
    const snapshots = [
      { id: 'old', effectiveMonth: '2026-07-01' },
      { id: 'current', effectiveMonth: '2026-08-01' },
      { id: 'pending', effectiveMonth: '2026-09-01' },
      { id: 'later', effectiveMonth: '2027-01-01' },
    ];
    expect(
      selectWorkspaceSnapshots(snapshots, '2026-08').map(({ id }) => id),
    ).toEqual(['current', 'pending']);
    expect(
      selectWorkspaceSnapshots(snapshots.slice(2), '2026-08').map(
        ({ id }) => id,
      ),
    ).toEqual(['pending']);
  });

  it('maps rows into the engine source with ISO dates and contribution kinds', () => {
    const source = mapRowsToGoalsWorkspaceSource({
      profile: {
        userId: 'u',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: null,
        goalDedicationPercentage: '90.00',
      },
      goals: [
        {
          id: 'g',
          userId: 'u',
          name: 'Goal',
          type: 'purchase',
          targetAmount: '20.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: new Date('2026-08-01T00:00:00Z'),
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [],
      allocations: [],
      incomes: [],
      expenses: [],
      contributions: [
        {
          id: 'c',
          kind: 'saving',
          userId: 'u',
          amount: '5.00',
          currency: 'ARS',
          placeId: 'p',
          placeName: 'Bank',
          arsSpent: null,
          effectiveRate: null,
          createdAt: new Date('2026-08-02T00:00:00Z'),
          allocations: [],
        },
      ],
      completionWithdrawals: [],
    });
    expect(source.goals[0].completedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(source.contributions?.[0]).toMatchObject({
      kind: 'saving',
      createdAt: '2026-08-02T00:00:00.000Z',
      placeName: 'Bank',
    });
  });

  it('scopes every owner query to the verified subject and returns an empty workspace', async () => {
    const ownerQueries: Array<{ table: string; where: SQL<unknown> }> = [];
    const rows = {
      financialProfiles: {
        userId: 'subject',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: null,
        goalDedicationPercentage: '90.00',
      },
    };
    const tables = [
      'financialGoals',
      'incomes',
      'expenses',
      'allocationPlanSnapshots',
      'goalSavingsPositions',
      'goalInvestmentPositions',
      'allocationPlanEntries',
      'savingsPlaces',
      'savingContributions',
      'investmentContributions',
    ];
    const query: Record<string, unknown> = Object.fromEntries(
      tables.map((table) => [
        table,
        {
          findMany: vi.fn((args: { where: SQL<unknown> }) => {
            ownerQueries.push({ table, where: args.where });
            return Promise.resolve([]);
          }),
        },
      ]),
    );
    query.financialProfiles = {
      findFirst: vi.fn((args: { where: SQL<unknown> }) => {
        ownerQueries.push({ table: 'financialProfiles', where: args.where });
        return Promise.resolve(rows.financialProfiles);
      }),
    };
    const service = new GoalsService({ query } as never);
    await expect(service.getWorkspace('subject')).resolves.toMatchObject({
      profile: 'present',
      workspace: {
        groups: [
          { status: 'active', goals: [] },
          { status: 'paused', goals: [] },
          { status: 'completed', goals: [] },
        ],
      },
    });
    const dialect = new PgDialect();
    for (const { where } of ownerQueries)
      expect(dialect.sqlToQuery(where).params).toContain('subject');
  });

  it('passes requested currentMonth through to workspace calculation', async () => {
    const query: Record<string, any> = {
      financialProfiles: {
        findFirst: vi.fn().mockResolvedValue({
          userId: 'subject',
          baseCurrency: 'ARS',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: null,
          goalDedicationPercentage: '90.00',
        }),
      },
      financialGoals: { findMany: vi.fn().mockResolvedValue([]) },
      incomes: { findMany: vi.fn().mockResolvedValue([]) },
      expenses: { findMany: vi.fn().mockResolvedValue([]) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue([]) },
      savingsPlaces: { findMany: vi.fn().mockResolvedValue([]) },
      savingContributions: { findMany: vi.fn().mockResolvedValue([]) },
      investmentContributions: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new GoalsService({ query } as never);
    const result = await service.getWorkspace('subject', '2026-11');
    expect(result).toMatchObject({ profile: 'present' });
    if (result.profile === 'present') {
      expect(result.workspace.financialSummary.month).toBe('2026-11');
    }
  });
});
