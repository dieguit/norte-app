import { z } from "zod";

export const amountSchema = z.string().refine((amount) => {
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

export const conceptSchema = z
  .string()
  .trim()
  .max(120, "Máximo 120 caracteres.")
  .nullish()
  .transform((value) => value || null);

export const customSourceSchemas = [
  z.object({ kind: z.literal("custom"), sourceId: z.string().uuid() }),
  z.object({
    kind: z.literal("custom"),
    name: z
      .string()
      .trim()
      .min(1, "Ingresá una categoría.")
      .max(120, "Máximo 120 caracteres."),
  }),
] as const;

export const entryResponseFields = {
  id: z.string().uuid(),
  sourceKind: z.string(),
  sourceId: z.string().uuid().nullable(),
  concept: z.string().nullable(),
  amount: z.string(),
  currency: z.enum(["ARS", "USD"]),
  recurring: z.boolean(),
};
