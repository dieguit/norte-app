// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoalCreationAllocationGroup } from './goal-creation'
import { PlanAllocationEditor } from './PlanAllocationEditor'

afterEach(cleanup)

describe('PlanAllocationEditor component', () => {
  const createMockGroup = (
    overrides?: Partial<GoalCreationAllocationGroup>,
  ): GoalCreationAllocationGroup => ({
    key: 'save:ARS',
    fundingMethod: 'save',
    destinationCurrency: 'ARS',
    baseCurrency: 'ARS',
    monthlyCommitment: { amount: '120000.00', currency: 'ARS' },
    effectiveMonth: '2026-09-01',
    totalPercentage: '100.00',
    entries: [
      {
        goalId: 'goal-1',
        goalName: 'Fondo de emergencia',
        percentage: '50.00',
        allocatedDestinationAmount: { amount: '60000.00', currency: 'ARS' },
        pending: false,
      },
      {
        goalId: 'goal-2',
        goalName: 'Auto nuevo',
        percentage: '30.00',
        allocatedDestinationAmount: { amount: '36000.00', currency: 'ARS' },
        pending: false,
      },
      {
        goalId: 'pending-goal',
        goalName: 'Viaje al sur',
        percentage: '20.00',
        allocatedDestinationAmount: { amount: '24000.00', currency: 'ARS' },
        pending: true,
      },
    ],
    ...overrides,
  })

  describe('Step 1: Rendering, language and copy boundaries', () => {
    it('renders method header, commitment summary, all goal names, derived amounts and section subtitles in DOM order', () => {
      const group = createMockGroup()

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      // Method header
      expect(screen.getByText('Ahorrar en ARS')).toBeVisible()

      // Summary line with commitment and percentage
      expect(
        screen.getByText('De tus $ 120.000,00 mensuales, asignaste el 100% a objetivos.'),
      ).toBeVisible()

      // Goal names in DOM order: pending goal first, then existing goals
      const names = screen
        .getAllByText(/Viaje al sur|Fondo de emergencia|Auto nuevo/)
        .map((node) => node.textContent)
      expect(names).toEqual(['Viaje al sur', 'Fondo de emergencia', 'Auto nuevo'])

      // Section subtitles
      expect(screen.getByText('Nuevo objetivo')).toBeVisible()
      expect(screen.getByText('Tus objetivos actuales')).toBeVisible()

      // Only one "Nuevo objetivo" rendered (section subtitle, no duplicate badge)
      expect(screen.getAllByText('Nuevo objetivo')).toHaveLength(1)

      // Derived amounts
      expect(screen.getByText('$ 60.000,00')).toBeVisible()
      expect(screen.getByText('$ 36.000,00')).toBeVisible()
      expect(screen.getByText('$ 24.000,00')).toBeVisible()

      // Input values formatted with Argentine comma decimal separator
      expect(screen.getByRole('textbox', { name: /porcentaje para fondo de emergencia/i })).toHaveValue('50,00')
      expect(screen.getByRole('textbox', { name: /porcentaje para auto nuevo/i })).toHaveValue('30,00')
      expect(screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })).toHaveValue('20,00')
    })

    it('renders only pending section subtitle when there are no existing goals', () => {
      const group = createMockGroup({
        entries: [
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '100.00',
            allocatedDestinationAmount: { amount: '120000.00', currency: 'ARS' },
            pending: true,
          },
        ],
      })

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Nuevo objetivo')).toBeVisible()
      expect(screen.queryByText('Tus objetivos actuales')).not.toBeInTheDocument()
      expect(screen.getByText('Viaje al sur')).toBeVisible()
    })

    it('renders only existing section subtitle when there is no pending goal', () => {
      const group = createMockGroup({
        entries: [
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            percentage: '100.00',
            allocatedDestinationAmount: { amount: '120000.00', currency: 'ARS' },
            pending: false,
          },
        ],
      })

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.queryByText('Nuevo objetivo')).not.toBeInTheDocument()
      expect(screen.getByText('Tus objetivos actuales')).toBeVisible()
      expect(screen.getByText('Fondo de emergencia')).toBeVisible()
    })

    it('explicitly rejects internal terminology from user-facing UI', () => {
      const group = createMockGroup()

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.queryByText(/canal/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/snapshot/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/asignaci[oó]n/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/allocation/i)).not.toBeInTheDocument()
    })

    it('renders invest method header correctly', () => {
      const group = createMockGroup({
        key: 'invest:USD',
        fundingMethod: 'invest',
        destinationCurrency: 'USD',
        monthlyCommitment: { amount: '200.00', currency: 'USD' },
      })

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Invertir en USD')).toBeVisible()
      expect(
        screen.getByText('De tus US$ 200,00 mensuales, asignaste el 100% a objetivos.'),
      ).toBeVisible()
    })

    it('renders group summary without commitment amount when monthlyCommitment is not defined', () => {
      const group = createMockGroup({
        monthlyCommitment: undefined,
      })

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Asignaste el 100% a objetivos.')).toBeVisible()
    })
  })

  describe('Step 2: Synchronization, validation and interaction', () => {
    it('synchronizes text input typing with onPercentageChange', async () => {
      const user = userEvent.setup()
      const onPercentageChange = vi.fn()
      const onPercentageCommit = vi.fn()

      function TestHarness() {
        const [groups, setGroups] = useState<GoalCreationAllocationGroup[]>([createMockGroup()])
        return (
          <PlanAllocationEditor
            groups={groups}
            onPercentageChange={(groupKey, goalId, percentage) => {
              onPercentageChange(groupKey, goalId, percentage)
              setGroups((prev) =>
                prev.map((g) =>
                  g.key === groupKey
                    ? {
                        ...g,
                        entries: g.entries.map((e) =>
                          e.goalId === goalId ? { ...e, percentage } : e,
                        ),
                      }
                    : g,
                ),
              )
            }}
            onPercentageCommit={onPercentageCommit}
          />
        )
      }

      render(<TestHarness />)

      const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
      await user.clear(input)
      await user.type(input, '25,50')

      expect(onPercentageChange).toHaveBeenLastCalledWith('save:ARS', 'pending-goal', '25,50')
    })

    it('calls onPercentageCommit on text input blur', async () => {
      const user = userEvent.setup()
      const onPercentageCommit = vi.fn()
      const group = createMockGroup()

      render(
        <PlanAllocationEditor
          groups={[group]}
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
      const group = createMockGroup()

      render(
        <PlanAllocationEditor
          groups={[group]}
          onPercentageChange={onPercentageChange}
          onPercentageCommit={onPercentageCommit}
        />,
      )

      const sliders = screen.getAllByRole('slider', { hidden: true })
      fireEvent.change(sliders[0], { target: { value: '30' } })

      expect(onPercentageChange).toHaveBeenLastCalledWith('save:ARS', 'pending-goal', '30.00')
    })

    it('displays "Falta asignar X%" and marks fields as invalid when total is less than 100%', () => {
      const group = createMockGroup({
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
          groups={[group]}
          onPercentageChange={vi.fn()}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Falta asignar 5,50%')).toBeVisible()
      expect(screen.getByRole('alert')).toHaveTextContent('Falta asignar 5,50%')

      const inputs = screen.getAllByRole('textbox')
      for (const input of inputs) {
        expect(input).toHaveAttribute('aria-invalid', 'true')
      }
    })

    it('displays "Te excediste X%" and marks fields as invalid when total exceeds 100%', () => {
      const group = createMockGroup({
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
          groups={[group]}
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
      const group = createMockGroup()

      render(
        <PlanAllocationEditor
          groups={[group]}
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

    it('renders multiple groups independently', () => {
      const saveGroup = createMockGroup()
      const investGroup = createMockGroup({
        key: 'invest:USD',
        fundingMethod: 'invest',
        destinationCurrency: 'USD',
        baseCurrency: 'ARS',
        monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
        entries: [
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '100.00',
            pending: true,
          },
        ],
      })

      const onPercentageChange = vi.fn()

      render(
        <PlanAllocationEditor
          groups={[saveGroup, investGroup]}
          onPercentageChange={onPercentageChange}
          onPercentageCommit={vi.fn()}
        />,
      )

      expect(screen.getByText('Ahorrar en ARS')).toBeVisible()
      expect(screen.getByText('Invertir en USD')).toBeVisible()

      const inputs = screen.getAllByRole('textbox', { name: /porcentaje para viaje al sur/i })
      expect(inputs).toHaveLength(2)

      fireEvent.change(inputs[1], { target: { value: '80' } })
      expect(onPercentageChange).toHaveBeenCalledWith('invest:USD', 'pending-goal', '80')
    })
  })
})
