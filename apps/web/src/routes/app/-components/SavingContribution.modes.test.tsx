// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { getInvestmentContributionDataState, type SavingContributionPreviewResult } from '../../../features/contributions/saving-contribution'
import { confirmSavingContribution, previewSavingContribution, updateSavingContribution } from '../../../features/contributions/saving-contribution.functions'
import { arsPreview, investmentContext, renderContribution, selectSavingsPlace, usdPreview } from './saving-contribution-test-support'

vi.mock('@tanstack/react-router', () => ({ useRouter: vi.fn() }))
vi.mock('@posthog/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../features/contributions/saving-contribution.functions', () => ({ previewSavingContribution: vi.fn(), confirmSavingContribution: vi.fn(), updateSavingContribution: vi.fn() }))

beforeEach(() => vi.mocked(useRouter).mockReturnValue({ invalidate: vi.fn().mockResolvedValue(undefined) } as any))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const investmentUsdPreview: SavingContributionPreviewResult = {
  ...usdPreview,
  preview: {
    ...usdPreview.preview,
    draft: { ...usdPreview.preview.draft, kind: 'investment' },
    allocations: [{ ...usdPreview.preview.allocations[0], goalId: 'goal-inv-usd', goalName: 'S&P 500 USD' }],
  },
}

it('renders fixed USD investment mode without switcher or savings place', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(investmentUsdPreview)
  renderContribution({ kind: 'investment', currency: 'USD', context: investmentContext })
  expect(screen.queryByRole('button', { name: 'Ahorré USD' })).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.type(screen.getByLabelText(/monto en dólares/i), '200')
  expect(await screen.findByText('Así se distribuye tu inversión')).toBeVisible()
})

it('shows currency-specific incomplete investment data and disables confirmation', () => {
  renderContribution({ kind: 'investment', currency: 'USD', context: { ...investmentContext, investmentState: { ars: { status: 'ready' }, usd: { status: 'incomplete', reason: 'missing_investment_position' } } } })
  expect(screen.getByText(/falta asociar una posición de inversión en USD/i)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar inversión' })).toBeDisabled()
})

it('shows the empty investment goals state for the selected currency', () => {
  renderContribution({ kind: 'investment', currency: 'USD', context: { ...investmentContext, eligibleInvestmentGoalsUsd: [] } })
  expect(screen.getByText('No hay objetivos activos para distribuir la inversión en USD.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar inversión' })).toBeDisabled()
})

it('shows ARS incomplete investment data while USD remains available', () => {
  renderContribution({ kind: 'investment', currency: 'ARS', context: { ...investmentContext, eligibleInvestmentGoals: [{ id: 'inv-ars', name: 'S&P 500 ARS', percentage: '100.00' }], investmentState: { ars: { status: 'incomplete', reason: 'missing_investment_position' }, usd: { status: 'ready' } } } })
  expect(screen.getByText(/falta asociar una posición de inversión en ARS/i)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar inversión' })).toBeDisabled()
})

it('keeps USD investment available when ARS investment data is incomplete', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(investmentUsdPreview)
  renderContribution({ kind: 'investment', currency: 'USD', context: { ...investmentContext, investmentState: { ars: { status: 'incomplete', reason: 'missing_investment_position' }, usd: { status: 'ready' } } } })
  await user.type(screen.getByLabelText(/monto en dólares/i), '200')
  await waitFor(() => expect(previewSavingContribution).toHaveBeenCalled())
  expect(screen.queryByText(/falta asociar una posición de inversión en USD/i)).not.toBeInTheDocument()
})

it('shows the ARS incomplete state when its position has the wrong currency', () => {
  const context = { ...investmentContext, eligibleInvestmentGoals: [{ id: 'goal-inv-ars', name: 'S&P 500 ARS', percentage: '100.00' }], investmentState: getInvestmentContributionDataState({ goals: [{ id: 'goal-inv-ars', currency: 'ARS', status: 'active', strategy: 'invest' }], investmentPositions: [{ goalId: 'goal-inv-ars', currency: 'USD' }] } as any) }
  renderContribution({ kind: 'investment', currency: 'ARS', context })
  expect(screen.getByText(/falta asociar una posición de inversión en ARS/i)).toBeVisible()
})

it('renders fixed ARS investment and saving modes with their correct actions', () => {
  const context = { ...investmentContext, eligibleInvestmentGoals: [{ id: 'inv-ars', name: 'Cedears', percentage: '100.00' }] }
  const { unmount } = renderContribution({ kind: 'investment', currency: 'ARS', context })
  expect(screen.getByLabelText(/monto en pesos/i)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar inversión' })).toBeDisabled()
  unmount()
  renderContribution({ kind: 'saving', currency: 'ARS', context })
  expect(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar ahorro' })).toBeDisabled()
})

it('does not include a savings place in investment confirmation', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  vi.mocked(confirmSavingContribution).mockResolvedValue({ status: 'created', contributionId: 'investment-1' })
  renderContribution({ kind: 'investment', currency: 'ARS', context: { ...investmentContext, eligibleGoals: [], eligibleInvestmentGoals: [{ id: 'investment-goal', name: 'Cedears', percentage: '100.00' }] } })
  await user.type(screen.getByLabelText(/monto en pesos/i), '200')
  await screen.findByText('Así se distribuye tu inversión')
  await user.click(await screen.findByRole('button', { name: 'Confirmar inversión' }))
  await waitFor(() => expect((vi.mocked(confirmSavingContribution).mock.calls[0] as any)[0].data.draft).not.toHaveProperty('place'))
})

it('loads an existing contribution for correction and preserves its distribution', async () => {
  const user = userEvent.setup()
  vi.mocked(updateSavingContribution).mockResolvedValue({ status: 'updated' })
  renderContribution({ initialContribution: { id: 'contribution-1', kind: 'saving', amount: '100.00', currency: 'ARS', placeId: 'place-1', createdAt: '2026-08-01T00:00:00.000Z', allocations: [{ goalId: 'goal-ars-1', goalName: 'Viaje a Bariloche', amount: '60000.00', percentage: '60.00' }, { goalId: 'goal-ars-2', goalName: 'Auto nuevo', amount: '40000.00', percentage: '40.00' }] } as any })
  expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(updateSavingContribution).toHaveBeenCalled())
})

it('initializes a catch-up contribution and sends its month on confirmation', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  vi.mocked(confirmSavingContribution).mockResolvedValue({ status: 'created', contributionId: 'catchup-1' })
  renderContribution({ kind: 'saving', currency: 'ARS', initialAmount: '25000.00', catchUpMonth: '2026-07' })
  expect(screen.getByText('Este aporte se registrará para Julio de 2026.')).toBeVisible()
  await selectSavingsPlace(user)
  const amount = screen.getByLabelText(/monto en pesos/i)
  await user.clear(amount)
  await user.type(amount, '30000')
  await screen.findByText('Así se distribuye tu ahorro')
  await user.click(await screen.findByRole('button', { name: /confirmar ahorro/i }))
  await waitFor(() => expect(confirmSavingContribution).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ catchUpMonth: '2026-07' }) })))
})
