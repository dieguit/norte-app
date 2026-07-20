import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  getMonthlyDateOptions,
  type OnboardingField,
  type ExtraIncome,
} from "../onboarding/definition";

type Props = {
  field: OnboardingField;
  value: ExtraIncome[];
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (items: ExtraIncome[]) => void;
};

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

function formatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? numberFormatter.format(value)
    : String(value ?? "");
}

function parseNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits === "") return "";
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : "";
}

export function OnboardingRepeatedItems({
  field,
  value,
  errors,
  disabled,
  onChange,
}: Props) {
  const maxItems = field.maxItems ?? 10;
  const items = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    if (items.length >= maxItems) return;
    const newItem: ExtraIncome = {
      concepto: "",
      monto: "",
      desde: "",
      hasta: "",
    };
    onChange([...items, newItem]);
  };

  const visibleItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => field.itemVisibleWhen?.(item) !== false);

  const handleRemove = (indexToRemove: number) => {
    onChange(items.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFieldChange = (
    index: number,
    key: keyof ExtraIncome,
    val: string | number,
  ) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, [key]: val };
      }
      return item;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {visibleItems.map(({ item, index }) => {
          const suffix = index + 1;
          const itemTitle =
            item[field.itemTitleKey ?? "concepto"] ||
            `${field.label} #${suffix}`;
          const itemHeading = field.itemTitlePrefix
            ? `${field.itemTitlePrefix} ${itemTitle}?`
            : itemTitle;
          const canRemove = field.allowRemove !== false;
          return (
            <div
              key={index}
              className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <span className="text-sm font-bold text-[var(--sea-ink-soft)] uppercase tracking-wider">
                  {itemHeading}
                </span>
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => handleRemove(index)}
                    aria-label={`Eliminar ${itemTitle}`}
                    className="h-auto px-2.5 py-1 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    Eliminar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field.itemFields?.map((itemField) => {
                  const controlId = `${field.id}-${index}-${itemField.key}`;
                  const errorKey = `${field.id}.${index}.${itemField.key}`;
                  const itemError = errors[errorKey];
                  const hasError = !!itemError;
                  const describedBy = [
                    itemField.helpText ? `${controlId}-help` : null,
                    hasError ? `${controlId}-error` : null
                  ].filter(Boolean).join(" ") || undefined;

                  return (
                    <div key={itemField.key} className="space-y-1.5">
                      <label
                        htmlFor={controlId}
                        className="block text-sm font-bold text-[var(--sea-ink)]"
                      >
                        {itemField.label} {suffix}
                        {itemField.required && (
                          <span className="text-rose-500 ml-0.5">*</span>
                        )}
                      </label>

                      {itemField.type === "month" ? (
                        <select
                          id={controlId}
                          disabled={disabled}
                          value={String(item[itemField.key] ?? "")}
                          aria-invalid={hasError}
                          aria-describedby={describedBy}
                          onChange={(e) =>
                            handleFieldChange(index, itemField.key, e.target.value)
                          }
                          className={`block w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3.5 py-2.5 text-base text-[var(--sea-ink)] outline-none transition-colors focus:border-[var(--lagoon-deep)] focus:ring-3 focus:ring-[color-mix(in_oklab,var(--lagoon)_25%,transparent)] ${
                            hasError
                              ? "border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]"
                              : ""
                          }`}
                        >
                          <option value="">Mes y año</option>
                          {getMonthlyDateOptions().map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : itemField.type === "number" ? (
                        <Input
                          id={controlId}
                          type="text"
                          inputMode="numeric"
                          disabled={disabled}
                          value={formatNumber(item[itemField.key])}
                          aria-invalid={hasError}
                          aria-describedby={describedBy}
                          onChange={(e) =>
                            handleFieldChange(
                              index,
                              itemField.key,
                              parseNumber(e.target.value),
                            )
                          }
                          className={
                            hasError
                              ? "border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]"
                              : ""
                          }
                        />
                      ) : (
                        <Input
                          id={controlId}
                          type="text"
                          disabled={disabled}
                          value={String(item[itemField.key] ?? "")}
                          aria-invalid={hasError}
                          aria-describedby={describedBy}
                          onChange={(e) =>
                            handleFieldChange(index, itemField.key, e.target.value)
                          }
                          className={
                            hasError
                              ? "border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]"
                              : ""
                          }
                        />
                      )}

                      {itemField.helpText && (
                        <p
                          id={`${controlId}-help`}
                          className="text-base text-[var(--sea-ink-soft)] leading-normal"
                        >
                          {itemField.helpText}
                        </p>
                      )}

                      {hasError && (
                        <p
                          id={`${controlId}-error`}
                          className="mt-1 text-xs font-semibold text-[var(--error)]"
                          role="alert"
                          aria-live="polite"
                        >
                          {itemError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {field.allowAdd !== false && items.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={handleAdd}
          className="w-full h-auto py-3 rounded-2xl border-dashed border-2 border-[var(--line)] text-base font-bold text-[var(--sea-ink)] hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)] hover:bg-[var(--foam)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="size-5" />
          {field.addLabel ?? "Agregar Ingreso"}
        </Button>
      )}
    </div>
  );
}
