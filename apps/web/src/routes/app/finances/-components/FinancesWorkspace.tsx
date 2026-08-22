import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { MonthPickerInput } from '../../../../components/MonthPicker'
import { Button } from '../../../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { formatCalendarMonth } from '../../../../lib/format'
import { getIncomeTotalArs, isIncomeIncludedInMonth, FIXED_INCOME_SOURCES } from '../../../../features/financial/incomes'
import type { IncomesWorkspace } from '../../../../features/financial/incomes'
import { IncomeSheet } from './IncomeSheet'

function formatIncomeMoney(amount: string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatArs(amount: string) {
  return Number(amount).toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function FinancesWorkspace({
  workspace,
  initialMonth = new Date().toISOString().slice(0, 7),
}: {
  workspace: IncomesWorkspace
  initialMonth?: string
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)
  const displayedIncomes = workspace.incomes.filter((income) =>
    isIncomeIncludedInMonth(income, selectedMonth),
  )
  const total = getIncomeTotalArs(
    workspace.incomes.map((income) => ({
      amount: { amount: income.amount, currency: income.currency as 'ARS' | 'USD' },
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth,
    })),
    selectedMonth,
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl font-bold tracking-tight whitespace-nowrap text-[var(--sea-ink)] sm:text-4xl">
          Tus Finanzas
        </h1>
        <MonthPickerInput className="w-full sm:w-auto" aria-label="Mes de finanzas" value={selectedMonth} onValueChange={setSelectedMonth} />
      </header>

      <Tabs defaultValue="incomes">
        <TabsList>
          <TabsTrigger value="incomes">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
        </TabsList>
        <TabsContent value="incomes">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
                  Ingresos de {formatCalendarMonth(selectedMonth)}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--sea-ink-soft)]">
                  Registrá lo que entra cada mes para mantener tu panorama financiero actualizado.
                </p>
              </div>
              <Button className="sm:ml-auto" type="button" onClick={() => setIsCreateOpen(true)}>Agregar nuevo</Button>
            </div>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-medium text-[var(--sea-ink-soft)]">Total estimado</p>
              <p className="mt-2 font-serif text-4xl font-bold tracking-tight text-[var(--sea-ink)]">
                ARS {formatArs(total.amount)}
              </p>
            </section>

            <section aria-label="Ingresos registrados" className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]">
              {displayedIncomes.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">
                  No tenés ingresos para este mes.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {displayedIncomes.map((income) => {
                    const label = income.sourceKind === 'custom'
                      ? income.sourceName
                      : FIXED_INCOME_SOURCES[income.sourceKind as keyof typeof FIXED_INCOME_SOURCES]
                    return (
                      <li key={income.id} className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[var(--sea-ink)]">{label}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Editar ingreso ${label}`}
                              onClick={() => setEditingIncomeId(income.id)}
                            >
                              <Pencil data-icon="inline-start" aria-hidden="true" />
                              Editar ingreso
                            </Button>
                          </div>
                          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                            {income.recurring
                              ? `Todos los meses desde ${formatCalendarMonth(income.effectiveMonth.slice(0, 7))}`
                              : formatCalendarMonth(income.effectiveMonth.slice(0, 7))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-[var(--sea-ink)]">
                            {formatIncomeMoney(income.amount, income.currency)}
                          </p>
                          {income.currency === 'USD' && (
                            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                              Equivale a ARS {formatArs(getIncomeTotalArs([{ amount: { amount: income.amount, currency: 'USD' }, recurring: true, effectiveMonth: selectedMonth }], selectedMonth).amount)}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
            <IncomeSheet
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              month={selectedMonth}
              sources={workspace.sources}
            />
            <IncomeSheet
              open={editingIncomeId !== null}
              onOpenChange={(open) => { if (!open) setEditingIncomeId(null) }}
              month={selectedMonth}
              sources={workspace.sources}
              income={workspace.incomes.find((income) => income.id === editingIncomeId)}
            />
          </div>
        </TabsContent>
        <TabsContent value="expenses" />
      </Tabs>
    </div>
  )
}
