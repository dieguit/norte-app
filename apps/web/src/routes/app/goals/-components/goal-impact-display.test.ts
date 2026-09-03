import { describe, expect, it } from 'vitest'
import type { GoalCreationPreviewResult } from '../../../../features/goals/goal-creation'
import { getGoalImpactDisplay } from './goal-impact-display'

describe('getGoalImpactDisplay', () => {
  it('applies draft percentages and puts the edited goal first', () => {
    const preview = {
      proposal: {
        allocation: {
          monthlyContribution: { amount: '100.00', currency: 'ARS' },
          effectiveMonth: '2026-09-01',
          totalPercentage: '100.00',
          entries: [
            { goalId: 'goal-1', goalName: 'Fondo', percentage: '60.00' },
            { goalId: 'goal-2', goalName: 'Viaje', percentage: '40.00' },
          ],
        },
        impacts: [],
      },
    } as unknown as GoalCreationPreviewResult

    const display = getGoalImpactDisplay(
      preview,
      [{ goalId: 'goal-1', percentage: '40.00' }, { goalId: 'goal-2', percentage: '60.00' }],
      { goalId: 'goal-2', status: 'editing' },
    )

    expect(display.allocation.entries.map((entry) => entry.goalId)).toEqual(['goal-2', 'goal-1'])
    expect(display.allocation.entries.map((entry) => entry.percentage)).toEqual(['60.00', '40.00'])
  })
})
