import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  SavingContributionContext,
  SavingContributionPreviewResult,
} from '../../../features/contributions/saving-contribution'
import type { SavingContributionProps } from './saving-contribution-types'
import { SavingContribution } from './SavingContribution'

export const defaultContext: SavingContributionContext = {
  currentMonth: '2026-08',
  eligibleGoals: [
    { id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '60.00' },
    { id: 'goal-ars-2', name: 'Auto nuevo', percentage: '40.00' },
  ],
  eligibleGoalsUsd: [{ id: 'goal-usd-1', name: 'Colchón financiero', percentage: '100.00' }],
  places: [{ id: 'place-1', name: 'Banco Santander' }],
  investmentState: { ars: { status: 'ready' }, usd: { status: 'ready' } },
}

export const arsPreview: SavingContributionPreviewResult = {
  previewToken: 'a'.repeat(64),
  preview: {
    draft: { currency: 'ARS', amount: { amount: '100000.00', currency: 'ARS' } },
    allocations: [
      { goalId: 'goal-ars-1', goalName: 'Viaje a Bariloche', percentage: '60.00', amount: { amount: '60000.00', currency: 'ARS' }, progressBefore: '20.00', progressAfter: '40.00', projectionBefore: { status: 'available', completionMonth: '2027-06' }, projectionAfter: { status: 'available', completionMonth: '2027-02' } },
      { goalId: 'goal-ars-2', goalName: 'Auto nuevo', percentage: '40.00', amount: { amount: '40000.00', currency: 'ARS' }, progressBefore: '10.00', progressAfter: '20.00', projectionBefore: { status: 'available', completionMonth: '2028-12' }, projectionAfter: { status: 'available', completionMonth: '2028-09' } },
    ],
  },
}

export const usdPreview: SavingContributionPreviewResult = {
  previewToken: 'b'.repeat(64),
  preview: {
    draft: { currency: 'USD', amount: { amount: '100.00', currency: 'USD' }, arsSpent: { amount: '150000.00', currency: 'ARS' }, effectiveRate: '1500.00' },
    allocations: [{ goalId: 'goal-usd-1', goalName: 'Colchón financiero', percentage: '100.00', amount: { amount: '100.00', currency: 'USD' }, progressBefore: '0.00', progressAfter: '10.00', projectionBefore: { status: 'available', completionMonth: '2029-03' }, projectionAfter: { status: 'available', completionMonth: '2029-01' } }],
  },
}

export const investmentContext: SavingContributionContext = {
  ...defaultContext,
  eligibleGoals: [{ id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '100.00' }],
  eligibleGoalsUsd: [],
  eligibleInvestmentGoalsUsd: [{ id: 'goal-inv-usd', name: 'S&P 500 USD', percentage: '100.00' }],
}

export function renderContribution(props: Partial<SavingContributionProps> = {}) {
  return render(<SavingContribution context={defaultContext} onCancel={() => {}} onSuccess={() => {}} {...props} />)
}

export async function selectSavingsPlace(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name: 'Banco Santander' }))
}
