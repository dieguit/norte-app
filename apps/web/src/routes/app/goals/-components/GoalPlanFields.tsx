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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { formatMoney } from '../../../../lib/format'
import { formatMoneyInput } from '../../../../lib/money'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'
import type { GoalCreationFormApi } from './useGoalCreationForm'

export interface GoalPlanFieldsProps {
  form: GoalCreationFormApi
  context: GoalCreationContext
  validationErrors?: Record<string, string>
}

const AVAILABILITY_OPTIONS = [
  { value: 'available_now', label: 'Disponible en cualquier momento' },
  { value: 'available_from', label: 'Disponible a partir de una fecha' },
  { value: 'long_term', label: 'Largo plazo / Al vencimiento' },
] as const

export function GoalPlanFields({
  form,
  context,
  validationErrors = {},
}: GoalPlanFieldsProps) {
  const values = useStore(form.store, (state) => state.values)

  const existingSaveOption = context.fundingOptions.find(
    (opt) => opt.fundingMethod === 'save' && opt.destinationCurrency === values.currency,
  )

  const existingInvestOption = context.fundingOptions.find(
    (opt) => opt.fundingMethod === 'invest' && opt.destinationCurrency === values.currency,
  )

  const hasEstablishedSave = !!existingSaveOption?.monthlyCommitment
  const hasEstablishedInvest = !!existingInvestOption?.monthlyCommitment

  return (
    <FieldSet className="flex flex-col gap-6">
      {/* Methods Choice */}
      <FieldGroup className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-[var(--sea-ink)]">¿Cómo vas a fondear este objetivo?</h3>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Podés ahorrar, invertir o combinar ambos métodos.
          </p>
          {validationErrors.saveEnabled && (
            <FieldError>{validationErrors.saveEnabled}</FieldError>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--sea-ink)]">
            <input
              type="checkbox"
              name="saveEnabled"
              aria-label="Ahorrar"
              checked={values.saveEnabled}
              onChange={(e) => form.setFieldValue('saveEnabled', e.target.checked)}
              className="size-4 rounded border-[var(--line)] text-[var(--pine)] focus:ring-[var(--pine)]"
            />
            <span>Ahorrar</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--sea-ink)]">
            <input
              type="checkbox"
              name="investEnabled"
              aria-label="Invertir"
              checked={values.investEnabled}
              onChange={(e) => form.setFieldValue('investEnabled', e.target.checked)}
              className="size-4 rounded border-[var(--line)] text-[var(--pine)] focus:ring-[var(--pine)]"
            />
            <span>Invertir</span>
          </label>
        </div>
      </FieldGroup>

      {/* Save Method Details */}
      {values.saveEnabled && (
        <section
          aria-label="Detalles de ahorro"
          className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Ahorrar en {values.currency}</h4>
            {hasEstablishedSave && existingSaveOption.monthlyCommitment ? (
              <p className="text-sm text-[var(--sea-ink)]">
                Aporte mensual actual:{' '}
                <span className="font-semibold text-[var(--pine)]">
                  {formatMoney(existingSaveOption.monthlyCommitment)}
                </span>{' '}
                <span className="text-xs text-[var(--sea-ink-soft)]">(establecido en tu Plan)</span>
              </p>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--sea-ink)]">
                  <input
                    type="checkbox"
                    aria-label="Definir aporte mensual para ahorrar"
                    checked={values.defineSaveCommitment}
                    onChange={(e) => form.setFieldValue('defineSaveCommitment', e.target.checked)}
                    className="size-4 rounded border-[var(--line)] text-[var(--pine)] focus:ring-[var(--pine)]"
                  />
                  <span>Definir aporte mensual</span>
                </label>

                {values.defineSaveCommitment && (
                  <Field data-invalid={!!validationErrors.saveMonthlyCommitment}>
                    <FieldLabel htmlFor="save-monthly-commitment-input">
                      Aporte mensual para ahorrar
                    </FieldLabel>
                    <Input
                      id="save-monthly-commitment-input"
                      aria-label="Aporte mensual para ahorrar"
                      inputMode="decimal"
                      placeholder="0"
                      value={values.saveMonthlyCommitment}
                      onChange={(e) =>
                        form.setFieldValue('saveMonthlyCommitment', formatMoneyInput(e.target.value))
                      }
                      className="w-full sm:w-60"
                    />
                    {validationErrors.saveMonthlyCommitment && (
                      <FieldError>{validationErrors.saveMonthlyCommitment}</FieldError>
                    )}
                  </Field>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Invest Method Details */}
      {values.investEnabled && (
        <section
          aria-label="Detalles de inversión"
          className="flex flex-col gap-5 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-[var(--sea-ink)]">Invertir en {values.currency}</h4>
            {hasEstablishedInvest && existingInvestOption.monthlyCommitment ? (
              <p className="text-sm text-[var(--sea-ink)]">
                Aporte mensual actual:{' '}
                <span className="font-semibold text-[var(--pine)]">
                  {formatMoney(existingInvestOption.monthlyCommitment)}
                </span>{' '}
                <span className="text-xs text-[var(--sea-ink-soft)]">(establecido en tu Plan)</span>
              </p>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[var(--sea-ink)]">
                  <input
                    type="checkbox"
                    aria-label="Definir aporte mensual para invertir"
                    checked={values.defineInvestCommitment}
                    onChange={(e) => form.setFieldValue('defineInvestCommitment', e.target.checked)}
                    className="size-4 rounded border-[var(--line)] text-[var(--pine)] focus:ring-[var(--pine)]"
                  />
                  <span>Definir aporte mensual</span>
                </label>

                {values.defineInvestCommitment && (
                  <Field data-invalid={!!validationErrors.investMonthlyCommitment}>
                    <FieldLabel htmlFor="invest-monthly-commitment-input">
                      Aporte mensual para invertir
                    </FieldLabel>
                    <Input
                      id="invest-monthly-commitment-input"
                      aria-label="Aporte mensual para invertir"
                      inputMode="decimal"
                      placeholder="0"
                      value={values.investMonthlyCommitment}
                      onChange={(e) =>
                        form.setFieldValue('investMonthlyCommitment', formatMoneyInput(e.target.value))
                      }
                      className="w-full sm:w-60"
                    />
                    {validationErrors.investMonthlyCommitment && (
                      <FieldError>{validationErrors.investMonthlyCommitment}</FieldError>
                    )}
                  </Field>
                )}
              </div>
            )}
          </div>

          {/* Investment Assumptions */}
          <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-4">
            <h5 className="text-sm font-semibold text-[var(--sea-ink)]">Supuestos de inversión</h5>

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
                <Input
                  id="available-from-month-input"
                  aria-label="Mes a partir del cual estará disponible"
                  type="month"
                  value={values.availableFromMonth}
                  onChange={(e) => form.setFieldValue('availableFromMonth', e.target.value)}
                  className="w-full sm:w-60"
                />
                {validationErrors.availableFromMonth && (
                  <FieldError>{validationErrors.availableFromMonth}</FieldError>
                )}
              </Field>
            )}
          </div>
        </section>
      )}
    </FieldSet>
  )
}
