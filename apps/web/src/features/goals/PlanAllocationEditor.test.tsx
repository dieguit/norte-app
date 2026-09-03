// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoalCreationAllocation } from './goal-creation'
import { PlanAllocationEditor } from './PlanAllocationEditor'

afterEach(cleanup)

describe('PlanAllocationEditor component', () => {
  const createMockAllocation = (
    overrides?: Partial<GoalCreationAllocation>,
  ): GoalCreationAllocation => ({
    monthlyContribution: { amount: '120000.00', currency: 'ARS' },
    effectiveMonth: '2026-09-01',
    totalPercentage: '100.00',
    entries: [
      {
        goalId: 'goal-1',
        goalName: 'Fondo de emergencia',
        percentage: '50.00',
        allocatedBaseAmount: { amount: '60000.00', currency: 'ARS' },
        allocatedDestinationAmount: { amount: '40.00', currency: 'USD' },
        pending: false,
      },
      {
        goalId: 'goal-2',
        goalName: 'Auto nuevo',
        percentage: '30.00',
        allocatedBaseAmount: { amount: '36000.00', currency: 'ARS' },
        allocatedDestinationAmount: { amount: '36000.00', currency: 'ARS' },
        pending: false,
      },
      {
        goalId: 'pending-goal',
        goalName: 'Viaje al sur',
        percentage: '20.00',
        allocatedBaseAmount: { amount: '24000.00', currency: 'ARS' },
        allocatedDestinationAmount: { amount: '24000.00', currency: 'ARS' },
        pending: true,
      },
    ],
    ...overrides,
  })

  describe('Step 1: Rendering, language and copy boundaries', () => {
    it('renders group heading, all goal names, derived amounts and USD conversion', () => {
      const allocation = createMockAllocation()

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      // Group heading
      expect(screen.getByText('Distribución de tu aporte mensual')).toBeVisible()

      // Header summary with monthly contribution should not be in editor
      expect(screen.queryByText('Tu aporte mensual')).not.toBeInTheDocument()

      // Goal names in DOM order: pending goal first, then existing goals
      const names = screen
        .getAllByText(/Viaje al sur|Fondo de emergencia|Auto nuevo/)
        .map((node) => node.textContent)
      expect(names).toEqual(['Viaje al sur', 'Fondo de emergencia', 'Auto nuevo'])

      // Section subtitles
      expect(screen.getByText('Nuevo objetivo')).toBeVisible()
      expect(screen.getByText('Tus objetivos actuales')).toBeVisible()

      // Derived ARS amounts
      expect(screen.getByText('$ 60.000,00')).toBeVisible()
      expect(screen.getByText('$ 36.000,00')).toBeVisible()
      expect(screen.getByText('$ 24.000,00')).toBeVisible()

      // USD conversion estimate rendered for USD destination
      expect(screen.getByText('≈ USD 40,00 por mes')).toBeVisible()

      // Input values formatted with Argentine comma decimal separator
      expect(
        screen.getByRole('textbox', { name: /porcentaje para fondo de emergencia/i }),
      ).toHaveValue('50,00')
      expect(
        screen.getByRole('textbox', { name: /porcentaje para auto nuevo/i }),
      ).toHaveValue('30,00')
      expect(
        screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i }),
      ).toHaveValue('20,00')

      // Ensure legacy channel headings are not rendered
      expect(screen.queryByText(/Ahorrar en|Invertir en/)).not.toBeInTheDocument()
    })

    it('renders only pending section subtitle when there are no existing goals', () => {
      const allocation = createMockAllocation({
        entries: [
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '100.00',
            allocatedBaseAmount: { amount: '120000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '120000.00', currency: 'ARS' },
            pending: true,
          },
        ],
      })

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Nuevo objetivo')).toBeVisible()
      expect(screen.queryByText('Tus objetivos actuales')).not.toBeInTheDocument()
      expect(screen.getByText('Viaje al sur')).toBeVisible()
    })

    it('renders only existing section subtitle when there is no pending goal', () => {
      const allocation = createMockAllocation({
        entries: [
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            percentage: '100.00',
            allocatedBaseAmount: { amount: '120000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '120000.00', currency: 'ARS' },
            pending: false,
          },
        ],
      })

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.queryByText('Nuevo objetivo')).not.toBeInTheDocument()
      expect(screen.getByText('Tus objetivos actuales')).toBeVisible()
      expect(screen.getByText('Fondo de emergencia')).toBeVisible()
    })

    it('explicitly rejects internal terminology from user-facing UI', () => {
      const allocation = createMockAllocation()

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.queryByText(/canal/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/snapshot/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/allocation/i)).not.toBeInTheDocument()
    })

    it('handles allocation when monthlyContribution is undefined', () => {
      const allocation = createMockAllocation({
        monthlyContribution: undefined,
      })

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Distribución de tu aporte mensual')).toBeVisible()
      expect(screen.queryByText('Tu aporte mensual')).not.toBeInTheDocument()
    })
  })

  describe('Step 2: Synchronization, validation and interaction', () => {
    it('synchronizes text input typing with onPercentageChange', async () => {
      const user = userEvent.setup()
      const onPercentageChange = vi.fn()
      const onPercentageCommit = vi.fn()

      function TestHarness() {
        const [allocation, setAllocation] = useState<GoalCreationAllocation>(createMockAllocation())
        return (
          <PlanAllocationEditor
            allocation={allocation}
            onPercentageChange={(goalId, percentage) => {
              onPercentageChange(goalId, percentage)
              setAllocation((prev) => ({
                ...prev,
                entries: prev.entries.map((e) =>
                  e.goalId === goalId ? { ...e, percentage } : e,
                ),
              }))
            }}
            onPercentageCommit={onPercentageCommit}
          />
        )
      }

      render(<TestHarness />)

      const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
      await user.clear(input)
      await user.type(input, '25,50')

      expect(onPercentageChange).toHaveBeenLastCalledWith('pending-goal', '25,50')
    })

    it('calls onPercentageCommit on text input blur', async () => {
      const user = userEvent.setup()
      const onPercentageCommit = vi.fn()
      const allocation = createMockAllocation()

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={onPercentageCommit}
        />,
      )

      const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
      await user.click(input)
      await user.tab()

      expect(onPercentageCommit).toHaveBeenCalledTimes(1)
    })

    it('synchronizes slider change with onPercentageChange formatted to two decimals', () => {
      const onPercentageChange = vi.fn()
      const onPercentageCommit = vi.fn()
      const allocation = createMockAllocation()

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={onPercentageChange}
          onPercentageCommit={onPercentageCommit}
        />,
      )

      const sliders = screen.getAllByRole('slider', { hidden: true })
      fireEvent.change(sliders[0], { target: { value: '30' } })

      expect(onPercentageChange).toHaveBeenLastCalledWith('pending-goal', '30.00')
    })

    it('displays "Falta asignar X%" and marks fields as invalid when total is less than 100%', () => {
      const allocation = createMockAllocation({
        entries: [
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            percentage: '50.00',
            pending: false,
          },
          {
            goalId: 'goal-2',
            goalName: 'Auto nuevo',
            percentage: '30.00',
            pending: false,
          },
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '14.50',
            pending: true,
          },
        ],
      })

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Falta asignar 5,50%')).toBeVisible()
      expect(screen.getByRole('alert')).toHaveTextContent('Falta asignar 5,50%')

      const inputs = screen.getAllByRole('textbox')
      for (const input of inputs) {
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveAttribute('aria-describedby', 'allocation-total-error')
      }
      const sliders = screen.getAllByRole('slider', { hidden: true })
      for (const slider of sliders) {
        expect(slider).toHaveAttribute('aria-invalid', 'true')
        expect(slider).toHaveAttribute('aria-describedby', 'allocation-total-error')
      }
    })

    it('displays "Te excediste X%" and marks fields as invalid when total exceeds 100%', () => {
      const allocation = createMockAllocation({
        entries: [
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            percentage: '50.00',
            pending: false,
          },
          {
            goalId: 'goal-2',
            goalName: 'Auto nuevo',
            percentage: '30.00',
            pending: false,
          },
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '24.00',
            pending: true,
          },
        ],
      })

      render(
        <PlanAllocationEditor
          allocation={allocation}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Te excediste 4,00%')).toBeVisible()
      expect(screen.getByRole('alert')).toHaveTextContent('Te excediste 4,00%')

      const inputs = screen.getAllByRole('textbox')
      for (const input of inputs) {
        expect(input).toHaveAttribute('aria-invalid', 'true')
      }
    })

    it('disables all inputs and sliders when disabled prop is true', () => {
      const allocation = createMockAllocation()

      render(
        <PlanAllocationEditor
          allocation={allocation}
          disabled={true}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      const inputs = screen.getAllByRole('textbox')
      for (const input of inputs) {
        expect(input).toBeDisabled()
      }

      const sliders = screen.getAllByRole('slider', { hidden: true })
      for (const slider of sliders) {
        expect(slider).toBeDisabled()
      }
    })
  })
})
