import { useStore } from '@tanstack/react-form'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import { MonthPickerInput } from '../../../../components/MonthPicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { formatMoneyInput } from '../../../../lib/money'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'
import type { GoalCreationFormApi } from './useGoalCreationForm'

export interface GoalObjectiveFieldsProps {
  form: GoalCreationFormApi
  context: GoalCreationContext
  validationErrors?: Record<string, string>
}

const GOAL_TYPE_OPTIONS = [
  { value: 'purchase', label: 'Compra o gasto grande' },
  { value: 'emergency_fund', label: 'Colchón financiero' },
  { value: 'retirement', label: 'Jubilación' },
  { value: 'other', label: 'Otro objetivo' },
] as const

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
] as const

const AVAILABILITY_OPTIONS = [
  { value: 'available_now', label: 'Disponible en cualquier momento' },
  { value: 'available_from', label: 'Disponible a partir de una fecha' },
  { value: 'long_term', label: 'Largo plazo / Al vencimiento' },
] as const

export function GoalObjectiveFields({
  form,
  context,
  validationErrors = {},
}: GoalObjectiveFieldsProps) {
  const values = useStore(form.store, (state) => state.values)

  const goalTypeOptions = context.hasEmergencyFund
    ? GOAL_TYPE_OPTIONS.filter((option) => option.value !== 'emergency_fund')
    : GOAL_TYPE_OPTIONS

  const handleTypeChange = (newType: string | null) => {
    if (!newType) return
    const currentName = values.name
    const wasEmergencyFund = values.type === 'emergency_fund'
    form.setFieldValue('type', newType as any)

    if (wasEmergencyFund && newType !== 'emergency_fund') {
      form.setFieldValue('name', '')
    }

    if (newType === 'emergency_fund') {
      if (
        !currentName ||
        currentName.trim() === '' ||
        currentName === 'Compra o gasto grande' ||
        currentName === 'Otro objetivo'
      ) {
        form.setFieldValue('name', 'Colchón financiero')
      }
      form.setFieldValue('currency', 'USD')
    }
  }

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMoneyInput(e.target.value)
    form.setFieldValue('targetAmount', formatted)
  }

  const isEmergencyFund = values.type === 'emergency_fund'

  return (
    <FieldGroup className="flex flex-col gap-4">
      <FieldSet className="flex flex-col gap-5">
        {/* Goal Type */}
        <Field data-invalid={!!validationErrors.type}>
          <FieldLabel htmlFor="goal-type-trigger">Tipo de objetivo</FieldLabel>
          <Select value={values.type} onValueChange={handleTypeChange}>
            <SelectTrigger
              id="goal-type-trigger"
              aria-label="Tipo de objetivo"
              className="w-full"
            >
              <SelectValue>
                {goalTypeOptions.find((opt) => opt.value === values.type)?.label ?? 'Seleccionar tipo'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {goalTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.type && (
            <FieldError>{validationErrors.type}</FieldError>
          )}
        </Field>

        {/* Goal Name */}
        <Field data-invalid={!!validationErrors.name}>
          <FieldLabel htmlFor="goal-name-input">Nombre del objetivo</FieldLabel>
          <Input
            id="goal-name-input"
            aria-label="Nombre del objetivo"
            placeholder="Ej: Vacaciones 2027, Auto nuevo..."
            value={values.name}
            onChange={(e) => form.setFieldValue('name', e.target.value)}
          />
          {validationErrors.name && (
            <FieldError>{validationErrors.name}</FieldError>
          )}
        </Field>

        {/* Currency and Target Amount */}
        {isEmergencyFund ? (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4">
            <Field data-invalid={!!validationErrors.currency}>
              <FieldLabel htmlFor="currency-display">Moneda</FieldLabel>
              <div
                id="currency-display"
                className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm text-[var(--sea-ink)]"
              >
                Dólares (USD)
              </div>
              <FieldDescription>
                El colchón financiero se planifica en USD.
              </FieldDescription>
              {validationErrors.currency && (
                <FieldError>{validationErrors.currency}</FieldError>
              )}
            </Field>

            <FieldDescription className="text-sm text-[var(--sea-ink-soft)]">
              {context.expensesKnowledge === 'unknown'
                ? 'Vamos a calcular el monto sugerido una vez que definas tus gastos mensuales.'
                : 'El colchón equivale a 6 meses de gastos y se calculará automáticamente.'}
            </FieldDescription>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!validationErrors.currency}>
              <FieldLabel htmlFor="goal-currency-trigger">Moneda</FieldLabel>
              <Select
                value={values.currency}
                onValueChange={(val) =>
                  val && form.setFieldValue('currency', val as any)
                }
              >
                <SelectTrigger
                  id="goal-currency-trigger"
                  aria-label="Moneda"
                  className="w-full"
                >
                  <SelectValue>
                    {CURRENCY_OPTIONS.find(
                      (opt) => opt.value === values.currency,
                    )?.label ?? 'Seleccionar moneda'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.currency && (
                <FieldError>{validationErrors.currency}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!validationErrors.targetAmount}>
              <FieldLabel htmlFor="goal-target-amount-input">
                Monto objetivo
              </FieldLabel>
              <Input
                id="goal-target-amount-input"
                aria-label="Monto objetivo"
                inputMode="decimal"
                placeholder="0"
                value={values.targetAmount}
                onChange={handleTargetAmountChange}
              />
              {validationErrors.targetAmount && (
                <FieldError>{validationErrors.targetAmount}</FieldError>
              )}
            </Field>
          </div>
        )}

        {/* Desired Month */}
        <Field data-invalid={!!validationErrors.desiredMonth}>
          <FieldLabel htmlFor="goal-desired-month-input">
            Mes objetivo (opcional)
          </FieldLabel>
          <MonthPickerInput
            id="goal-desired-month-input"
            aria-label="Mes objetivo"
            value={values.desiredMonth}
            minMonth={context.currentMonth}
            onValueChange={(month) => form.setFieldValue('desiredMonth', month)}
          />
          <FieldDescription>
            Dejalo vacío si no tenés una fecha límite definida.
          </FieldDescription>
          {validationErrors.desiredMonth && (
            <FieldError>{validationErrors.desiredMonth}</FieldError>
          )}
        </Field>


        {/* Strategy Radio Group */}
        <Field data-invalid={!!validationErrors.strategy}>
          <FieldLabel>Estrategia</FieldLabel>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--sea-ink)]">
              <input
                type="radio"
                name="strategy"
                value="save"
                aria-label="Ahorrar"
                checked={values.strategy === 'save'}
                onChange={() => form.setFieldValue('strategy', 'save')}
                className="size-4 text-[var(--palm)] focus:ring-[var(--palm)]"
              />
              <span>Ahorrar</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--sea-ink)]">
              <input
                type="radio"
                name="strategy"
                value="invest"
                aria-label="Invertir"
                checked={values.strategy === 'invest'}
                onChange={() => form.setFieldValue('strategy', 'invest')}
                className="size-4 text-[var(--palm)] focus:ring-[var(--palm)]"
              />
              <span>Invertir</span>
            </label>
          </div>
          {validationErrors.strategy && (
            <FieldError>{validationErrors.strategy}</FieldError>
          )}
        </Field>

        {/* Investment Assumptions (only when strategy === 'invest') */}
        {values.strategy === 'invest' && (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5">
            <h4 className="text-sm font-semibold text-[var(--sea-ink)]">
              Supuestos de inversión
            </h4>

            <Field data-invalid={!!validationErrors.annualReturnRate}>
              <FieldLabel htmlFor="annual-return-rate-input">
                Rendimiento anual estimado (%)
              </FieldLabel>
              <Input
                id="annual-return-rate-input"
                aria-label="Rendimiento anual estimado (%)"
                inputMode="decimal"
                value={values.annualReturnRate}
                onChange={(e) => form.setFieldValue('annualReturnRate', e.target.value)}
                className="w-full sm:w-40"
              />
              <FieldDescription>Tasa anual esperada para proyectar el crecimiento.</FieldDescription>
              {validationErrors.annualReturnRate && (
                <FieldError>{validationErrors.annualReturnRate}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!validationErrors.availability}>
              <FieldLabel htmlFor="availability-select-trigger">
                Disponibilidad de los fondos
              </FieldLabel>
              <Select
                value={values.availability}
                onValueChange={(val) => val && form.setFieldValue('availability', val as any)}
              >
                <SelectTrigger
                  id="availability-select-trigger"
                  aria-label="Disponibilidad de los fondos"
                  className="w-full"
                >
                  <SelectValue>
                    {AVAILABILITY_OPTIONS.find((opt) => opt.value === values.availability)?.label ??
                      'Seleccionar disponibilidad'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.availability && (
                <FieldError>{validationErrors.availability}</FieldError>
              )}
            </Field>

            {values.availability === 'available_from' && (
              <Field data-invalid={!!validationErrors.availableFromMonth}>
                <FieldLabel htmlFor="available-from-month-input">
                  Mes a partir del cual estará disponible
                </FieldLabel>
                <MonthPickerInput
                  id="available-from-month-input"
                  aria-label="Mes a partir del cual estará disponible"
                  value={values.availableFromMonth}
                  minMonth={context.currentMonth}
                  onValueChange={(month) => form.setFieldValue('availableFromMonth', month)}
                />
                {validationErrors.availableFromMonth && (
                  <FieldError>{validationErrors.availableFromMonth}</FieldError>
                )}
              </Field>
            )}
          </div>
        )}
      </FieldSet>
    </FieldGroup>
  )
}
