import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as registry from './schema';

const expectedTables = [
  'allocation_plan_entries',
  'allocation_plan_snapshots',
  'expense_sources',
  'expenses',
  'financial_goals',
  'financial_profiles',
  'goal_completion_withdrawals',
  'goal_investment_positions',
  'goal_savings_positions',
  'income_sources',
  'incomes',
  'investment_contribution_allocations',
  'investment_contributions',
  'onboarding_drafts',
  'saving_contribution_allocations',
  'saving_contributions',
  'savings_place_transfers',
  'savings_places',
  'whatsapp_auth_state',
  'whatsapp_link_tokens',
  'whatsapp_links',
].sort();

describe('canonical schema registry', () => {
  it('exposes exactly all tables to Kit as well as the runtime object', () => {
    const tables = Object.values(registry).filter((value) =>
      is(value, PgTable),
    );
    expect(tables.map((table) => getTableConfig(table).name).sort()).toEqual(
      expectedTables,
    );
    expect(new Set(tables).size).toBe(21);
    expect(Object.values(registry.schema)).toHaveLength(21);
  });

  it('retains application-side timestamp updates', () => {
    for (const table of [
      registry.schema.savingsPlaces,
      registry.schema.savingContributions,
      registry.schema.investmentContributions,
    ]) {
      expect(table.updatedAt.onUpdateFn).toBeTypeOf('function');
    }
  });

  it('does not link financial Clerk identities to UUID users', () => {
    expect(
      getTableConfig(registry.schema.financialGoals).foreignKeys,
    ).toHaveLength(0);
  });

  it('keeps the seven deployed foreign key names and actions', () => {
    const expected = [
      [registry.schema.savingsPlaces, 'savings_places_user_id_fk', 'cascade'],
      [
        registry.schema.savingsPlaceTransfers,
        'savings_place_transfers_user_id_fk',
        'cascade',
      ],
      [
        registry.schema.savingsPlaceTransfers,
        'savings_place_transfers_from_place_id_fk',
        'restrict',
      ],
      [
        registry.schema.savingsPlaceTransfers,
        'savings_place_transfers_to_place_id_fk',
        'restrict',
      ],
      [
        registry.schema.savingContributions,
        'saving_contributions_place_id_fk',
        'restrict',
      ],
      [
        registry.schema.goalCompletionWithdrawals,
        'goal_completion_withdrawals_goal_id_fk',
        'restrict',
      ],
      [
        registry.schema.goalCompletionWithdrawals,
        'goal_completion_withdrawals_place_id_fk',
        'restrict',
      ],
    ] as const;
    for (const [table, name, onDelete] of expected) {
      const fk = getTableConfig(table).foreignKeys.find(
        (constraint) => constraint.getName() === name,
      );
      expect(fk, name).toBeDefined();
      expect(fk?.onDelete, name).toBe(onDelete);
      expect(fk?.onUpdate, name).toBe('no action');
    }
  });

  it('matches the complete deployed financial foreign-key inventory', () => {
    const financialTableNames = [
      'allocation_plan_entries',
      'allocation_plan_snapshots',
      'expense_sources',
      'expenses',
      'financial_goals',
      'financial_profiles',
      'goal_completion_withdrawals',
      'goal_investment_positions',
      'goal_savings_positions',
      'income_sources',
      'incomes',
      'investment_contribution_allocations',
      'investment_contributions',
      'saving_contribution_allocations',
      'saving_contributions',
      'savings_place_transfers',
      'savings_places',
    ];
    const expected = [
      'allocation_plan_entries|allocation_plan_entries_snapshot_id_allocation_plan_snapshots_id_fk|snapshot_id|allocation_plan_snapshots|id|cascade|no action',
      'allocation_plan_entries|allocation_plan_entries_goal_id_financial_goals_id_fk|goal_id|financial_goals|id|cascade|no action',
      'allocation_plan_snapshots|allocation_plan_snapshots_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'expense_sources|expense_sources_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'expenses|expenses_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'expenses|expenses_source_id_expense_sources_id_fk|source_id|expense_sources|id|restrict|no action',
      'goal_completion_withdrawals|goal_completion_withdrawals_goal_id_fk|goal_id|financial_goals|id|restrict|no action',
      'goal_completion_withdrawals|goal_completion_withdrawals_place_id_fk|place_id|savings_places|id|restrict|no action',
      'goal_investment_positions|goal_investment_positions_goal_id_financial_goals_id_fk|goal_id|financial_goals|id|cascade|no action',
      'goal_savings_positions|goal_savings_positions_goal_id_financial_goals_id_fk|goal_id|financial_goals|id|cascade|no action',
      'income_sources|income_sources_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'incomes|incomes_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'incomes|incomes_source_id_income_sources_id_fk|source_id|income_sources|id|restrict|no action',
      'investment_contribution_allocations|investment_contribution_allocations_contribution_id_investment_contributions_id_fk|contribution_id|investment_contributions|id|cascade|no action',
      'investment_contribution_allocations|investment_contribution_allocations_goal_id_financial_goals_id_fk|goal_id|financial_goals|id|cascade|no action',
      'investment_contribution_allocations|investment_contribution_allocations_investment_position_id_goal_investment_positions_id_fk|investment_position_id|goal_investment_positions|id|cascade|no action',
      'investment_contributions|investment_contributions_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'saving_contribution_allocations|saving_contribution_allocations_contribution_id_saving_contributions_id_fk|contribution_id|saving_contributions|id|cascade|no action',
      'saving_contribution_allocations|saving_contribution_allocations_goal_id_financial_goals_id_fk|goal_id|financial_goals|id|cascade|no action',
      'saving_contribution_allocations|saving_contribution_allocations_saving_position_id_goal_savings_positions_id_fk|saving_position_id|goal_savings_positions|id|cascade|no action',
      'saving_contributions|saving_contributions_user_id_financial_profiles_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'saving_contributions|saving_contributions_place_id_fk|place_id|savings_places|id|restrict|no action',
      'savings_place_transfers|savings_place_transfers_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
      'savings_place_transfers|savings_place_transfers_from_place_id_fk|from_place_id|savings_places|id|restrict|no action',
      'savings_place_transfers|savings_place_transfers_to_place_id_fk|to_place_id|savings_places|id|restrict|no action',
      'savings_places|savings_places_user_id_fk|user_id|financial_profiles|user_id|cascade|no action',
    ].sort();
    const financialTables = Object.values(registry.schema).filter((table) =>
      financialTableNames.includes(getTableConfig(table).name),
    );
    expect(
      financialTables.map((table) => getTableConfig(table).name).sort(),
    ).toEqual(financialTableNames.sort());
    const actual = financialTables
      .flatMap((table) => {
        const config = getTableConfig(table);
        return config.foreignKeys.map((fk) => {
          const reference = fk.reference();
          return [
            config.name,
            fk.getName(),
            reference.columns.map((column) => column.name).join(','),
            getTableConfig(reference.foreignTable).name,
            reference.foreignColumns.map((column) => column.name).join(','),
            fk.onDelete,
            fk.onUpdate,
          ].join('|');
        });
      })
      .sort();
    expect(actual).toEqual(expected);
  });
});
