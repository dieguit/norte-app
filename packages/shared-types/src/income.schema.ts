import { z } from "zod";

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

const amountSchema = z.string().refine((amount) => {
  const clean = amount.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  if (!clean) return false;
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

const conceptSchema = z
  .string()
  .trim()
  .max(120, "Máximo 120 caracteres.")
  .nullish()
  .transform((value) => value || null);
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
  id: z.string().uuid(),
  userId: z.string(),
  sourceKind: z.string(),
  sourceId: z.string().uuid().nullable(),
  concept: z.string().nullable(),
  amount: z.string(),
  currency: z.enum(["ARS", "USD"]),
  recurring: z.boolean(),
  effectiveMonth: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type IncomeDraft = z.output<typeof IncomeDraftSchema>;
