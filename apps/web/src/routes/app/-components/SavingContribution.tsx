import { useEffect, useMemo, useRef, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import BigNumber from "bignumber.js";
import { Button } from "../../../components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import {
  formatCalendarMonth,
  formatMoney,
  formatPercentage,
} from "../../../lib/format";
import { formatMoneyInput, parseMoneyInput } from "../../../lib/money";
import { PLANNING_ARS_PER_USD } from "../../../features/financial/financial";
import {
  buildSavingPreview,
  deriveUsdPurchase,
  type ContributionKind,
  type SavingContributionContext,
  type SavingContributionPreviewResult,
} from "../../../features/contributions/saving-contribution";
import {
  confirmSavingContribution,
  previewSavingContribution,
  updateSavingContribution,
} from "../../../features/contributions/saving-contribution.functions";
import type { SavingContributionSummary } from "../../../features/goals/goals";
import { formatGoalProjection } from "../goals/-components/AllocationImpactComparison";

export interface SavingContributionProps {
  kind?: ContributionKind;
  currency?: "ARS" | "USD";
  initialAmount?: string;
  catchUpMonth?: string;
  context?: SavingContributionContext;
  initialContribution?: SavingContributionSummary | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function formatDerivedMoney(val: string): string {
  const bn = new BigNumber(val);
  if (!bn.isFinite() || bn.isNaN()) return "";
  const str = bn.toFixed(2, BigNumber.ROUND_HALF_UP);
  const [intPart, decPart] = str.split(".");
  const formattedInt = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(BigInt(intPart));
  if (decPart && decPart !== "00") {
    return `${formattedInt},${decPart.replace(/0+$/, "")}`;
  }
  return formattedInt;
}

export function SavingContribution({
  kind: propsKind,
  currency: propsCurrency,
  initialAmount,
  catchUpMonth,
  context,
  initialContribution,
  onCancel,
  onSuccess,
}: SavingContributionProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const isEdit = Boolean(initialContribution);

  const kind: ContributionKind =
    initialContribution &&
    "kind" in initialContribution &&
    (initialContribution as any).kind
      ? ((initialContribution as any).kind as ContributionKind)
      : (propsKind ?? "saving");

  const isFixedCurrency = Boolean(propsCurrency);
  const initialCurrency = initialContribution
    ? (initialContribution.currency as "ARS" | "USD")
    : propsCurrency || "ARS";

  const [currency, setCurrency] = useState<"ARS" | "USD">(initialCurrency);
  const [amount, setAmount] = useState(
    initialContribution
      ? formatDerivedMoney(initialContribution.amount)
      : initialAmount
        ? formatDerivedMoney(initialAmount)
        : "",
  );
  const [arsSpent, setArsSpent] = useState(
    initialContribution?.arsSpent
      ? formatDerivedMoney(initialContribution.arsSpent)
      : "",
  );
  const [effectiveRate, setEffectiveRate] = useState(
    initialContribution?.effectiveRate
      ? formatDerivedMoney(initialContribution.effectiveRate)
      : initialCurrency === "USD"
        ? formatDerivedMoney(PLANNING_ARS_PER_USD)
        : "",
  );
  const [derivedField, setDerivedField] = useState<
    "arsSpent" | "effectiveRate" | "amount" | null
  >(initialCurrency === "USD" ? "arsSpent" : null);

  const [preview, setPreview] =
    useState<SavingContributionPreviewResult | null>(null);
  const [isPreviewPending, setIsPreviewPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const alertRef = useRef<HTMLDivElement>(null);

  const eligibleGoals = useMemo(() => {
    if (isEdit && initialContribution) {
      return initialContribution.allocations.map((a) => ({
        id: a.goalId,
        name: a.goalName,
        percentage: a.percentage,
      }));
    }
    if (kind === "investment") {
      return currency === "USD"
        ? (context?.eligibleInvestmentGoalsUsd ?? [])
        : (context?.eligibleInvestmentGoals ?? []);
    }
    return currency === "USD"
      ? (context?.eligibleGoalsUsd ?? [])
      : (context?.eligibleGoals ?? []);
  }, [isEdit, initialContribution, kind, currency, context]);
  const hasEligibleGoals = Boolean(eligibleGoals && eligibleGoals.length > 0);

  const handleCurrencyChange = (newCurrency: "ARS" | "USD") => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    setAmount("");
    setArsSpent("");
    setEffectiveRate(
      newCurrency === "USD" ? formatDerivedMoney(PLANNING_ARS_PER_USD) : "",
    );
    setDerivedField(newCurrency === "USD" ? "arsSpent" : null);
    setPreview(null);
    setServerError(null);
    setStaleMessage(null);
    setValidationError(null);
  };

  const handleAmountChange = (raw: string) => {
    const formatted = formatMoneyInput(raw);
    setAmount(formatted);
    setPreview(null);
    setServerError(null);
    setStaleMessage(null);
    setValidationError(null);

    if (currency === "USD") {
      if (derivedField === "arsSpent" || !arsSpent) {
        if (formatted && effectiveRate) {
          try {
            const derivation = deriveUsdPurchase({
              usdAmount: formatted,
              effectiveRate: effectiveRate,
            });
            if (derivation.arsSpent) {
              setArsSpent(formatDerivedMoney(derivation.arsSpent));
              setDerivedField("arsSpent");
            }
          } catch {
            // Ignored during intermediate typing
          }
        }
      } else if (derivedField === "effectiveRate" || !effectiveRate) {
        if (formatted && arsSpent) {
          try {
            const derivation = deriveUsdPurchase({
              usdAmount: formatted,
              arsSpent: arsSpent,
            });
            if (derivation.effectiveRate) {
              setEffectiveRate(formatDerivedMoney(derivation.effectiveRate));
              setDerivedField("effectiveRate");
            }
          } catch {
            // Ignored during intermediate typing
          }
        }
      }
    }
  };

  const handleArsSpentChange = (raw: string) => {
    const formatted = formatMoneyInput(raw);
    setArsSpent(formatted);
    setPreview(null);
    setServerError(null);
    setStaleMessage(null);
    setValidationError(null);

    if (currency === "USD") {
      if (!formatted) {
        setDerivedField(null);
      } else if (!effectiveRate || derivedField === "effectiveRate") {
        if (amount && formatted) {
          try {
            const derivation = deriveUsdPurchase({
              usdAmount: amount,
              arsSpent: formatted,
            });
            if (derivation.effectiveRate) {
              setEffectiveRate(formatDerivedMoney(derivation.effectiveRate));
              setDerivedField("effectiveRate");
            }
          } catch {
            // Ignored during intermediate typing
          }
        }
      } else if (!amount || derivedField === "amount") {
        if (effectiveRate && formatted) {
          try {
            const derivation = deriveUsdPurchase({
              arsSpent: formatted,
              effectiveRate: effectiveRate,
            });
            if (derivation.usdAmount) {
              setAmount(formatDerivedMoney(derivation.usdAmount));
              setDerivedField("amount");
            }
          } catch {
            // Ignored during intermediate typing
          }
        }
      } else {
        setDerivedField(null);
      }
    }
  };

  const handleRateChange = (raw: string) => {
    const formatted = formatMoneyInput(raw);
    setEffectiveRate(formatted);
    setPreview(null);
    setServerError(null);
    setStaleMessage(null);
    setValidationError(null);

    if (currency === "USD") {
      if (!formatted) {
        setDerivedField("effectiveRate");
      } else if (derivedField === "arsSpent" || !arsSpent) {
        if (amount && formatted) {
          try {
            const derivation = deriveUsdPurchase({
              usdAmount: amount,
              effectiveRate: formatted,
            });
            if (derivation.arsSpent) {
              setArsSpent(formatDerivedMoney(derivation.arsSpent));
              setDerivedField("arsSpent");
            }
          } catch {
            // Ignored during intermediate typing
          }
        }
      } else if (derivedField === "amount" || !amount) {
        if (arsSpent && formatted) {
          try {
            const derivation = deriveUsdPurchase({
              arsSpent: arsSpent,
              effectiveRate: formatted,
            });
            if (derivation.usdAmount) {
              setAmount(formatDerivedMoney(derivation.usdAmount));
              setDerivedField("amount");
            }
          } catch {
            // Ignored during intermediate typing
          }
        }
      } else {
        setDerivedField(null);
      }
    }
  };

  // Debounced preview calculation
  useEffect(() => {
    if (!hasEligibleGoals) {
      setPreview(null);
      return;
    }

    if (currency === "ARS") {
      const parsed = parseMoneyInput(amount, "ARS");
      if (!parsed) {
        setPreview(null);
        return;
      }

      if (isEdit && initialContribution) {
        try {
          const previewResult = buildSavingPreview({
            kind,
            draft: {
              kind,
              currency: "ARS",
              amount,
            },
            eligibleGoals,
          });
          setPreview({
            preview: previewResult,
            previewToken: "",
          });
          setValidationError(null);
          setServerError(null);
        } catch {
          setPreview(null);
        }
        return;
      }

      let active = true;
      setIsPreviewPending(true);
      const timer = setTimeout(() => {
        previewSavingContribution({
          data: {
            kind,
            currency: "ARS",
            amount,
          },
        })
          .then((res) => {
            if (active) setPreview(res);
          })
          .catch((err) => {
            if (active) {
              setPreview(null);
              setServerError(
                err?.message ?? "Error al calcular la vista previa.",
              );
            }
          })
          .finally(() => {
            if (active) setIsPreviewPending(false);
          });
      }, 250);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    if (currency === "USD") {
      const parsedUsd = parseMoneyInput(amount, "USD");
      if (!parsedUsd) {
        setPreview(null);
        return;
      }

      let derivation: ReturnType<typeof deriveUsdPurchase> | null = null;
      try {
        derivation = deriveUsdPurchase({
          usdAmount: amount,
          arsSpent: arsSpent || null,
          effectiveRate: effectiveRate || null,
        });
        setValidationError(null);
      } catch (err: any) {
        if (amount && arsSpent && effectiveRate) {
          setValidationError(
            "Los valores en USD, ARS gastados y tipo de cambio no coinciden.",
          );
        }
        setPreview(null);
        return;
      }

      if (isEdit && initialContribution) {
        try {
          const previewResult = buildSavingPreview({
            kind,
            draft: {
              kind,
              currency: "USD",
              amount,
              arsSpent: derivation?.arsSpent ?? (arsSpent || null),
              effectiveRate:
                derivation?.effectiveRate ?? (effectiveRate || null),
            },
            eligibleGoals,
          });
          setPreview({
            preview: previewResult,
            previewToken: "",
          });
          setValidationError(null);
          setServerError(null);
        } catch {
          setPreview(null);
        }
        return;
      }

      let active = true;
      setIsPreviewPending(true);
      const timer = setTimeout(() => {
        previewSavingContribution({
          data: {
            kind,
            currency: "USD",
            amount,
            arsSpent: derivation?.arsSpent ?? (arsSpent || null),
            effectiveRate: derivation?.effectiveRate ?? (effectiveRate || null),
          },
        })
          .then((res) => {
            if (active) setPreview(res);
          })
          .catch((err) => {
            if (active) {
              setPreview(null);
              setServerError(
                err?.message ?? "Error al calcular la vista previa.",
              );
            }
          })
          .finally(() => {
            if (active) setIsPreviewPending(false);
          });
      }, 250);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [
    kind,
    currency,
    amount,
    arsSpent,
    effectiveRate,
    hasEligibleGoals,
    context,
    isEdit,
    initialContribution,
    eligibleGoals,
  ]);

  const handleConfirm = async () => {
    if (!preview || !hasEligibleGoals) return;
    setIsSubmitting(true);
    setServerError(null);
    setStaleMessage(null);

    try {
      const draftPayload = {
        kind,
        currency,
        amount,
        arsSpent: currency === "USD" ? arsSpent || null : null,
        effectiveRate: currency === "USD" ? effectiveRate || null : null,
      };

      if (isEdit && initialContribution) {
        await updateSavingContribution({
          data: {
            contributionId: initialContribution.id,
            draft: draftPayload,
          },
        });

        posthog?.capture("contribution_corrected", { kind, currency });
        await router.invalidate();
        toast.success(
          kind === "investment"
            ? "Inversión actualizada."
            : "Ahorro actualizado.",
        );
        onSuccess();
        return;
      }

      const res = await confirmSavingContribution({
        data: {
          draft: draftPayload,
          previewToken: preview.previewToken,
          catchUpMonth,
        },
      });

      if (res.status === "stale") {
        setPreview(res.preview);
        setStaleMessage(
          "Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.",
        );
        setTimeout(() => alertRef.current?.focus(), 0);
        return;
      }

      posthog?.capture("contribution_recorded", {
        kind,
        currency,
        period: catchUpMonth ? "catch_up" : "current",
      });
      await router.invalidate();
      toast.success(
        kind === "investment" ? "Inversión registrada." : "Ahorro registrado.",
      );
      onSuccess();
    } catch (err: any) {
      setServerError(err?.message ?? "Ocurrió un error al guardar.");
      setTimeout(() => alertRef.current?.focus(), 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = Boolean(
    preview &&
    !isPreviewPending &&
    !isSubmitting &&
    hasEligibleGoals &&
    !validationError,
  );

  const actionNoun = kind === "investment" ? "inversión" : "ahorro";
  const actionVerb = kind === "investment" ? "Invertí" : "Ahorré";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Currency Choice Segmented Control */}
        {!isFixedCurrency && (
          <div
            role="group"
            aria-label={`Moneda del ${actionNoun}`}
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-strong)] p-1 border border-[var(--line)]"
          >
            <button
              type="button"
              disabled={isEdit}
              onClick={() => handleCurrencyChange("ARS")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                currency === "ARS"
                  ? "bg-[var(--surface)] text-[var(--sea-ink)] shadow-sm"
                  : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
              } ${isEdit ? "cursor-not-allowed opacity-75" : ""}`}
            >
              {actionVerb} ARS
            </button>
            <button
              type="button"
              disabled={isEdit}
              onClick={() => handleCurrencyChange("USD")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                currency === "USD"
                  ? "bg-[var(--surface)] text-[var(--sea-ink)] shadow-sm"
                  : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
              } ${isEdit ? "cursor-not-allowed opacity-75" : ""}`}
            >
              {actionVerb} USD
            </button>
          </div>
        )}

        {/* Monthly Target Headline */}
        {!isEdit &&
          !catchUpMonth &&
          hasEligibleGoals &&
          (() => {
            const target =
              kind === "investment"
                ? currency === "USD"
                  ? context?.monthlyInvestmentTargetUsd
                  : context?.monthlyInvestmentTargetArs
                : currency === "USD"
                  ? context?.monthlyTargetUsd
                  : context?.monthlyTargetArs;
            if (!target) return null;
            const isPositive = Number(target.amount) > 0;
            const actionTargetVerb =
              kind === "investment" ? "invertir" : "ahorrar";
            const actionTargetNoun =
              kind === "investment" ? "inversión" : "ahorro";
            return (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/60 px-4 py-3 text-sm text-[var(--sea-ink)]">
                {isPositive ? (
                  <>
                    Necesitás {actionTargetVerb}{" "}
                    <span className="font-bold">{formatMoney(target)}</span>{" "}
                    este mes para cumplir con tus objetivos.
                  </>
                ) : (
                  <span className="font-semibold text-[var(--sea-ink)]">
                    ¡Ya cubriste tu meta de {actionTargetNoun} planificada para
                    este mes!
                  </span>
                )}
              </div>
            );
          })()}

        {/* Server & Stale Alert Summaries */}
        {serverError && (
          <div
            ref={alertRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive"
          >
            {serverError}
          </div>
        )}

        {staleMessage && (
          <div
            ref={alertRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm font-medium text-[var(--sea-ink)] outline-none focus:ring-2 focus:ring-[var(--palm)]"
          >
            {staleMessage}
          </div>
        )}

        {catchUpMonth && (
          <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/60 px-4 py-3 text-sm text-[var(--sea-ink)]">
            Este aporte se registrará para {formatCalendarMonth(catchUpMonth)}.
          </p>
        )}

        {/* Input Fields */}
        <FieldGroup className="flex flex-col gap-4">
          <FieldSet className="flex flex-col gap-4">
            {currency === "ARS" ? (
              <Field>
                <FieldLabel htmlFor="saving-amount-input">
                  Monto en pesos
                </FieldLabel>
                <Input
                  id="saving-amount-input"
                  aria-label="Monto en pesos"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </Field>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="saving-usd-amount-input">
                      Monto en dólares
                    </FieldLabel>
                    <Input
                      id="saving-usd-amount-input"
                      aria-label="Monto en dólares"
                      inputMode="decimal"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="saving-rate-input">
                      Tipo de cambio
                    </FieldLabel>
                    <Input
                      id="saving-rate-input"
                      aria-label="Tipo de cambio"
                      inputMode="decimal"
                      placeholder="1.500"
                      value={effectiveRate}
                      onChange={(e) => handleRateChange(e.target.value)}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="saving-ars-spent-input">
                    Pesos gastados
                  </FieldLabel>
                  <Input
                    id="saving-ars-spent-input"
                    aria-label="Pesos gastados"
                    inputMode="decimal"
                    placeholder="0"
                    value={arsSpent}
                    onChange={(e) => handleArsSpentChange(e.target.value)}
                  />
                </Field>

                {validationError && (
                  <FieldError className="text-sm font-medium text-destructive">
                    {validationError}
                  </FieldError>
                )}
              </div>
            )}

          </FieldSet>
        </FieldGroup>

        {/* Empty Eligible Goals Banner */}
        {!hasEligibleGoals && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)]/50 p-4 text-center">
            <p className="text-sm font-medium text-[var(--sea-ink-soft)]">
              {kind === "investment"
                ? currency === "USD"
                  ? "No hay objetivos activos para distribuir la inversión en USD."
                  : "No hay objetivos activos para distribuir la inversión en ARS."
                : currency === "USD"
                  ? "No hay objetivos activos para distribuir el ahorro en USD."
                  : "No tenés objetivos activos en ARS para asignar este ahorro."}
            </p>
          </div>
        )}

        {/* Preview Sections */}
        {preview && preview.preview.allocations.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Allocation Breakdown */}
            <section
              aria-label={`Distribución de la ${actionNoun}`}
              className="flex flex-col gap-3"
            >
              <h3 className="text-base font-semibold text-[var(--sea-ink)]">
                Así se distribuye tu {actionNoun}
              </h3>
              <div className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 shadow-sm">
                {preview.preview.allocations.map((alloc) => (
                  <div
                    key={alloc.goalId}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-[var(--sea-ink)]">
                        {alloc.goalName}
                      </span>
                      <span className="rounded-md bg-[var(--foam)] px-2 py-0.5 text-xs font-semibold text-[var(--sea-ink)] border border-[var(--line)]">
                        {formatPercentage(alloc.percentage)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[var(--sea-ink)]">
                      {formatMoney(alloc.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Trajectory and Progress Impact */}
            <section
              aria-label="Impacto en objetivos"
              className="flex flex-col gap-3"
            >
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
                Impacto en tus objetivos
              </h4>
              <div className="flex flex-col gap-3">
                {preview.preview.allocations.map((alloc) => {
                  const beforeDate = alloc.projectionBefore
                    ? formatGoalProjection(alloc.projectionBefore)
                    : null;
                  const afterDate = alloc.projectionAfter
                    ? formatGoalProjection(alloc.projectionAfter)
                    : null;

                  return (
                    <div
                      key={alloc.goalId}
                      className="flex flex-col gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--foam)]/20 p-4"
                    >
                      <span className="text-sm font-semibold text-[var(--sea-ink)]">
                        {alloc.goalName}
                      </span>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {/* Before */}
                        <div className="flex flex-col gap-1 rounded-lg bg-[var(--surface)] p-2.5 border border-[var(--line)]">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
                            Antes
                          </span>
                          {alloc.progressBefore !== undefined && (
                            <span className="text-xs font-medium text-[var(--sea-ink-soft)]">
                              Progreso: {formatPercentage(alloc.progressBefore)}
                            </span>
                          )}
                          {beforeDate && (
                            <p className="text-sm font-medium text-[var(--sea-ink-soft)]">
                              {beforeDate}
                            </p>
                          )}
                        </div>

                        {/* Con este aporte */}
                        <div className="flex flex-col gap-1 rounded-lg bg-[var(--foam)]/60 p-2.5 border border-[var(--line)]">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--pine)]">
                            Con este aporte
                          </span>
                          {alloc.progressAfter !== undefined && (
                            <span className="text-xs font-semibold text-[var(--sea-ink)]">
                              Progreso: {formatPercentage(alloc.progressAfter)}
                            </span>
                          )}
                          {afterDate && (
                            <p className="text-sm font-semibold text-[var(--sea-ink)]">
                              {afterDate}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Sticky Actions Footer */}
      <div className="sticky bottom-0 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="button" disabled={!isFormValid} onClick={handleConfirm}>
          {isSubmitting
            ? "Guardando..."
            : isEdit
              ? "Guardar cambios"
              : `Confirmar ${actionNoun}`}
        </Button>
      </div>
    </div>
  );
}
