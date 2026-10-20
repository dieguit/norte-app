import { z } from "zod";
import {
  amountSchema,
  conceptSchema,
  customSourceSchemas,
  entryResponseFields,
} from "./finance-entry.schema";

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
    ...customSourceSchemas,
  ],
  { error: "Seleccioná una categoría." },
);

export const ExpenseDraftSchema = z.object({
  concept: conceptSchema,
  source: sourceSchema,
  amount: amountSchema,
  currency: z.enum(["ARS", "USD"]),
  recurring: z.boolean(),
});
export const ExpenseMutationResponseSchema = z.object({
  ...entryResponseFields,
  effectiveMonth: z.iso.date(),
  endMonth: z.iso.date().nullable(),
});
export type ExpenseDraft = z.output<typeof ExpenseDraftSchema>;
