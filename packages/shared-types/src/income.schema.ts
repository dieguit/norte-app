import { z } from "zod";
import {
  amountSchema,
  conceptSchema,
  customSourceSchemas,
  entryResponseFields,
} from "./finance-entry.schema";

export const FIXED_INCOME_SOURCES = {
  salary: "Sueldo",
  independent: "Trabajo independiente",
  pension: "Jubilación o pensión",
  rent: "Alquileres",
  investments: "Inversiones",
  family_support: "Ayuda familiar",
  uncategorized: "Sin categoría",
  asset_sale: "Venta de bienes / usados",
  bonus: "Bono / aguinaldo / premio",
  occasional_work: "Trabajo ocasional",
  gift_inheritance: "Regalo / herencia",
  refund: "Reintegro / devolución",
  extraordinary_income: "Rescate o cobro extraordinario",
} as const;

const sourceSchema = z.union(
  [
    z.object({
      kind: z.enum(
        Object.keys(FIXED_INCOME_SOURCES) as [
          keyof typeof FIXED_INCOME_SOURCES,
          ...(keyof typeof FIXED_INCOME_SOURCES)[],
        ],
      ),
    }),
    ...customSourceSchemas,
  ],
  { error: "Seleccioná una categoría." },
);

export const IncomeDraftSchema = z.object({
  concept: conceptSchema,
  source: sourceSchema,
  amount: amountSchema,
  currency: z.enum(["ARS", "USD"]),
  recurring: z.boolean(),
  effectiveMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingresá un mes válido."),
});
export const IncomeMutationResponseSchema = z.object({
  ...entryResponseFields,
  userId: z.string(),
  effectiveMonth: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type IncomeDraft = z.output<typeof IncomeDraftSchema>;
