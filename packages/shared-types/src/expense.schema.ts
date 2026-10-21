import { z } from "zod";
import {
  amountSchema,
  conceptSchema,
  customSourceSchemas,
  entryResponseFields,
} from "./finance-entry.schema";

export const RECURRING_EXPENSE_SOURCES = {
  housing: 'Alquiler / vivienda',
  school: 'Colegio',
  health: 'Prepaga / salud',
  loans: 'Préstamos',
  utilities: 'Servicios',
  insurance: 'Seguros',
  family_support: 'Ayuda a familiares',
  subscriptions: 'Suscripciones',
  uncategorized: 'Sin categoría',
} as const;

export const ONE_TIME_EXPENSE_SOURCES = {
  clothing: 'Compra de ropa',
  gift: 'Regalo',
  family_help: 'Ayuda familiar',
  occasional_health: 'Salud ocasional',
  maintenance: 'Reparación / mantenimiento',
  travel_leisure: 'Viaje / salida',
  technology: 'Tecnología / electrónica',
  taxes_fees: 'Trámite / impuesto',
  uncategorized: 'Sin categoría',
} as const;

export const FIXED_EXPENSE_SOURCES = {
  ...RECURRING_EXPENSE_SOURCES,
  ...ONE_TIME_EXPENSE_SOURCES,
} as const;

const fixedExpenseSources = Object.keys(FIXED_EXPENSE_SOURCES) as [
  keyof typeof FIXED_EXPENSE_SOURCES,
  ...(keyof typeof FIXED_EXPENSE_SOURCES)[],
];

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
