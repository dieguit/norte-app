// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'
import type { SavingContributionContext } from '../../../features/contributions/saving-contribution'
import { SavingContributionSheet } from './SavingContributionSheet'

vi.mock('../../../features/contributions/saving-contribution.functions', () => ({ getSavingContributionContext: vi.fn(), previewSavingContribution: vi.fn(), confirmSavingContribution: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate: vi.fn() }) }))

const sampleContext: SavingContributionContext = {
  currentMonth: '2026-08',
  eligibleGoals: [{ id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '100.00' }],
  eligibleGoalsUsd: [],
  places: [],
  investmentState: { ars: { status: 'ready' }, usd: { status: 'ready' } },
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('does not render sheet contents when closed', () => {
  renderSheet(false)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('renders loading skeleton and then the saving contribution form', async () => {
  vi.mocked(getSavingContributionContext).mockResolvedValue({ profile: 'present', context: sampleContext })
  renderSheet(true)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(await screen.findByText('Ahorré ARS')).toBeInTheDocument()
  expect(await screen.findByLabelText(/monto/i)).toBeInTheDocument()
})

it('renders a loading error and retries context loading', async () => {
  const user = userEvent.setup()
  vi.mocked(getSavingContributionContext).mockRejectedValueOnce(new Error('Error de conexión')).mockResolvedValueOnce({ profile: 'present', context: sampleContext })
  renderSheet(true)
  expect(await screen.findByText('Error de conexión')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /reintentar/i }))
  expect(await screen.findByText('Ahorré ARS')).toBeInTheDocument()
})

it('renders the missing profile error', async () => {
  vi.mocked(getSavingContributionContext).mockResolvedValue({ profile: 'missing' })
  renderSheet(true)
  expect(await screen.findByText('Completá tu perfil financiero antes de registrar un ahorro.')).toBeInTheDocument()
})

it('closes when the form cancel action is clicked', async () => {
  const user = userEvent.setup()
  const onOpenChange = vi.fn()
  vi.mocked(getSavingContributionContext).mockResolvedValue({ profile: 'present', context: sampleContext })
  renderSheet(true, onOpenChange)
  await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

function renderSheet(open: boolean, onOpenChange = vi.fn()) {
  return render(<SavingContributionSheet open={open} onOpenChange={onOpenChange} />)
}
