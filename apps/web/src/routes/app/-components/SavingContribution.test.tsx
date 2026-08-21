// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import {
  previewSavingContribution,
  confirmSavingContribution,
} from '../../../features/contributions/saving-contribution.functions'
import type {
  SavingContributionContext,
  SavingContributionPreviewResult,
} from '../../../features/contributions/saving-contribution'
import { SavingContribution } from './SavingContribution'

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../features/contributions/saving-contribution.functions', () => ({
  previewSavingContribution: vi.fn(),
  confirmSavingContribution: vi.fn(),
}))

afterEach(cleanup)

describe('SavingContribution component', () => {
  const mockInvalidate = vi.fn().mockResolvedValue(undefined)

  const defaultContext: SavingContributionContext = {
    currentMonth: '2026-08',
    eligibleGoals: [
      { id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '60.00' },
      { id: 'goal-ars-2', name: 'Auto nuevo', percentage: '40.00' },
    ],
    eligibleGoalsUsd: [
      { id: 'goal-usd-1', name: 'Colchón financiero', percentage: '100.00' },
    ],
  }

  const mockArsPreview: SavingContributionPreviewResult = {
    previewToken: 'a'.repeat(64),
    preview: {
      draft: {
        currency: 'ARS',
        amount: { amount: '100000.00', currency: 'ARS' },
        location: 'Banco Santander',
      },
      allocations: [
        {
          goalId: 'goal-ars-1',
          goalName: 'Viaje a Bariloche',
          percentage: '60.00',
          amount: { amount: '60000.00', currency: 'ARS' },
          progressBefore: '20.00',
          progressAfter: '40.00',
          projectionBefore: { status: 'available', completionMonth: '2027-06' },
          projectionAfter: { status: 'available', completionMonth: '2027-02' },
        },
        {
          goalId: 'goal-ars-2',
          goalName: 'Auto nuevo',
          percentage: '40.00',
          amount: { amount: '40000.00', currency: 'ARS' },
          progressBefore: '10.00',
          progressAfter: '20.00',
          projectionBefore: { status: 'available', completionMonth: '2028-12' },
          projectionAfter: { status: 'available', completionMonth: '2028-09' },
        },
      ],
    },
  }

  const mockUsdPreview: SavingContributionPreviewResult = {
    previewToken: 'b'.repeat(64),
    preview: {
      draft: {
        currency: 'USD',
        amount: { amount: '100.00', currency: 'USD' },
        arsSpent: { amount: '150000.00', currency: 'ARS' },
        effectiveRate: '1500.00',
      },
      allocations: [
        {
          goalId: 'goal-usd-1',
          goalName: 'Colchón financiero',
          percentage: '100.00',
          amount: { amount: '100.00', currency: 'USD' },
          progressBefore: '0.00',
          progressAfter: '10.00',
          projectionBefore: { status: 'available', completionMonth: '2029-03' },
          projectionAfter: { status: 'available', completionMonth: '2029-01' },
        },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      invalidate: mockInvalidate,
    } as any)
  })

  describe('ARS contribution flow', () => {
    it('renders currency choices, inputs with decimal inputMode, and calculates debounced preview', async () => {
      const user = userEvent.setup()
      vi.mocked(previewSavingContribution).mockResolvedValue(mockArsPreview)

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Ahorré ARS' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Ahorré USD' })).toBeVisible()

      const amountInput = screen.getByLabelText(/monto en pesos/i)
      expect(amountInput).toHaveAttribute('inputMode', 'decimal')

      const locationInput = screen.getByLabelText(/dónde está guardado/i)
      expect(locationInput).toBeVisible()

      await user.type(amountInput, '100000')
      await user.type(locationInput, 'Banco Santander')

      await waitFor(() => {
        expect(previewSavingContribution).toHaveBeenCalledWith({
          data: expect.objectContaining({
            currency: 'ARS',
            amount: '100.000',
            location: 'Banco Santander',
          }),
        })
      })

      // Section: Así se distribuye tu ahorro
      expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()
      expect(screen.getAllByText('Viaje a Bariloche')[0]).toBeVisible()
      expect(screen.getByText('$ 60.000,00')).toBeVisible()
      expect(screen.getAllByText('Auto nuevo')[0]).toBeVisible()
      expect(screen.getByText('$ 40.000,00')).toBeVisible()

      // Section: Antes / Con este aporte
      expect(screen.getAllByText('Antes').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Con este aporte').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('junio de 2027')).toBeVisible()
      expect(screen.getByText('febrero de 2027')).toBeVisible()
    })

    it('submits confirmation and calls onSuccess with toast', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      vi.mocked(previewSavingContribution).mockResolvedValue(mockArsPreview)
      vi.mocked(confirmSavingContribution).mockResolvedValue({
        status: 'created',
        contributionId: 'contribution-123',
      })

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={onSuccess}
        />,
      )

      const amountInput = screen.getByLabelText(/monto en pesos/i)
      await user.type(amountInput, '100000')

      expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()

      const confirmBtn = screen.getByRole('button', { name: /confirmar ahorro/i })
      expect(confirmBtn).toBeEnabled()

      await user.click(confirmBtn)

      await waitFor(() => {
        expect(confirmSavingContribution).toHaveBeenCalledWith({
          data: {
            draft: expect.objectContaining({
              currency: 'ARS',
              amount: '100.000',
            }),
            previewToken: mockArsPreview.previewToken,
          },
        })
        expect(mockInvalidate).toHaveBeenCalledTimes(1)
        expect(toast.success).toHaveBeenCalledWith('Ahorro registrado.')
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it('clears preview when draft is modified', async () => {
      const user = userEvent.setup()
      vi.mocked(previewSavingContribution).mockResolvedValue(mockArsPreview)

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      const amountInput = screen.getByLabelText(/monto en pesos/i)
      await user.type(amountInput, '100000')

      expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()
      expect(screen.getByRole('button', { name: /confirmar ahorro/i })).toBeEnabled()

      // Modify input
      await user.type(amountInput, '0')

      expect(screen.queryByText('Así se distribuye tu ahorro')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirmar ahorro/i })).toBeDisabled()
    })
  })

  describe('USD purchase flow', () => {
    it('prefills planning rate and derives ARS spent from USD amount', async () => {
      const user = userEvent.setup()
      vi.mocked(previewSavingContribution).mockResolvedValue(mockUsdPreview)

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      // Switch to USD
      await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))

      const rateInput = screen.getByLabelText(/tipo de cambio/i)
      expect(rateInput).toHaveValue('1.500')

      const usdInput = screen.getByLabelText(/monto en dólares/i)
      const arsSpentInput = screen.getByLabelText(/pesos gastados/i)

      await user.type(usdInput, '100')

      // Derived ARS spent should be 150.000
      await waitFor(() => {
        expect(arsSpentInput).toHaveValue('150.000')
      })

      await waitFor(() => {
        expect(previewSavingContribution).toHaveBeenCalledWith({
          data: expect.objectContaining({
            currency: 'USD',
            amount: '100',
            effectiveRate: expect.stringMatching(/^1500/),
          }),
        })
      })

      expect((await screen.findAllByText('Colchón financiero'))[0]).toBeVisible()
      expect(screen.getByText('US$ 100,00')).toBeVisible()
    })

    it('derives rate when USD and ARS spent are entered', async () => {
      const user = userEvent.setup()
      vi.mocked(previewSavingContribution).mockResolvedValue(mockUsdPreview)

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))

      const usdInput = screen.getByLabelText(/monto en dólares/i)
      const arsSpentInput = screen.getByLabelText(/pesos gastados/i)
      const rateInput = screen.getByLabelText(/tipo de cambio/i)

      await user.clear(rateInput)
      await user.type(usdInput, '200')
      await user.type(arsSpentInput, '300000')

      await waitFor(() => {
        expect(rateInput).toHaveValue('1.500')
      })
    })

    it('displays incoherence error and prevents preview when 3 values mismatch', async () => {
      const user = userEvent.setup()

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Ahorré USD' }))

      const usdInput = screen.getByLabelText(/monto en dólares/i)
      const arsSpentInput = screen.getByLabelText(/pesos gastados/i)

      await user.type(usdInput, '100')
      await user.clear(arsSpentInput)
      await user.type(arsSpentInput, '50000') // 100 * 1500 != 50000

      expect(
        await screen.findByText('Los valores en USD, ARS gastados y tipo de cambio no coinciden.'),
      ).toBeVisible()

      expect(previewSavingContribution).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /confirmar ahorro/i })).toBeDisabled()
    })
  })

  describe('Empty eligible goals', () => {
    it('shows informative message and disables confirmation when no eligible goals exist for currency', async () => {
      const emptyArsContext: SavingContributionContext = {
        currentMonth: '2026-08',
        eligibleGoals: [],
        eligibleGoalsUsd: [
          { id: 'goal-usd-1', name: 'Colchón financiero', percentage: '100.00' },
        ],
      }

      render(
        <SavingContribution
          context={emptyArsContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      expect(
        screen.getByText('No tenés objetivos activos en ARS para asignar este ahorro.'),
      ).toBeVisible()

      expect(screen.getByRole('button', { name: /confirmar ahorro/i })).toBeDisabled()
    })
  })

  describe('Stale preview and error resilience', () => {
    it('handles stale preview response, presents warning, updates preview, and requires reconfirmation', async () => {
      const user = userEvent.setup()
      const refreshedPreview: SavingContributionPreviewResult = {
        previewToken: 'c'.repeat(64),
        preview: {
          ...mockArsPreview.preview,
          allocations: [
            {
              goalId: 'goal-ars-1',
              goalName: 'Viaje a Bariloche',
              percentage: '100.00',
              amount: { amount: '100000.00', currency: 'ARS' },
              progressBefore: '20.00',
              progressAfter: '50.00',
              projectionBefore: { status: 'available', completionMonth: '2027-06' },
              projectionAfter: { status: 'available', completionMonth: '2027-01' },
            },
          ],
        },
      }

      vi.mocked(previewSavingContribution).mockResolvedValue(mockArsPreview)
      vi.mocked(confirmSavingContribution).mockResolvedValueOnce({
        status: 'stale',
        preview: refreshedPreview,
      })

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      const amountInput = screen.getByLabelText(/monto en pesos/i)
      await user.type(amountInput, '100000')

      expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()

      await user.click(screen.getByRole('button', { name: /confirmar ahorro/i }))

      expect(
        await screen.findByText('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.'),
      ).toBeVisible()

      // Preview is updated with refreshed data
      expect(screen.getByText('$ 100.000,00')).toBeVisible()

      // User confirms again with the new token
      vi.mocked(confirmSavingContribution).mockResolvedValueOnce({
        status: 'created',
        contributionId: 'contribution-456',
      })

      await user.click(screen.getByRole('button', { name: /confirmar ahorro/i }))

      await waitFor(() => {
        expect(confirmSavingContribution).toHaveBeenLastCalledWith({
          data: {
            draft: expect.objectContaining({
              currency: 'ARS',
              amount: '100.000',
            }),
            previewToken: refreshedPreview.previewToken,
          },
        })
      })
    })

    it('preserves form inputs on persistence failure and allows retry', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      vi.mocked(previewSavingContribution).mockResolvedValue(mockArsPreview)
      vi.mocked(confirmSavingContribution)
        .mockRejectedValueOnce(new Error('Fallo de red'))
        .mockResolvedValueOnce({
          status: 'created',
          contributionId: 'contribution-789',
        })

      render(
        <SavingContribution
          context={defaultContext}
          onCancel={vi.fn()}
          onSuccess={onSuccess}
        />,
      )

      const amountInput = screen.getByLabelText(/monto en pesos/i)
      await user.type(amountInput, '100000')

      expect(await screen.findByText('Así se distribuye tu ahorro')).toBeVisible()

      await user.click(screen.getByRole('button', { name: /confirmar ahorro/i }))

      expect(await screen.findByText('Fallo de red')).toBeVisible()
      expect(amountInput).toHaveValue('100.000')

      // Retry succeeds
      await user.click(screen.getByRole('button', { name: /confirmar ahorro/i }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it('renders monthly saving target headline when present in context', async () => {
      const contextWithTargets: SavingContributionContext = {
        ...defaultContext,
        monthlyTargetArs: { amount: '60000.00', currency: 'ARS' },
        monthlyTargetUsd: { amount: '30.00', currency: 'USD' },
      }

      render(
        <SavingContribution
          context={contextWithTargets}
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />,
      )

      expect(
        screen.getByText(/Necesitás ahorrar/i),
      ).toBeInTheDocument()
      expect(screen.getByText('$ 60.000,00')).toBeInTheDocument()

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /ahorré usd/i }))

      expect(screen.getByText('US$ 30,00')).toBeInTheDocument()
    })
  })
})
