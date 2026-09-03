// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { confirmSavingContribution, previewSavingContribution } from '../../../features/contributions/saving-contribution.functions'
import { renderContribution, selectSavingsPlace, arsPreview, defaultContext } from './saving-contribution-test-support'

vi.mock('@tanstack/react-router', () => ({ useRouter: vi.fn() }))
vi.mock('@posthog/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../features/contributions/saving-contribution.functions', () => ({ previewSavingContribution: vi.fn(), confirmSavingContribution: vi.fn(), updateSavingContribution: vi.fn() }))

beforeEach(() => vi.mocked(useRouter).mockReturnValue({ invalidate: vi.fn().mockResolvedValue(undefined) } as any))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('shows the empty ARS goals state and disables confirmation', () => {
  renderContribution({ context: { ...defaultContext, eligibleGoals: [], places: [] } })
  expect(screen.getByText('No tenés objetivos activos en ARS para asignar este ahorro.')).toBeVisible()
  expect(screen.getByRole('button', { name: /confirmar ahorro/i })).toBeDisabled()
})

it('replaces a stale preview and allows reconfirmation with the new token', async () => {
  const user = userEvent.setup()
  const refreshed = { ...arsPreview, previewToken: 'c'.repeat(64), preview: { ...arsPreview.preview, allocations: [arsPreview.preview.allocations[0]] } }
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  vi.mocked(confirmSavingContribution).mockResolvedValueOnce({ status: 'stale', preview: refreshed }).mockResolvedValueOnce({ status: 'created', contributionId: 'contribution-456' })
  renderContribution()
  await selectSavingsPlace(user)
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  await screen.findByText('Así se distribuye tu ahorro')
  await user.click(await screen.findByRole('button', { name: /confirmar ahorro/i }))
  expect(await screen.findByText('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /confirmar ahorro/i }))
  await waitFor(() => expect(confirmSavingContribution).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ previewToken: refreshed.previewToken }) })))
})

it('preserves the form after a confirmation failure and permits retry', async () => {
  const user = userEvent.setup()
  const onSuccess = vi.fn()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  vi.mocked(confirmSavingContribution).mockRejectedValueOnce(new Error('Fallo de red')).mockResolvedValueOnce({ status: 'created', contributionId: 'contribution-789' })
  renderContribution({ onSuccess })
  await selectSavingsPlace(user)
  const amount = screen.getByLabelText(/monto en pesos/i)
  await user.type(amount, '100000')
  await screen.findByText('Así se distribuye tu ahorro')
  await user.click(await screen.findByRole('button', { name: /confirmar ahorro/i }))
  expect(await screen.findByText('Fallo de red')).toBeVisible()
  expect(amount).toHaveValue('100.000')
  await user.click(screen.getByRole('button', { name: /confirmar ahorro/i }))
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
})

it('renders saving targets and their fulfilled state', async () => {
  renderContribution({ context: { ...defaultContext, monthlyTargetArs: { amount: '60000.00', currency: 'ARS' }, monthlyTargetUsd: { amount: '30.00', currency: 'USD' } } })
  expect(screen.getByText(/Necesitás ahorrar/i)).toBeInTheDocument()
  expect(screen.getByText('$ 60.000,00')).toBeInTheDocument()
})

it('renders the investment monthly target copy', () => {
  renderContribution({ kind: 'investment', currency: 'ARS', context: { ...defaultContext, eligibleGoals: [], eligibleInvestmentGoals: [{ id: 'inv', name: 'Cedears', percentage: '100.00' }], monthlyInvestmentTargetArs: { amount: '120000.00', currency: 'ARS' } } })
  expect(screen.getByText(/Necesitás invertir/i)).toBeInTheDocument()
})

it('renders the fulfilled saving target message', () => {
  renderContribution({ context: { ...defaultContext, monthlyTargetArs: { amount: '0.00', currency: 'ARS' } } })
  expect(screen.getByText('¡Ya cubriste tu meta de ahorro planificada para este mes!')).toBeInTheDocument()
})

it('renders the fulfilled investment target message', () => {
  renderContribution({ kind: 'investment', currency: 'ARS', context: { ...defaultContext, eligibleGoals: [], eligibleInvestmentGoals: [{ id: 'inv', name: 'Cedears', percentage: '100.00' }], monthlyInvestmentTargetArs: { amount: '0.00', currency: 'ARS' } } })
  expect(screen.getByText('¡Ya cubriste tu meta de inversión planificada para este mes!')).toBeInTheDocument()
})
