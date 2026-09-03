// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { confirmSavingContribution, previewSavingContribution } from '../../../features/contributions/saving-contribution.functions'
import { arsPreview, defaultContext, renderContribution, selectSavingsPlace } from './saving-contribution-test-support'

vi.mock('@tanstack/react-router', () => ({ useRouter: vi.fn() }))
vi.mock('@posthog/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../features/contributions/saving-contribution.functions', () => ({ previewSavingContribution: vi.fn(), confirmSavingContribution: vi.fn(), updateSavingContribution: vi.fn() }))

beforeEach(() => vi.mocked(useRouter).mockReturnValue({ invalidate: vi.fn().mockResolvedValue(undefined) } as any))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('waits for a savings place before requesting an ARS preview', async () => {
  const user = userEvent.setup()
  renderContribution()
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(previewSavingContribution).not.toHaveBeenCalled()
})

it('renders the ARS allocation and trajectory preview after debounce', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  renderContribution()
  await selectSavingsPlace(user)
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()
  expect(screen.getByText('$ 60.000,00')).toBeVisible()
  expect(screen.getByText('Junio de 2027')).toBeVisible()
})

it('refreshes the preview when the savings place changes', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  renderContribution({ context: { ...defaultContext, places: [...defaultContext.places, { id: 'place-2', name: 'Caja de ahorro' }] } })
  const place = screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' })
  await user.click(place)
  await user.click(await screen.findByRole('option', { name: 'Banco Santander' }))
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  await waitFor(() => expect(previewSavingContribution).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ place: { kind: 'existing', placeId: 'place-1' } }) })))
  await user.click(place)
  await user.click(await screen.findByRole('option', { name: 'Caja de ahorro' }))
  await waitFor(() => expect(previewSavingContribution).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ place: { kind: 'existing', placeId: 'place-2' } }) })))
})

it('renders a new-place validation error once after touching the input or blur', async () => {
  const user = userEvent.setup()
  renderContribution()
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  await user.click(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' }))
  await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
  const input = screen.getByRole('textbox', { name: 'Nombre del lugar nuevo' })
  await user.click(input)
  await user.tab()
  const error = await screen.findByText('Escribí un nombre para el lugar.')
  expect(error).toHaveAttribute('data-slot', 'field-error')
  expect(screen.getAllByText('Escribí un nombre para el lugar.')).toHaveLength(1)
})

it('does not request a preview nor show an error alert when selecting new place with empty name', async () => {
  const user = userEvent.setup()
  renderContribution()
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  await user.click(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' }))
  await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))

  await new Promise((resolve) => setTimeout(resolve, 350))
  expect(previewSavingContribution).not.toHaveBeenCalled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByText('Escribí un nombre para el lugar.')).not.toBeInTheDocument()
})

it('clears the preview immediately when the draft changes', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  renderContribution()
  await selectSavingsPlace(user)
  const amount = screen.getByLabelText(/monto en pesos/i)
  await user.type(amount, '100000')
  expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()
  await user.type(amount, '0')
  expect(screen.queryByText('Así se distribuye tu ahorro')).not.toBeInTheDocument()
})

it('submits an ARS contribution and closes successfully', async () => {
  const user = userEvent.setup()
  const onSuccess = vi.fn()
  vi.mocked(previewSavingContribution).mockResolvedValue(arsPreview)
  vi.mocked(confirmSavingContribution).mockResolvedValue({ status: 'created', contributionId: 'contribution-123' })
  renderContribution({ onSuccess })
  await selectSavingsPlace(user)
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')
  await screen.findByText('Así se distribuye tu ahorro')
  const confirm = await screen.findByRole('button', { name: /confirmar ahorro/i })
  expect(confirm).toBeEnabled()
  await user.click(confirm)
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  expect(toast.success).toHaveBeenCalledWith('Ahorro registrado.')
})

it('replaces unexpected preview server error with stable Spanish copy', async () => {
  const user = userEvent.setup()
  vi.mocked(previewSavingContribution).mockRejectedValue(new Error('Internal Zod error: {"field": "unexpected"}'))
  renderContribution()
  await selectSavingsPlace(user)
  await user.type(screen.getByLabelText(/monto en pesos/i), '100000')

  expect(await screen.findByText('No pudimos calcular la vista previa.')).toBeVisible()
  expect(screen.queryByText(/Internal Zod error/i)).not.toBeInTheDocument()
})
