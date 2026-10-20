import { z } from "zod";

const MoneySchema = z.object({
  amount: z.string(),
  currency: z.enum(["ARS", "USD"]),
});

const PreviousMonthShortfallSchema = z.object({
  kind: z.enum(["saving", "investment"]),
  currency: z.enum(["ARS", "USD"]),
  amount: MoneySchema,
});

export const InitialHomeStateSchema = z.object({
  income: MoneySchema,
  expensesKnowledge: z.enum(["known", "unknown"]),
  expenses: MoneySchema.optional(),
  plan: z.object({
    fundingMethod: z.enum(["save", "invest"]),
    destinationCurrency: z.enum(["ARS", "USD"]),
    monthlyCommitment: MoneySchema,
    destinationAmount: MoneySchema,
    effectiveMonth: z.string(),
    allocationPercentage: z.string(),
  }),
  goal: z.object({
    type: z.string(),
    name: z.string(),
    targetAmount: MoneySchema.optional(),
    currentAmount: MoneySchema,
    emergencyFundMonths: z.number().optional(),
  }),
  previousMonthShortfalls: z.array(PreviousMonthShortfallSchema),
});

export const ProfileResponseSchema = z
  .object({
    profile: z.enum(["missing", "present"]),
    home: InitialHomeStateSchema.optional(),
  })
  .refine(
    (value) => (value.profile === "present") === (value.home !== undefined),
  );

export type InitialHomeState = z.infer<typeof InitialHomeStateSchema>;
export type ProfileResponse =
  { profile: "missing" } | { profile: "present"; home: InitialHomeState };
