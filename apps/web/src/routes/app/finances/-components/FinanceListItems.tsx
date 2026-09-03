import { Pencil } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { formatCalendarMonth, formatMoney } from '../../../../lib/format'
import { createMoney } from '../../../../lib/money'
import {
  getExpenseTotalArs,
  FIXED_EXPENSE_SOURCES,
  type ExpensesWorkspace,
} from '../../../../features/financial/expenses'
import {
  getIncomeTotalArs,
  FIXED_INCOME_SOURCES,
  type IncomesWorkspace,
} from '../../../../features/financial/incomes'

type Income = IncomesWorkspace['incomes'][number]
type Expense = ExpensesWorkspace['expenses'][number]

type FinanceItemProps<TItem> = {
  item: TItem
  selectedMonth: string
  onEdit: (id: string) => void
}

function ItemDetails({
  label,
  categoryLabel,
  monthLabel,
  onEdit,
  editLabel,
  editAction,
}: {
  label: string
  categoryLabel: string
  monthLabel: string
  onEdit: () => void
  editLabel: string
  editAction: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="break-words [overflow-wrap:anywhere] font-semibold text-[var(--sea-ink)]">{label}</p>
        <Button type="button" variant="ghost" size="sm" aria-label={editLabel} onClick={onEdit}>
          <Pencil data-icon="inline-start" aria-hidden="true" />
          {editAction}
        </Button>
      </div>
      {label !== categoryLabel && <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{categoryLabel}</p>}
      <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{monthLabel}</p>
    </div>
  )
}

function ItemAmount({ amount, currency, equivalent }: { amount: string; currency: 'ARS' | 'USD'; equivalent: string | null }) {
  return (
    <div className="text-right">
      <p className="font-semibold tabular-nums text-[var(--sea-ink)]">{formatMoney(createMoney(amount, currency))}</p>
      {equivalent && <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">Equivale a ARS {equivalent}</p>}
    </div>
  )
}

export function IncomeItem({ item: income, selectedMonth, onEdit }: FinanceItemProps<Income>) {
  const categoryLabel = income.sourceKind === 'custom' ? income.sourceName : FIXED_INCOME_SOURCES[income.sourceKind as keyof typeof FIXED_INCOME_SOURCES]
  const label = income.concept ?? categoryLabel
  const monthLabel = income.recurring ? `Todos los meses desde ${formatCalendarMonth(income.effectiveMonth.slice(0, 7))}` : formatCalendarMonth(income.effectiveMonth.slice(0, 7))
  const equivalent = income.currency === 'USD' ? Number(getIncomeTotalArs([{ amount: { amount: income.amount, currency: 'USD' }, recurring: true, effectiveMonth: selectedMonth }], selectedMonth).amount).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : null

  return <li className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center"><ItemDetails label={label} categoryLabel={categoryLabel} monthLabel={monthLabel} onEdit={() => onEdit(income.id)} editLabel={`Editar ingreso ${label}`} editAction="Editar ingreso" /><ItemAmount amount={income.amount} currency={income.currency} equivalent={equivalent} /></li>
}

export function ExpenseItem({ item: expense, selectedMonth, onEdit }: FinanceItemProps<Expense>) {
  const categoryLabel = expense.sourceKind === 'custom' ? expense.sourceName : FIXED_EXPENSE_SOURCES[expense.sourceKind as keyof typeof FIXED_EXPENSE_SOURCES]
  const label = expense.concept ?? categoryLabel
  const month = formatCalendarMonth(expense.effectiveMonth.slice(0, 7))
  const monthLabel = expense.recurring ? `Todos los meses desde ${month}` : month
  const equivalent = expense.currency === 'USD' ? Number(getExpenseTotalArs([{ amount: { amount: expense.amount, currency: 'USD' }, recurring: expense.recurring, effectiveMonth: selectedMonth, endMonth: expense.endMonth }], selectedMonth).amount).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : null

  return <li className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center"><ItemDetails label={label} categoryLabel={categoryLabel} monthLabel={monthLabel} onEdit={() => onEdit(expense.id)} editLabel={`Editar gasto ${label}`} editAction="Editar gasto" /><ItemAmount amount={expense.amount} currency={expense.currency} equivalent={equivalent} /></li>
}
