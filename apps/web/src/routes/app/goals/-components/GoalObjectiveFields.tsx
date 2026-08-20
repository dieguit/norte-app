import { useStore } from "@tanstack/react-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../../../../components/ui/field";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { formatMoneyInput } from "../../../../lib/money";
import type { GoalCreationContext } from "../../../../features/goals/goal-creation";
import type { GoalCreationFormApi } from "./useGoalCreationForm";

export interface GoalObjectiveFieldsProps {
  form: GoalCreationFormApi;
  context: GoalCreationContext;
  validationErrors?: Record<string, string>;
}

const GOAL_TYPE_OPTIONS = [
  { value: "purchase", label: "Compra o gasto grande" },
  { value: "emergency_fund", label: "Colchón financiero" },
  { value: "retirement", label: "Jubilación" },
  { value: "other", label: "Otro objetivo" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "ARS", label: "Pesos (ARS)" },
  { value: "USD", label: "Dólares (USD)" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "high", label: "Prioridad alta" },
  { value: "medium", label: "Prioridad media" },
  { value: "low", label: "Prioridad baja" },
] as const;

export function GoalObjectiveFields({
  form,
  context,
  validationErrors = {},
}: GoalObjectiveFieldsProps) {
  const values = useStore(form.store, (state) => state.values);

  const handleTypeChange = (newType: string | null) => {
    if (!newType) return;
    const currentName = values.name;
    form.setFieldValue("type", newType as any);

    if (newType === "emergency_fund") {
      if (
        !currentName ||
        currentName.trim() === "" ||
        currentName === "Compra o gasto grande" ||
        currentName === "Otro objetivo"
      ) {
        form.setFieldValue("name", "Colchón financiero");
      }
      form.setFieldValue("currency", "USD");
    }
  };

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMoneyInput(e.target.value);
    form.setFieldValue("targetAmount", formatted);
  };

  const isEmergencyFund = values.type === "emergency_fund";

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
                {GOAL_TYPE_OPTIONS.find((opt) => opt.value === values.type)
                  ?.label ?? "Seleccionar tipo"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GOAL_TYPE_OPTIONS.map((option) => (
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
            onChange={(e) => form.setFieldValue("name", e.target.value)}
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
              {context.expensesKnowledge === "unknown"
                ? "Vamos a calcular el monto sugerido una vez que definas tus gastos mensuales."
                : "El colchón equivale a 6 meses de gastos y se calculará automáticamente."}
            </FieldDescription>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!validationErrors.currency}>
              <FieldLabel htmlFor="goal-currency-trigger">Moneda</FieldLabel>
              <Select
                value={values.currency}
                onValueChange={(val) =>
                  val && form.setFieldValue("currency", val as any)
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
                    )?.label ?? "Seleccionar moneda"}
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
          <Input
            id="goal-desired-month-input"
            aria-label="Mes objetivo"
            type="month"
            value={values.desiredMonth}
            onChange={(e) => form.setFieldValue("desiredMonth", e.target.value)}
          />
          <FieldDescription>
            Dejalo vacío si no tenés una fecha límite definida.
          </FieldDescription>
          {validationErrors.desiredMonth && (
            <FieldError>{validationErrors.desiredMonth}</FieldError>
          )}
        </Field>

        {/* Priority */}
        <Field data-invalid={!!validationErrors.priority}>
          <FieldLabel htmlFor="goal-priority-trigger">Prioridad</FieldLabel>
          <Select
            value={values.priority}
            onValueChange={(val) =>
              val && form.setFieldValue("priority", val as any)
            }
          >
            <SelectTrigger
              id="goal-priority-trigger"
              aria-label="Prioridad"
              className="w-full"
            >
              <SelectValue>
                {PRIORITY_OPTIONS.find((opt) => opt.value === values.priority)
                  ?.label ?? "Seleccionar prioridad"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.priority && (
            <FieldError>{validationErrors.priority}</FieldError>
          )}
        </Field>
      </FieldSet>
    </FieldGroup>
  );
}
