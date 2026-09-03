// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { previewSavingContribution } from '../../../features/contributions/saving-contribution.functions'
import { usdPreview, renderContribution, selectSavingsPlace } from './saving-contribution-test-support'

vi.mock('@tanstack/react-router', () => ({ useRouter: vi.fn() }))
vi.mock('@posthog/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../features/contributions/saving-contribution.functions', () => ({ previewSavingContribution: vi.fn(), confirmSavingContribution: vi.fn(), updateSavingContribution: vi.fn() }))

beforeEach(() => vi.mocked(useRouter).mockReturnValue({ invalidate: vi.fn().mockResolvedValue(undefined) } as any))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('prefills the USD planning rate and derives ARS spent', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(usdPreview)
  renderContribution()
  await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))
  await selectSavingsPlace(user)
  expect(screen.getByLabelText(/tipo de cambio/i)).toHaveValue('1.500')
  await user.type(screen.getByLabelText(/monto en dólares/i), '100')
  await waitFor(() => expect(screen.getByLabelText(/pesos gastados/i)).toHaveValue('150.000'))
  expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()
})

it('includes the savings place in the USD preview request', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(usdPreview)
  renderContribution()
  await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))
  await selectSavingsPlace(user)
  await user.type(screen.getByLabelText(/monto en dólares/i), '100')

  await waitFor(() => expect(previewSavingContribution).toHaveBeenLastCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      place: { kind: 'existing', placeId: 'place-1' },
    }),
  })))
})

it('derives the USD rate when USD and ARS spent are entered', async () => {
  const user = userEvent.setup()
  renderContribution()
  await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))
  await selectSavingsPlace(user)
  await user.clear(screen.getByLabelText(/tipo de cambio/i))
  await user.type(screen.getByLabelText(/monto en dólares/i), '200')
  await user.type(screen.getByLabelText(/pesos gastados/i), '300000')
  await waitFor(() => expect(screen.getByLabelText(/tipo de cambio/i)).toHaveValue('1.500'))
})

it('shows the USD incoherence error and withholds preview', async () => {
  const user = userEvent.setup()
  renderContribution()
  await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))
  await selectSavingsPlace(user)
  await user.type(screen.getByLabelText(/monto en dólares/i), '100')
  await user.clear(screen.getByLabelText(/pesos gastados/i))
  await user.type(screen.getByLabelText(/pesos gastados/i), '50000')
  expect(await screen.findByText('Los valores en USD, ARS gastados y tipo de cambio no coinciden.')).toBeVisible()
  expect(screen.getByRole('button', { name: /confirmar ahorro/i })).toBeDisabled()
})
