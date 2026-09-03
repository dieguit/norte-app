import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import { MonthPickerInput } from '../../../../components/MonthPicker'
import { formatMoneyInput } from '../../../../lib/money'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'
import type { GoalCreationFormApi } from './useGoalCreationForm'

type GoalValues = GoalCreationFormApi['state']['values']
type FieldProps = {
  form: GoalCreationFormApi
  values: GoalValues
  validationErrors: Record<string, string>
  immutableIdentity: boolean
}

const GOAL_TYPES = [
  { value: 'purchase', label: 'Compra o gasto grande' },
  { value: 'emergency_fund', label: 'Colchón financiero' },
  { value: 'retirement', label: 'Jubilación' },
  { value: 'other', label: 'Otro objetivo' },
] as const

const CURRENCIES = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
] as const

const AVAILABILITIES = [
  { value: 'available_now', label: 'Disponible en cualquier momento' },
  { value: 'available_from', label: 'Disponible a partir de una fecha' },
  { value: 'long_term', label: 'Largo plazo / Al vencimiento' },
] as const

export function GoalTypeField({ form, values, validationErrors, immutableIdentity, hasEmergencyFund }: FieldProps & { hasEmergencyFund: boolean }) {
  const options = hasEmergencyFund ? GOAL_TYPES.filter((option) => option.value !== 'emergency_fund') : GOAL_TYPES
  const errorId = 'goal-type-error'
  return (
    <Field data-invalid={!!validationErrors.type}>
      <FieldLabel htmlFor="goal-type-trigger">Tipo de objetivo</FieldLabel>
      <Select
        value={values.type}
        disabled={immutableIdentity}
        onValueChange={(value) => {
          if (!value) return
          const wasEmergencyFund = values.type === 'emergency_fund'
          form.setFieldValue('type', value as never)
          if (wasEmergencyFund && value !== 'emergency_fund') form.setFieldValue('name', '')
          if (value === 'emergency_fund') {
            form.setFieldValue('name', 'Colchón financiero')
            form.setFieldValue('currency', 'USD')
          }
        }}
      >
        <SelectTrigger
          id="goal-type-trigger"
          aria-label="Tipo de objetivo"
          className="w-full"
          disabled={immutableIdentity}
          aria-invalid={Boolean(validationErrors.type)}
          aria-describedby={validationErrors.type ? errorId : undefined}
        >
          <SelectValue>{options.find((option) => option.value === values.type)?.label ?? 'Seleccionar tipo'}</SelectValue>
        </SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
      {validationErrors.type && <FieldError id={errorId}>{validationErrors.type}</FieldError>}
    </Field>
  )
}

export function GoalNameField({ values, validationErrors, form }: FieldProps) {
  const errorId = 'goal-name-error'
  return (
    <Field data-invalid={!!validationErrors.name}>
      <FieldLabel htmlFor="goal-name-input">Nombre del objetivo</FieldLabel>
      <Input
        id="goal-name-input"
        aria-label="Nombre del objetivo"
        placeholder="Ej: Vacaciones 2027, Auto nuevo..."
        value={values.name}
        onChange={(event) => form.setFieldValue('name', event.target.value)}
        aria-invalid={Boolean(validationErrors.name)}
        aria-describedby={validationErrors.name ? errorId : undefined}
      />
      {validationErrors.name && <FieldError id={errorId}>{validationErrors.name}</FieldError>}
    </Field>
  )
}

function EmergencyFundFields({ validationErrors, context }: { validationErrors: Record<string, string>; context: GoalCreationContext }) {
  const errorId = 'goal-currency-error'
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4">
      <Field data-invalid={!!validationErrors.currency}>
        <FieldLabel htmlFor="currency-display">Moneda</FieldLabel>
        <div id="currency-display" className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm text-[var(--sea-ink)]">Dólares (USD)</div>
        <FieldDescription>El colchón financiero se planifica en USD.</FieldDescription>
        {validationErrors.currency && <FieldError id={errorId}>{validationErrors.currency}</FieldError>}
      </Field>
      <FieldDescription className="text-sm text-[var(--sea-ink-soft)]">
        {context.expensesKnowledge === 'unknown' ? 'Vamos a calcular el monto sugerido una vez que definas tus gastos mensuales.' : 'El colchón equivale a 3 meses de gastos y se calculará automáticamente.'}
      </FieldDescription>
    </div>
  )
}

export function GoalMoneyFields({ form, values, validationErrors, immutableIdentity, context }: FieldProps & { context: GoalCreationContext }) {
  if (values.type === 'emergency_fund') return <EmergencyFundFields validationErrors={validationErrors} context={context} />
  const currencyErrorId = 'goal-currency-error'
  const targetAmountErrorId = 'goal-targetAmount-error'
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field data-invalid={!!validationErrors.currency}>
        <FieldLabel htmlFor="goal-currency-trigger">Moneda</FieldLabel>
        <Select value={values.currency} disabled={immutableIdentity} onValueChange={(value) => value && form.setFieldValue('currency', value as never)}>
          <SelectTrigger
            id="goal-currency-trigger"
            aria-label="Moneda"
            className="w-full"
            disabled={immutableIdentity}
            aria-invalid={Boolean(validationErrors.currency)}
            aria-describedby={validationErrors.currency ? currencyErrorId : undefined}
          >
            <SelectValue>{CURRENCIES.find((option) => option.value === values.currency)?.label ?? 'Seleccionar moneda'}</SelectValue>
          </SelectTrigger>
          <SelectContent>{CURRENCIES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        {validationErrors.currency && <FieldError id={currencyErrorId}>{validationErrors.currency}</FieldError>}
      </Field>
      <Field data-invalid={!!validationErrors.targetAmount}>
        <FieldLabel htmlFor="goal-target-amount-input">Monto objetivo</FieldLabel>
        <Input
          id="goal-target-amount-input"
          aria-label="Monto objetivo"
          inputMode="decimal"
          placeholder="0"
          value={values.targetAmount}
          onChange={(event) => form.setFieldValue('targetAmount', formatMoneyInput(event.target.value))}
          aria-invalid={Boolean(validationErrors.targetAmount)}
          aria-describedby={validationErrors.targetAmount ? targetAmountErrorId : undefined}
        />
        {validationErrors.targetAmount && <FieldError id={targetAmountErrorId}>{validationErrors.targetAmount}</FieldError>}
      </Field>
    </div>
  )
}

function AnnualReturnField({ form, values, validationErrors }: FieldProps) {
  const errorId = 'goal-annualReturnRate-error'
  return (
    <Field data-invalid={!!validationErrors.annualReturnRate}>
      <FieldLabel htmlFor="annual-return-rate-input">Rendimiento anual estimado (%)</FieldLabel>
      <Input
        id="annual-return-rate-input"
        aria-label="Rendimiento anual estimado (%)"
        inputMode="decimal"
        value={values.annualReturnRate}
        onChange={(event) => form.setFieldValue('annualReturnRate', event.target.value)}
        className="w-full sm:w-40"
        aria-invalid={Boolean(validationErrors.annualReturnRate)}
        aria-describedby={validationErrors.annualReturnRate ? errorId : undefined}
      />
      <FieldDescription>Tasa anual esperada para proyectar el crecimiento.</FieldDescription>
      {validationErrors.annualReturnRate && <FieldError id={errorId}>{validationErrors.annualReturnRate}</FieldError>}
    </Field>
  )
}

function AvailabilityField({ form, values, validationErrors }: FieldProps) {
  const errorId = 'goal-availability-error'
  return (
    <Field data-invalid={!!validationErrors.availability}>
      <FieldLabel htmlFor="availability-select-trigger">Disponibilidad de los fondos</FieldLabel>
      <Select value={values.availability} onValueChange={(value) => value && form.setFieldValue('availability', value as never)}>
        <SelectTrigger
          id="availability-select-trigger"
          aria-label="Disponibilidad de los fondos"
          className="w-full"
          aria-invalid={Boolean(validationErrors.availability)}
          aria-describedby={validationErrors.availability ? errorId : undefined}
        >
          <SelectValue>{AVAILABILITIES.find((option) => option.value === values.availability)?.label ?? 'Seleccionar disponibilidad'}</SelectValue>
        </SelectTrigger>
        <SelectContent>{AVAILABILITIES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
      {validationErrors.availability && <FieldError id={errorId}>{validationErrors.availability}</FieldError>}
    </Field>
  )
}

function AvailableFromField({ form, values, validationErrors, context }: FieldProps & { context: GoalCreationContext }) {
  if (values.availability !== 'available_from') return null
  const errorId = 'goal-availableFromMonth-error'
  return (
    <Field data-invalid={!!validationErrors.availableFromMonth}>
      <FieldLabel htmlFor="available-from-month-input">Mes a partir del cual estará disponible</FieldLabel>
      <MonthPickerInput
        id="available-from-month-input"
        aria-label="Mes a partir del cual estará disponible"
        value={values.availableFromMonth}
        minMonth={context.currentMonth}
        onValueChange={(month) => form.setFieldValue('availableFromMonth', month)}
        aria-invalid={Boolean(validationErrors.availableFromMonth)}
        aria-describedby={validationErrors.availableFromMonth ? errorId : undefined}
      />
      {validationErrors.availableFromMonth && <FieldError id={errorId}>{validationErrors.availableFromMonth}</FieldError>}
    </Field>
  )
}

function InvestmentAssumptions({ form, values, validationErrors, context }: FieldProps & { context: GoalCreationContext }) {
  if (values.strategy !== 'invest') return null
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5">
      <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Supuestos de inversión</h4>
      <AnnualReturnField form={form} values={values} validationErrors={validationErrors} immutableIdentity={false} />
      <AvailabilityField form={form} values={values} validationErrors={validationErrors} immutableIdentity={false} />
      <AvailableFromField form={form} values={values} validationErrors={validationErrors} immutableIdentity={false} context={context} />
    </div>
  )
}

export function StrategyFields({ form, values, validationErrors, immutableIdentity, context }: FieldProps & { context: GoalCreationContext }) {
  const errorId = 'goal-strategy-error'
  return (
    <>
      <Field data-invalid={!!validationErrors.strategy}>
        <FieldLabel>Estrategia</FieldLabel>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--sea-ink)]">
            <input
              type="radio"
              name="strategy"
              value="save"
              aria-label="Ahorrar"
              checked={values.strategy === 'save'}
              onChange={() => form.setFieldValue('strategy', 'save')}
              disabled={immutableIdentity}
              aria-invalid={Boolean(validationErrors.strategy)}
              aria-describedby={validationErrors.strategy ? errorId : undefined}
              className="size-4 text-[var(--palm)] focus:ring-[var(--palm)]"
            />
            <span>Ahorrar</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--sea-ink)]">
            <input
              type="radio"
              name="strategy"
              value="invest"
              aria-label="Invertir"
              checked={values.strategy === 'invest'}
              onChange={() => form.setFieldValue('strategy', 'invest')}
              disabled={immutableIdentity}
              aria-invalid={Boolean(validationErrors.strategy)}
              aria-describedby={validationErrors.strategy ? errorId : undefined}
              className="size-4 text-[var(--palm)] focus:ring-[var(--palm)]"
            />
            <span>Invertir</span>
          </label>
        </div>
        {validationErrors.strategy && <FieldError id={errorId}>{validationErrors.strategy}</FieldError>}
      </Field>
      <InvestmentAssumptions form={form} values={values} validationErrors={validationErrors} immutableIdentity={immutableIdentity} context={context} />
    </>
  )
}
