import { describe, expect, it } from 'vitest'
import {
  PENDING_GOAL_ID,
  allocationEntriesMatch,
  calculatePercentageSum,
  rebalanceAllocationEntries,
  recalculateAllocationAmounts,
} from './goal-creation'

describe('allocationEntriesMatch', () => {
  it('compares allocation percentages at cent precision and rejects missing or invalid entries', () => {
    const proposalEntries = [
      { goalId: 'goal-1', percentage: '25.00' },
      { goalId: 'goal-2', percentage: '75.00' },
    ]

    expect(
      allocationEntriesMatch(
        [
          { goalId: 'goal-1', percentage: '25,004' },
          { goalId: 'goal-2', percentage: '75' },
        ],
        proposalEntries,
      ),
    ).toBe(true)
    expect(
      allocationEntriesMatch(
        proposalEntries,
        [{ goalId: 'goal-1', percentage: '25.00' }],
      ),
    ).toBe(false)
    expect(
      allocationEntriesMatch(
        [{ goalId: 'goal-1', percentage: '25.00' }],
        proposalEntries,
      ),
    ).toBe(false)
    expect(
      allocationEntriesMatch(
        proposalEntries,
        [
          { goalId: 'goal-1', percentage: '25.00' },
          { goalId: 'goal-1', percentage: '25.00' },
        ],
      ),
    ).toBe(false)
    expect(
      allocationEntriesMatch(
        [{ goalId: 'goal-1', percentage: 'no válido' }],
        proposalEntries,
      ),
    ).toBe(false)
  })
})

describe('rebalanceAllocationEntries', () => {
  it('assigns an equal remainder by goal ID regardless of entry order', () => {
    const entries = (goalIds: string[]) =>
      goalIds.map((goalId) => ({ goalId, percentage: '0.00' }))
    const first = rebalanceAllocationEntries(
      entries(['selected', 'goal-b', 'goal-a', 'goal-c']),
      'selected',
      '0.00',
    )
    const second = rebalanceAllocationEntries(
      entries(['selected', 'goal-c', 'goal-a', 'goal-b']),
      'selected',
      '0.00',
    )
    const percentagesByGoal = (result: typeof first) =>
      Object.fromEntries(result.map((entry) => [entry.goalId, entry.percentage]))

    expect(first.map((entry) => entry.goalId)).toEqual(['selected', 'goal-b', 'goal-a', 'goal-c'])
    expect(second.map((entry) => entry.goalId)).toEqual(['selected', 'goal-c', 'goal-a', 'goal-b'])
    expect(percentagesByGoal(first)).toEqual(percentagesByGoal(second))
    expect(percentagesByGoal(first)).toMatchObject({
      'goal-a': '33.33',
      'goal-b': '33.33',
      'goal-c': '33.34',
    })
  })

  it('rebalances pending entry from 0 to 20 proportionally across existing 70/30 entries', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '0.00' },
      { goalId: 'goal-1', percentage: '70.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ]

    const result = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '20')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '56.00' },
      { goalId: 'goal-2', percentage: '24.00' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('rebalances when modifying an existing entry instead of pending goal', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '56.00' },
      { goalId: 'goal-2', percentage: '24.00' },
    ]

    const result = rebalanceAllocationEntries(entries, 'goal-1', '50')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '22.73' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '27.27' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('handles solitary entry', () => {
    const entries = [{ goalId: 'goal-1', percentage: '50.00' }]
    expect(rebalanceAllocationEntries(entries, 'goal-1', '25')).toEqual([
      { goalId: 'goal-1', percentage: '100.00' },
    ])
  })

  it('leaves invalid or out of bounds percentage unchanged without modifying others', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ]

    const invalid = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, 'abc')
    expect(invalid).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: 'abc' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])

    const negative = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '-10')
    expect(negative).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '-10' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])

    const over100 = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '105')
    expect(over100).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '105' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])
  })
})

describe('recalculateAllocationAmounts', () => {
  it('assigns an equal cent remainder by goal ID regardless of entry order', () => {
    const entries = (goalIds: string[]) =>
      goalIds.map((goalId) => ({ goalId, percentage: '50.00', currency: 'ARS' as const }))
    const first = recalculateAllocationAmounts({
      monthlyContribution: { amount: '0.01', currency: 'ARS' },
      entries: entries(['goal-b', 'goal-a']),
    })
    const second = recalculateAllocationAmounts({
      monthlyContribution: { amount: '0.01', currency: 'ARS' },
      entries: entries(['goal-a', 'goal-b']),
    })

    expect(first.get('goal-a')).toEqual({
      allocatedBaseAmount: { amount: '0.01', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '0.01', currency: 'ARS' },
    })
    expect(first.get('goal-b')).toEqual({
      allocatedBaseAmount: { amount: '0.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '0.00', currency: 'ARS' },
    })
    expect(second).toEqual(first)
  })
})
