import { z } from "zod";

const fixedExpenseSources = [
  "housing",
  "school",
  "health",
  "loans",
  "utilities",
  "insurance",
  "family_support",
  "subscriptions",
  "uncategorized",
  "clothing",
  "gift",
  "family_help",
  "occasional_health",
  "maintenance",
  "travel_leisure",
  "technology",
  "taxes_fees",
] as const;

const sourceSchema = z.union(
  [
    z.object({ kind: z.enum(fixedExpenseSources) }),
    z.object({ kind: z.literal("custom"), sourceId: z.string().uuid() }),
    z.object({
      kind: z.literal("custom"),
      name: z
        .string()
        .trim()
        .min(1, "Ingresá una categoría.")
        .max(120, "Máximo 120 caracteres."),
    }),
  ],
  { error: "Seleccioná una categoría." },
);

const amountSchema = z.string().refine((input) => {
  const clean = input.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  const normalized =
    clean.includes(",") && clean.includes(".")
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.includes(",")
        ? clean.replace(",", ".")
        : clean.includes(".") &&
            (clean.split(".").length > 2 || clean.split(".")[1].length === 3)
          ? clean.replace(/\./g, "")
          : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingresá un monto mayor a cero.");

export const ExpenseDraftSchema = z.object({
  concept: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres.")
    .nullish()
    .transform((value) => value || null),
  source: sourceSchema,
  amount: amountSchema,
  currency: z.enum(["ARS", "USD"]),
  recurring: z.boolean(),
});
export const ExpenseMutationResponseSchema = z.object({
  id: z.string().uuid(),
  sourceKind: z.string(),
  sourceId: z.string().uuid().nullable(),
  concept: z.string().nullable(),
  amount: z.string(),
  currency: z.enum(["ARS", "USD"]),
  recurring: z.boolean(),
  effectiveMonth: z.iso.date(),
  endMonth: z.iso.date().nullable(),
});
export type ExpenseDraft = z.output<typeof ExpenseDraftSchema>;
