// src/placeholder.schema.ts
import { z } from "zod";
var PlaceholderStatusSchema = z.enum(["todo", "in-progress", "done"]);
var PlaceholderItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  status: PlaceholderStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});
var PlaceholderItemListSchema = z.array(PlaceholderItemSchema);
var CreatePlaceholderItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().default("")
});
var UpdatePlaceholderItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  description: z.string().optional(),
  status: PlaceholderStatusSchema.optional()
});
var DeletePlaceholderItemResponseSchema = z.object({
  success: z.boolean()
});

// src/profile.schema.ts
import { z as z2 } from "zod";
var MoneySchema = z2.object({
  amount: z2.string(),
  currency: z2.enum(["ARS", "USD"])
});
var PreviousMonthShortfallSchema = z2.object({
  kind: z2.enum(["saving", "investment"]),
  currency: z2.enum(["ARS", "USD"]),
  amount: MoneySchema
});
var InitialHomeStateSchema = z2.object({
  income: MoneySchema,
  expensesKnowledge: z2.enum(["known", "unknown"]),
  expenses: MoneySchema.optional(),
  plan: z2.object({
    fundingMethod: z2.enum(["save", "invest"]),
    destinationCurrency: z2.enum(["ARS", "USD"]),
    monthlyCommitment: MoneySchema,
    destinationAmount: MoneySchema,
    effectiveMonth: z2.string(),
    allocationPercentage: z2.string()
  }),
  goal: z2.object({
    type: z2.string(),
    name: z2.string(),
    targetAmount: MoneySchema.optional(),
    currentAmount: MoneySchema,
    emergencyFundMonths: z2.number().optional()
  }),
  previousMonthShortfalls: z2.array(PreviousMonthShortfallSchema)
});
var ProfileResponseSchema = z2.object({
  profile: z2.enum(["missing", "present"]),
  home: InitialHomeStateSchema.optional()
}).refine(
  (value) => value.profile === "present" === (value.home !== void 0)
);

// src/income.schema.ts
import { z as z3 } from "zod";
var FIXED_INCOME_SOURCES = {
  salary: "Sueldo",
  independent: "Trabajo independiente",
  pension: "Jubilaci\xF3n o pensi\xF3n",
  rent: "Alquileres",
  investments: "Inversiones",
  family_support: "Ayuda familiar",
  uncategorized: "Sin categor\xEDa",
  asset_sale: "Venta de bienes / usados",
  bonus: "Bono / aguinaldo / premio",
  occasional_work: "Trabajo ocasional",
  gift_inheritance: "Regalo / herencia",
  refund: "Reintegro / devoluci\xF3n",
  extraordinary_income: "Rescate o cobro extraordinario"
};
var amountSchema = z3.string().refine((amount) => {
  const clean = amount.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  if (!clean) return false;
  const normalized = clean.includes(",") && clean.includes(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.includes(",") ? clean.replace(",", ".") : clean.includes(".") && (clean.split(".").length > 2 || clean.split(".")[1].length === 3) ? clean.replace(/\./g, "") : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingres\xE1 un monto mayor a cero.");
var conceptSchema = z3.string().trim().max(120, "M\xE1ximo 120 caracteres.").nullish().transform((value) => value || null);
var sourceSchema = z3.union(
  [
    z3.object({
      kind: z3.enum(
        Object.keys(FIXED_INCOME_SOURCES)
      )
    }),
    z3.object({ kind: z3.literal("custom"), sourceId: z3.string().uuid() }),
    z3.object({
      kind: z3.literal("custom"),
      name: z3.string().trim().min(1, "Ingres\xE1 una categor\xEDa.").max(120, "M\xE1ximo 120 caracteres.")
    })
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var IncomeDraftSchema = z3.object({
  concept: conceptSchema,
  source: sourceSchema,
  amount: amountSchema,
  currency: z3.enum(["ARS", "USD"]),
  recurring: z3.boolean(),
  effectiveMonth: z3.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingres\xE1 un mes v\xE1lido.")
});
var IncomeMutationResponseSchema = z3.object({
  id: z3.string().uuid(),
  userId: z3.string(),
  sourceKind: z3.string(),
  sourceId: z3.string().uuid().nullable(),
  concept: z3.string().nullable(),
  amount: z3.string(),
  currency: z3.enum(["ARS", "USD"]),
  recurring: z3.boolean(),
  effectiveMonth: z3.string(),
  createdAt: z3.iso.datetime(),
  updatedAt: z3.iso.datetime()
});

// src/expense.schema.ts
import { z as z4 } from "zod";
var fixedExpenseSources = [
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
  "taxes_fees"
];
var sourceSchema2 = z4.union(
  [
    z4.object({ kind: z4.enum(fixedExpenseSources) }),
    z4.object({ kind: z4.literal("custom"), sourceId: z4.string().uuid() }),
    z4.object({
      kind: z4.literal("custom"),
      name: z4.string().trim().min(1, "Ingres\xE1 una categor\xEDa.").max(120, "M\xE1ximo 120 caracteres.")
    })
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var amountSchema2 = z4.string().refine((input) => {
  const clean = input.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  const normalized = clean.includes(",") && clean.includes(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.includes(",") ? clean.replace(",", ".") : clean.includes(".") && (clean.split(".").length > 2 || clean.split(".")[1].length === 3) ? clean.replace(/\./g, "") : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingres\xE1 un monto mayor a cero.");
var ExpenseDraftSchema = z4.object({
  concept: z4.string().trim().max(120, "M\xE1ximo 120 caracteres.").nullish().transform((value) => value || null),
  source: sourceSchema2,
  amount: amountSchema2,
  currency: z4.enum(["ARS", "USD"]),
  recurring: z4.boolean()
});
var ExpenseMutationResponseSchema = z4.object({
  id: z4.string().uuid(),
  sourceKind: z4.string(),
  sourceId: z4.string().uuid().nullable(),
  concept: z4.string().nullable(),
  amount: z4.string(),
  currency: z4.enum(["ARS", "USD"]),
  recurring: z4.boolean(),
  effectiveMonth: z4.iso.date(),
  endMonth: z4.iso.date().nullable()
});

// src/savings-place.schema.ts
import { z as z5 } from "zod";
var SavingsPlaceNameSchema = z5.string().trim().min(1).max(120);
var CreateSavingsPlaceSchema = z5.object({ name: SavingsPlaceNameSchema });
var RenameSavingsPlaceSchema = z5.object({ name: SavingsPlaceNameSchema });
var SavingsPlaceIdParamsSchema = z5.object({ id: z5.string().uuid() });
var SavingsTransferSchema = z5.object({
  fromPlaceId: z5.string().uuid(),
  toPlaceId: z5.string().uuid(),
  currency: z5.enum(["ARS", "USD"]),
  amount: z5.string().min(1)
}).refine((value) => value.fromPlaceId !== value.toPlaceId, { message: "El origen y el destino deben ser distintos." });
var SavingsPlaceMutationResponseSchema = z5.object({ placeId: z5.string().uuid() });
var SavingsTransferResponseSchema = z5.object({ transferId: z5.string().uuid() });

// src/usd-purchase.ts
import BigNumber from "bignumber.js";
function normalizeDotSeparatedNumber(value) {
  const parts = value.split(".");
  return parts.length > 2 || parts.length === 2 && parts[1].length === 3 ? value.replace(/\./g, "") : value;
}
function normalizeNumericText(value) {
  if (value === void 0 || value === null) return null;
  const clean = String(value).replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  if (!clean) return null;
  return normalizeNumericSeparators(clean);
}
function hasCommaAndDot(value) {
  return value.includes(",") && value.includes(".");
}
function normalizeNumericSeparators(value) {
  if (hasCommaAndDot(value)) return value.replace(/\./g, "").replace(",", ".");
  if (value.includes(",")) return value.replace(",", ".");
  return normalizeDotSeparatedNumber(value);
}
function isFiniteNumber(value) {
  return value.isFinite() && !value.isNaN();
}
function parseNumericValue(value) {
  const normalized = normalizeNumericText(value);
  if (!normalized) return null;
  try {
    const parsed = new BigNumber(normalized);
    return isFiniteNumber(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function isValueProvided(value) {
  return value !== void 0 && value !== null && String(value).trim() !== "";
}
function parseUsdPurchaseValues(input) {
  const values = [input.usdAmount, input.arsSpent, input.effectiveRate];
  const parsed = values.map((value) => ({
    value: parseNumericValue(value),
    provided: isValueProvided(value)
  }));
  return {
    usd: parsed[0],
    ars: parsed[1],
    rate: parsed[2],
    providedCount: parsed.filter(({ provided }) => provided).length
  };
}
function validateUsdPurchaseValues(values) {
  for (const item of [values.usd, values.ars, values.rate]) {
    if (item.provided && !item.value?.isGreaterThan(0)) {
      throw new Error("USD purchase values must be positive");
    }
  }
}
function hasUsdPurchasePair(first, second) {
  return first.provided && second.provided && !!first.value && !!second.value;
}
function deriveUsdRate(usd, ars) {
  return { effectiveRate: ars.dividedBy(usd).toFixed(2, BigNumber.ROUND_HALF_UP) };
}
function deriveArsSpent(usd, rate) {
  return { arsSpent: usd.times(rate).toFixed(2, BigNumber.ROUND_HALF_UP) };
}
function deriveUsdAmount(ars, rate) {
  return { usdAmount: ars.dividedBy(rate).toFixed(2, BigNumber.ROUND_HALF_UP) };
}
function deriveTwoUsdPurchaseValues(values) {
  const { usd, ars, rate } = values;
  if (hasUsdPurchasePair(usd, ars)) return deriveUsdRate(usd.value, ars.value);
  if (hasUsdPurchasePair(usd, rate)) return deriveArsSpent(usd.value, rate.value);
  if (hasUsdPurchasePair(ars, rate)) return deriveUsdAmount(ars.value, rate.value);
  return null;
}
function hasIncoherentUsdPurchase(ars, expectedArs) {
  const roundedExpected = expectedArs.toFixed(2, BigNumber.ROUND_HALF_UP);
  const roundedActual = ars.toFixed(2, BigNumber.ROUND_HALF_UP);
  return roundedExpected !== roundedActual;
}
function normalizeCompleteUsdPurchase(values) {
  const { usd, ars, rate } = values;
  const [usdValue, arsValue, rateValue] = requireCompleteUsdPurchaseValues(usd.value, ars.value, rate.value);
  const expectedArs = usdValue.times(rateValue);
  if (hasIncoherentUsdPurchase(arsValue, expectedArs)) {
    throw new Error("USD purchase values are incoherent");
  }
  return {
    usdAmount: usdValue.toFixed(2, BigNumber.ROUND_HALF_UP),
    arsSpent: arsValue.toFixed(2, BigNumber.ROUND_HALF_UP),
    effectiveRate: rateValue.toFixed(2, BigNumber.ROUND_HALF_UP)
  };
}
function requireCompleteUsdPurchaseValues(usd, ars, rate) {
  if (!usd) throw new Error("USD purchase derivation requires at least two positive values");
  if (!ars) throw new Error("USD purchase derivation requires at least two positive values");
  if (!rate) throw new Error("USD purchase derivation requires at least two positive values");
  return [usd, ars, rate];
}
function deriveUsdPurchase(input) {
  const values = parseUsdPurchaseValues(input);
  validateUsdPurchaseValues(values);
  if (values.providedCount < 2) {
    throw new Error("USD purchase derivation requires at least two positive values");
  }
  if (values.providedCount === 2) {
    return deriveTwoUsdPurchaseValues(values) ?? {
      ...normalizeCompleteUsdPurchase(values)
    };
  }
  return normalizeCompleteUsdPurchase(values);
}

// src/contribution.schema.ts
import { z as z7 } from "zod";

// src/goals.schema.ts
import { z as z6 } from "zod";
var CurrencySchema = z6.enum(["ARS", "USD"]);
var MoneySchema2 = z6.object({ amount: z6.string(), currency: CurrencySchema }).strict();
var DateSchema = z6.iso.date();
var MonthSchema = z6.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var ContributionSummarySchema = z6.object({
  id: z6.string(),
  kind: z6.enum(["saving", "investment"]),
  userId: z6.string().optional(),
  amount: z6.string(),
  currency: CurrencySchema,
  placeId: z6.string().optional(),
  placeName: z6.string().optional(),
  arsSpent: z6.string().nullable().optional(),
  effectiveRate: z6.string().nullable().optional(),
  createdAt: z6.iso.datetime(),
  allocations: z6.array(z6.object({ goalId: z6.string(), goalName: z6.string(), amount: z6.string(), percentage: z6.string() }).strict())
}).strict();
var ContributionSchema = ContributionSummarySchema;
var ProjectionSchema = z6.discriminatedUnion("status", [
  z6.object({ status: z6.literal("available"), completionMonth: MonthSchema }).strict(),
  ...["target_unavailable", "no_future_allocation", "commitment_absent", "plan_paused", "investment_assumption_unavailable", "outside_horizon"].map((status) => z6.object({ status: z6.literal(status) }).strict())
]);
var GoalWorkspaceItemSchema = z6.object({
  id: z6.string(),
  name: z6.string(),
  type: z6.string(),
  currency: CurrencySchema,
  priority: z6.enum(["high", "medium", "low"]),
  strategy: z6.enum(["save", "invest"]),
  status: z6.enum(["active", "paused", "completed"]),
  createdAt: z6.iso.datetime(),
  desiredDate: DateSchema.optional(),
  completedAt: z6.iso.datetime().optional(),
  targetAmount: MoneySchema2.optional(),
  savingsValue: MoneySchema2,
  investmentValue: MoneySchema2,
  actualValue: MoneySchema2,
  progressPercentage: z6.string().optional(),
  funding: z6.array(z6.object({ percentage: z6.string(), monthlyContribution: MoneySchema2.optional(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), effectiveMonth: DateSchema }).strict()),
  projection: ProjectionSchema,
  desiredDateDeltaMonths: z6.number().optional(),
  annualReturnRate: z6.string().optional(),
  availability: z6.enum(["available_now", "available_from", "long_term"]).optional(),
  availableFrom: DateSchema.optional(),
  usesPlanningRate: z6.boolean(),
  completionEligible: z6.boolean(),
  completionWithdrawals: z6.array(z6.object({ id: z6.string(), placeId: z6.string(), placeName: z6.string(), amount: MoneySchema2, createdAt: z6.iso.datetime() }).strict()).optional(),
  contributions: z6.array(ContributionSchema).optional(),
  savingContributions: z6.array(ContributionSchema).optional()
}).strict();
var GoalSchema = GoalWorkspaceItemSchema;
var FinancialSummarySchema = z6.object({ month: MonthSchema, income: MoneySchema2, expenses: MoneySchema2, balance: MoneySchema2, dedicationPercentage: z6.string(), contribution: MoneySchema2 }).strict();
var WorkspaceSchema = z6.object({ financialSummary: FinancialSummarySchema, groups: z6.array(z6.object({ status: z6.enum(["active", "paused", "completed"]), goals: z6.array(GoalSchema) }).strict()) }).strict();
var GoalCreationDraftSchema = z6.object({
  type: z6.enum(["emergency_fund", "purchase", "retirement", "other"]),
  name: z6.string(),
  targetAmount: z6.string(),
  currency: CurrencySchema,
  desiredMonth: z6.string(),
  priority: z6.enum(["high", "medium", "low"]),
  strategy: z6.enum(["save", "invest"]),
  annualReturnRate: z6.string(),
  availability: z6.enum(["available_now", "available_from", "long_term"]),
  availableFromMonth: z6.string(),
  allocations: z6.array(z6.object({ goalId: z6.string(), percentage: z6.string() }).strict())
}).strict();
var GoalProjectionSchema = ProjectionSchema;
var AllocationEntrySchema = z6.object({ goalId: z6.string(), goalName: z6.string(), percentage: z6.string(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), pending: z6.boolean() }).strict();
var ProposalSourceSchema = z6.object({
  profile: z6.object({ userId: z6.string(), baseCurrency: CurrencySchema, expensesKnowledge: z6.string(), plannedMonthlyContribution: z6.string().nullable().optional(), goalDedicationPercentage: z6.string().optional(), onboardingCompleted: z6.boolean() }).strict().nullable().optional(),
  goals: z6.array(z6.object({ id: z6.string(), userId: z6.string().nullable().optional(), name: z6.string(), type: z6.string(), targetAmount: z6.string().nullable().optional(), currency: CurrencySchema, priority: z6.enum(["high", "medium", "low"]), strategy: z6.enum(["save", "invest"]), status: z6.enum(["active", "paused", "completed"]), desiredDate: z6.string().nullable().optional(), completedAt: z6.string().nullable().optional(), emergencyFundMonths: z6.number().nullable().optional(), createdAt: z6.string() }).strict()),
  savingsPositions: z6.array(z6.object({ id: z6.string(), goalId: z6.string(), amount: z6.string(), currency: CurrencySchema, location: z6.string().nullable().optional() }).strict()),
  investmentPositions: z6.array(z6.object({ id: z6.string(), goalId: z6.string(), currentValue: z6.string(), currency: CurrencySchema, annualReturnRate: z6.string().nullable().optional(), availability: z6.enum(["available_now", "available_from", "long_term"]).nullable().optional(), availableFrom: z6.string().nullable().optional() }).strict()),
  snapshots: z6.array(z6.object({ id: z6.string(), userId: z6.string().nullable().optional(), effectiveMonth: z6.string() }).strict()),
  allocations: z6.array(z6.object({ id: z6.string(), snapshotId: z6.string(), goalId: z6.string(), percentage: z6.string() }).strict()),
  contributions: z6.array(ContributionSchema).optional(),
  savingContributions: z6.array(ContributionSchema).optional(),
  incomes: z6.array(z6.object({ id: z6.string(), sourceKind: z6.string(), sourceId: z6.string().nullable(), sourceName: z6.string().nullable(), concept: z6.string().nullable(), amount: z6.string(), currency: CurrencySchema, recurring: z6.boolean(), effectiveMonth: z6.string() }).strict()).optional(),
  expenses: z6.array(z6.object({ id: z6.string(), sourceKind: z6.string(), sourceId: z6.string().nullable(), sourceName: z6.string().nullable(), concept: z6.string().nullable(), amount: z6.string(), currency: CurrencySchema, recurring: z6.boolean(), effectiveMonth: z6.string(), endMonth: z6.string().nullable() }).strict()).optional(),
  completionWithdrawals: z6.array(z6.object({ id: z6.string(), goalId: z6.string(), placeId: z6.string(), placeName: z6.string(), amount: z6.string(), currency: CurrencySchema, createdAt: z6.string() }).strict()).optional()
}).strict();
var GoalCreationProposalSchema = z6.object({
  normalizedGoal: z6.object({ name: z6.string(), type: z6.enum(["emergency_fund", "purchase", "retirement", "other"]), targetAmount: MoneySchema2.optional(), currency: CurrencySchema, priority: z6.enum(["high", "medium", "low"]), strategy: z6.enum(["save", "invest"]), desiredDate: DateSchema.optional(), emergencyFundMonths: z6.number().optional() }).strict(),
  investment: z6.object({ annualReturnRate: z6.string(), availability: z6.enum(["available_now", "available_from", "long_term"]), availableFrom: DateSchema.optional() }).strict().optional(),
  allocation: z6.object({ monthlyContribution: MoneySchema2.optional(), effectiveMonth: z6.string(), entries: z6.array(AllocationEntrySchema), totalPercentage: z6.string() }).strict(),
  impacts: z6.array(z6.object({ goalId: z6.string(), goalName: z6.string(), before: z6.discriminatedUnion("status", [z6.object({ status: z6.literal("not_created") }).strict(), z6.object({ status: z6.literal("existing"), projection: GoalProjectionSchema, allocatedMonthlyAmounts: z6.array(MoneySchema2) }).strict()]), after: GoalProjectionSchema }).strict()),
  proposedSource: ProposalSourceSchema
}).strict();
var GoalCreationDraftWireSchema = GoalCreationDraftSchema;
var ConfirmGoalCreationWireSchema = z6.object({ draft: GoalCreationDraftSchema, previewToken: z6.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationContextWireSchema = z6.object({ currentMonth: MonthSchema, expensesKnowledge: z6.enum(["known", "unknown"]), hasEmergencyFund: z6.boolean(), plannedMonthlyContribution: MoneySchema2.optional(), currentAllocation: z6.object({ effectiveMonth: z6.string(), entries: z6.array(z6.object({ goalId: z6.string(), percentage: z6.string() }).strict()) }).strict().optional() }).strict();
var GoalCreationContextMissingSchema = z6.object({ profile: z6.literal("missing") }).strict();
var GoalCreationContextPresentSchema = z6.object({ profile: z6.literal("present"), context: GoalCreationContextWireSchema }).strict();
var GoalCreationContextStateSchema = z6.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCreationContextPresentSchema]);
var GoalCreationPreviewSchema = z6.object({ proposal: GoalCreationProposalSchema, previewToken: z6.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationCreatedSchema = z6.object({ status: z6.literal("created"), goalId: z6.string() }).strict();
var GoalCreationStaleSchema = z6.object({ status: z6.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalCreationConfirmationSchema = z6.discriminatedUnion("status", [GoalCreationCreatedSchema, GoalCreationStaleSchema]);
var AllocationChangeDraftWireSchema = z6.object({
  dedicationPercentage: z6.number().int().min(0).max(100),
  allocations: z6.array(z6.object({ goalId: z6.string(), percentage: z6.string() }).strict()).min(1)
}).strict();
var ConfirmAllocationChangeWireSchema = z6.object({ draft: AllocationChangeDraftWireSchema, previewToken: z6.string().regex(/^[a-f0-9]{64}$/) }).strict();
var AllocationSchema = GoalCreationProposalSchema.shape.allocation;
var ImpactsSchema = GoalCreationProposalSchema.shape.impacts;
var AllocationChangePreviewSchema = z6.object({
  proposal: z6.object({
    dedicationPercentage: z6.number().int().min(0).max(100),
    allocation: AllocationSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: z6.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var AllocationChangeUpdatedSchema = z6.object({ status: z6.literal("updated") }).strict();
var AllocationChangeStaleSchema = z6.object({ status: z6.literal("stale"), preview: AllocationChangePreviewSchema }).strict();
var AllocationChangeConfirmationSchema = z6.discriminatedUnion("status", [AllocationChangeUpdatedSchema, AllocationChangeStaleSchema]);
var AllocationSnapshotSchema = z6.object({ effectiveMonth: z6.string(), entries: z6.array(z6.object({ goalId: z6.string(), percentage: z6.string() }).strict()) }).strict();
var AllocationChangeContextSchema = z6.object({
  currentMonth: MonthSchema,
  financialSummary: FinancialSummarySchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: z6.array(z6.object({ id: z6.string(), name: z6.string(), currency: CurrencySchema, projection: ProjectionSchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var AllocationChangeContextStateSchema = z6.discriminatedUnion("profile", [
  GoalCreationContextMissingSchema,
  z6.object({ profile: z6.literal("present"), context: AllocationChangeContextSchema }).strict()
]);
var GoalLifecycleActionSchema = z6.enum(["pause", "resume"]);
var GoalLifecycleAllocationEntrySchema = z6.object({ goalId: z6.string(), percentage: z6.string() }).strict();
var GoalLifecycleContextSchema = z6.object({
  goalId: z6.string(),
  lifecycle: GoalLifecycleActionSchema,
  goalName: z6.string(),
  goalCurrency: CurrencySchema,
  currentMonth: MonthSchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: z6.array(z6.object({ id: z6.string(), name: z6.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var GoalLifecyclePreviewWireSchema = z6.object({ lifecycle: GoalLifecycleActionSchema, allocations: z6.array(GoalLifecycleAllocationEntrySchema).optional() }).strict();
var ConfirmGoalLifecycleWireSchema = z6.object({
  lifecycle: GoalLifecycleActionSchema,
  allocations: z6.array(GoalLifecycleAllocationEntrySchema),
  previewToken: z6.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalStatusSchema = z6.enum(["active", "paused", "completed"]);
var GoalLifecyclePreviewSchema = z6.object({
  proposal: z6.object({
    lifecycle: GoalLifecycleActionSchema,
    goalId: z6.string(),
    nextStatus: GoalStatusSchema,
    transition: z6.object({ goalId: z6.string(), status: GoalStatusSchema }).strict(),
    pauseMonthlyCommitment: z6.boolean(),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: z6.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalLifecycleUpdatedSchema = z6.object({ status: z6.literal("updated") }).strict();
var GoalLifecycleStaleSchema = z6.object({ status: z6.literal("stale"), preview: GoalLifecyclePreviewSchema }).strict();
var GoalLifecycleConfirmationSchema = z6.discriminatedUnion("status", [GoalLifecycleUpdatedSchema, GoalLifecycleStaleSchema]);
var GoalCompletionContextSchema = z6.object({
  goalId: z6.string(),
  goalName: z6.string(),
  targetAmount: MoneySchema2,
  savingsValue: MoneySchema2,
  currentMonth: MonthSchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  savingsPlaces: z6.array(z6.object({ id: z6.string(), name: z6.string(), balance: MoneySchema2 }).strict()),
  activeGoals: z6.array(z6.object({ id: z6.string(), name: z6.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var GoalCompletionContextPresentSchema = z6.object({ profile: z6.literal("present"), context: GoalCompletionContextSchema }).strict();
var GoalCompletionContextStateSchema = z6.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCompletionContextPresentSchema]);
var GoalCompletionPreviewWireSchema = z6.object({
  withdrawals: z6.array(z6.object({ placeId: z6.string(), amount: z6.string() }).strict()),
  allocations: z6.array(GoalLifecycleAllocationEntrySchema)
}).strict();
var ConfirmGoalCompletionWireSchema = z6.object({
  withdrawals: z6.array(z6.object({ placeId: z6.string(), amount: z6.string() }).strict()),
  allocations: z6.array(GoalLifecycleAllocationEntrySchema),
  previewToken: z6.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionPreviewSchema = z6.object({
  proposal: z6.object({
    goalId: z6.string(),
    goalName: z6.string(),
    targetAmount: MoneySchema2,
    withdrawals: z6.array(z6.object({ placeId: z6.string(), placeName: z6.string(), amount: MoneySchema2 }).strict()),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    pauseMonthlyCommitment: z6.boolean(),
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: z6.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionCompletedSchema = z6.object({ status: z6.literal("completed"), completedAt: z6.iso.datetime() }).strict();
var GoalCompletionStaleSchema = z6.object({ status: z6.literal("stale"), preview: GoalCompletionPreviewSchema }).strict();
var GoalCompletionInvalidSchema = z6.object({ status: z6.literal("invalid"), message: z6.string() }).strict();
var GoalCompletionConfirmationSchema = z6.discriminatedUnion("status", [GoalCompletionCompletedSchema, GoalCompletionStaleSchema, GoalCompletionInvalidSchema]);
var GoalPlanQueryWireSchema = z6.object({ goalId: z6.string().uuid().optional(), action: GoalLifecycleActionSchema.optional() }).refine((query) => query.action === void 0 || query.goalId !== void 0, { message: "Falta el objetivo de la acci\xF3n." });
var GoalIdPathWireSchema = z6.object({ id: z6.string().uuid() }).strict();
var GoalPlanEditContextWireSchema = z6.object({
  goalId: z6.string().uuid(),
  status: z6.enum(["active", "paused"]),
  draft: GoalCreationDraftSchema
}).strict();
var GoalPlanContextPresentSchema = z6.object({
  profile: z6.literal("present"),
  context: GoalCreationContextWireSchema,
  editContext: GoalPlanEditContextWireSchema.optional(),
  allocationContext: AllocationChangeContextSchema.optional(),
  lifecycleContext: GoalLifecycleContextSchema.optional()
}).strict();
var GoalPlanContextStateSchema = z6.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalPlanContextPresentSchema]);
var GoalEditConfirmWireSchema = z6.object({ draft: GoalCreationDraftSchema, previewToken: z6.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalEditUpdatedSchema = z6.object({ status: z6.literal("updated") }).strict();
var GoalEditStaleSchema = z6.object({ status: z6.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalEditConfirmationSchema = z6.discriminatedUnion("status", [GoalEditUpdatedSchema, GoalEditStaleSchema]);
var GoalsWorkspaceMissingSchema = z6.object({ profile: z6.literal("missing") }).strict();
var GoalsWorkspacePresentSchema = z6.object({ profile: z6.literal("present"), workspace: WorkspaceSchema }).strict();
var GoalsWorkspaceSchema = z6.discriminatedUnion("profile", [GoalsWorkspaceMissingSchema, GoalsWorkspacePresentSchema]);

// src/contribution.schema.ts
var MonthSchema2 = z7.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var PreviewTokenSchema = z7.string().regex(/^[a-f0-9]{64}$/, "Token de vista previa inv\xE1lido.");
var ContributionIdSchema = z7.string().uuid("ID de aporte inv\xE1lido.");
var CatchUpMonthSchema = z7.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes de regularizaci\xF3n inv\xE1lido.");
var SavingsPlaceSelectionWireSchema = z7.discriminatedUnion("kind", [
  z7.object({ kind: z7.literal("existing"), placeId: z7.string().uuid("Eleg\xED un lugar v\xE1lido.") }).strict(),
  z7.object({ kind: z7.literal("new"), name: z7.string().trim().min(1, "Escrib\xED un nombre para el lugar.").max(120) }).strict()
]);
var ContributionDraftWireBaseSchema = z7.object({
  kind: z7.enum(["saving", "investment"]).optional().default("saving"),
  currency: z7.enum(["ARS", "USD"]),
  amount: z7.string(),
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: z7.string().nullish(),
  effectiveRate: z7.string().nullish()
}).strict();
var SavingContributionDraftWireSchema = ContributionDraftWireBaseSchema.superRefine((data, ctx) => {
  if (data.kind === "saving" && !data.place) {
    ctx.addIssue({ code: "custom", message: "Eleg\xED un lugar para tu ahorro.", path: ["place"] });
  }
});
var ConfirmSavingContributionWireSchema = z7.object({
  draft: SavingContributionDraftWireSchema,
  previewToken: PreviewTokenSchema,
  catchUpMonth: CatchUpMonthSchema.optional()
}).strict();
var UpdateSavingContributionWireSchema = z7.object({
  draft: SavingContributionDraftWireSchema
}).strict();
var ContributionIdPathWireSchema = z7.object({ id: ContributionIdSchema }).strict();
var EligibleGoalSchema = z7.object({
  id: z7.string(),
  name: z7.string(),
  percentage: z7.union([z7.string(), z7.number()])
}).strict();
var InvestmentCurrencyStateSchema = z7.discriminatedUnion("status", [
  z7.object({ status: z7.literal("ready") }).strict(),
  z7.object({ status: z7.literal("incomplete"), reason: z7.literal("missing_investment_position") }).strict()
]);
var SavingContributionContextSchema = z7.object({
  currentMonth: MonthSchema2,
  eligibleGoals: z7.array(EligibleGoalSchema),
  eligibleGoalsUsd: z7.array(EligibleGoalSchema),
  eligibleInvestmentGoals: z7.array(EligibleGoalSchema).optional(),
  eligibleInvestmentGoalsUsd: z7.array(EligibleGoalSchema).optional(),
  monthlyTargetArs: MoneySchema2.nullish(),
  monthlyTargetUsd: MoneySchema2.nullish(),
  monthlyInvestmentTargetArs: MoneySchema2.nullish(),
  monthlyInvestmentTargetUsd: MoneySchema2.nullish(),
  places: z7.array(z7.object({ id: z7.string(), name: z7.string() }).strict()),
  investmentState: z7.object({ ars: InvestmentCurrencyStateSchema, usd: InvestmentCurrencyStateSchema }).strict()
}).strict();
var SavingContributionContextMissingSchema = z7.object({ profile: z7.literal("missing") }).strict();
var SavingContributionContextPresentSchema = z7.object({ profile: z7.literal("present"), context: SavingContributionContextSchema }).strict();
var SavingContributionContextStateSchema = z7.discriminatedUnion("profile", [
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema
]);
var SavingDraftResultSchema = z7.object({
  kind: z7.enum(["saving", "investment"]).optional(),
  currency: z7.enum(["ARS", "USD"]),
  amount: MoneySchema2,
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: MoneySchema2.optional(),
  effectiveRate: z7.string().optional()
}).strict();
var SavingAllocationPreviewSchema = z7.object({
  goalId: z7.string(),
  goalName: z7.string(),
  percentage: z7.string(),
  amount: MoneySchema2,
  progressBefore: z7.string().optional(),
  progressAfter: z7.string().optional(),
  projectionBefore: ProjectionSchema.optional(),
  projectionAfter: ProjectionSchema.optional()
}).strict();
var SavingContributionPreviewBodySchema = z7.object({
  draft: SavingDraftResultSchema,
  allocations: z7.array(SavingAllocationPreviewSchema)
}).strict();
var SavingContributionEditPreviewSchema = z7.object({
  preview: SavingContributionPreviewBodySchema
}).strict();
var SavingContributionPreviewSchema = z7.object({
  preview: SavingContributionPreviewBodySchema,
  previewToken: PreviewTokenSchema
}).strict();
var SavingContributionCreatedSchema = z7.object({ status: z7.literal("created"), contributionId: z7.string().uuid() }).strict();
var SavingContributionStaleSchema = z7.object({ status: z7.literal("stale"), preview: SavingContributionPreviewSchema }).strict();
var SavingContributionConfirmationSchema = z7.discriminatedUnion("status", [
  SavingContributionCreatedSchema,
  SavingContributionStaleSchema
]);
var SavingContributionUpdatedSchema = z7.object({ status: z7.literal("updated") }).strict();
var SavingContributionDeletedSchema = z7.object({ status: z7.literal("deleted") }).strict();

// src/finances.schema.ts
import { z as z8 } from "zod";
var IdSchema = z8.uuid();
var MonthSchema3 = z8.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var DateSchema2 = z8.iso.date();
var SourceSchema = z8.object({ id: IdSchema, name: z8.string(), normalizedName: z8.string() });
var IncomeSchema = z8.object({
  id: IdSchema,
  sourceKind: z8.string(),
  sourceId: IdSchema.nullable(),
  sourceName: z8.string(),
  concept: z8.string().nullable(),
  amount: z8.string(),
  currency: z8.enum(["ARS", "USD"]),
  recurring: z8.boolean(),
  effectiveMonth: DateSchema2,
  arsEquivalent: z8.string().nullable()
});
var ExpenseSchema = IncomeSchema.extend({ endMonth: DateSchema2.nullable() });
var MoneySchema3 = z8.object({ amount: z8.string(), currency: z8.literal("ARS") });
var MovementSchema = z8.discriminatedUnion("kind", [
  z8.object({ kind: z8.literal("contribution"), id: IdSchema, placeId: IdSchema, placeName: z8.string(), amount: z8.string(), currency: z8.enum(["ARS", "USD"]), createdAt: z8.iso.datetime() }),
  z8.object({ kind: z8.literal("completion"), id: IdSchema, goalId: IdSchema, goalName: z8.string(), placeId: IdSchema, placeName: z8.string(), amount: z8.string(), currency: z8.enum(["ARS", "USD"]), createdAt: z8.iso.datetime() }),
  z8.object({ kind: z8.literal("transfer"), id: IdSchema, fromPlaceId: IdSchema, fromPlaceName: z8.string(), toPlaceId: IdSchema, toPlaceName: z8.string(), amount: z8.string(), currency: z8.enum(["ARS", "USD"]), createdAt: z8.iso.datetime() })
]);
var FinancesWorkspaceSchema = z8.object({
  goalDedicationPercentage: z8.string(),
  month: MonthSchema3,
  summary: z8.object({ income: MoneySchema3, expenses: MoneySchema3, balance: MoneySchema3, contribution: MoneySchema3 }),
  incomes: z8.object({ sources: z8.array(SourceSchema), incomes: z8.array(IncomeSchema) }),
  expenses: z8.object({ sources: z8.array(SourceSchema), expenses: z8.array(ExpenseSchema) }),
  savings: z8.object({ places: z8.array(z8.object({ id: IdSchema, name: z8.string(), balances: z8.object({ ARS: z8.string(), USD: z8.string() }), hasMovements: z8.boolean() })), movements: z8.array(MovementSchema) })
});
function isExpenseIncludedInMonth(expense, month) {
  const targetMonth = month.slice(0, 7);
  const effectiveMonth = expense.effectiveMonth.slice(0, 7);
  const endMonth = expense.endMonth?.slice(0, 7);
  return expense.recurring ? effectiveMonth <= targetMonth && (endMonth === void 0 || targetMonth < endMonth) : effectiveMonth === targetMonth;
}
function isIncomeIncludedInMonth(income, month) {
  const effectiveMonth = income.effectiveMonth.slice(0, 7);
  return income.recurring ? effectiveMonth <= month : effectiveMonth === month;
}

// src/financial-onboarding.schema.ts
import { z as z9 } from "zod";
var percentageSchema = z9.string().refine((value) => {
  const normalized = value.replace(",", ".");
  return /^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(normalized) && Number(normalized) <= 100;
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var onboardingGoalSchema = GoalCreationDraftWireSchema.extend({
  name: z9.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  allocations: z9.array(
    z9.object({ goalId: z9.string().min(1), percentage: percentageSchema }).strict()
  )
});
var FinancialOnboardingSchema = z9.object({
  goal: onboardingGoalSchema,
  incomes: z9.array(IncomeDraftSchema).min(1, "Agreg\xE1 al menos un ingreso recurrente."),
  expenses: z9.array(ExpenseDraftSchema).min(1, "Agreg\xE1 al menos un gasto recurrente.")
}).strict().superRefine((input, context) => {
  if (input.incomes.some((income) => !income.recurring)) {
    context.addIssue({
      code: "custom",
      path: ["incomes"],
      message: "Los ingresos deben ser recurrentes."
    });
  }
  if (input.expenses.some((expense) => !expense.recurring)) {
    context.addIssue({
      code: "custom",
      path: ["expenses"],
      message: "Los gastos deben ser recurrentes."
    });
  }
});
var FinancialOnboardingResponseSchema = z9.object({ created: z9.boolean() }).strict();

// src/home.schema.ts
import { z as z10 } from "zod";
var CurrencySchema2 = z10.enum(["ARS", "USD"]);
var MonthSchema4 = z10.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var MonthOrDateSchema = z10.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/);
var HomeQuerySchema = z10.object({
  currentMonth: MonthSchema4.optional()
}).strict();
var RoadmapIncomeSchema = z10.object({
  id: z10.string(),
  sourceKind: z10.string(),
  sourceId: z10.string().nullable(),
  sourceName: z10.string(),
  concept: z10.string().nullable(),
  amount: z10.string(),
  currency: CurrencySchema2,
  recurring: z10.boolean(),
  effectiveMonth: MonthOrDateSchema,
  arsEquivalent: z10.string().nullable().optional()
}).strict();
var RoadmapExpenseSchema = RoadmapIncomeSchema.extend({
  endMonth: MonthOrDateSchema.nullable()
}).strict();
var RoadmapFinancesSchema = z10.object({
  incomes: z10.object({
    sources: z10.array(z10.object({
      id: z10.string(),
      name: z10.string(),
      normalizedName: z10.string()
    }).strict()).optional(),
    incomes: z10.array(RoadmapIncomeSchema)
  }).strict(),
  expenses: z10.object({
    sources: z10.array(z10.object({
      id: z10.string(),
      name: z10.string(),
      normalizedName: z10.string()
    }).strict()).optional(),
    expenses: z10.array(RoadmapExpenseSchema)
  }).strict()
}).strict();
var RoadmapMonthSchema = z10.object({
  month: MonthSchema4,
  objectives: z10.array(GoalWorkspaceItemSchema),
  oneTimeExpenses: z10.array(RoadmapExpenseSchema),
  recurringExpenses: z10.array(RoadmapExpenseSchema),
  endingExpenses: z10.array(RoadmapExpenseSchema),
  oneTimeIncomes: z10.array(RoadmapIncomeSchema),
  recurringIncomes: z10.array(RoadmapIncomeSchema),
  contributions: z10.array(ContributionSummarySchema)
}).strict();
var RoadmapDataSchema = z10.object({
  undatedObjectives: z10.array(GoalWorkspaceItemSchema),
  futureMonths: z10.array(RoadmapMonthSchema),
  currentMonth: RoadmapMonthSchema,
  historyMonths: z10.array(RoadmapMonthSchema)
}).strict();
var HomeRoadmapMissingSchema = z10.object({
  profile: z10.literal("missing")
}).strict();
var HomeRoadmapPresentSchema = z10.object({
  profile: z10.literal("present").optional(),
  roadmap: RoadmapDataSchema,
  completionGoals: z10.array(GoalWorkspaceItemSchema)
}).strict();
var HomeRoadmapResponseSchema = z10.discriminatedUnion("profile", [
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema
]);

// src/goal-creation.schema.ts
import { parseMoneyInput } from "@repo/finance-utils";
import BigNumber2 from "bignumber.js";
import { z as z11 } from "zod";
var goalTypeSchema = z11.enum(["emergency_fund", "purchase", "retirement", "other"]);
var goalPrioritySchema = z11.enum(["high", "medium", "low"]);
var goalStrategySchema = z11.enum(["save", "invest"]);
var investmentAvailabilitySchema = z11.enum(["available_now", "available_from", "long_term"]);
var percentageSchema2 = z11.string().refine((value) => {
  try {
    const amount = new BigNumber2(value.replace(",", "."));
    const decimals = amount.decimalPlaces();
    return amount.isFinite() && amount.gte(0) && amount.lte(100) && decimals !== null && decimals <= 2;
  } catch {
    return false;
  }
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var allocationEntrySchema = z11.object({
  goalId: z11.string().min(1),
  percentage: percentageSchema2
});
var goalCreationDraftSchema = z11.object({
  type: goalTypeSchema,
  name: z11.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  targetAmount: z11.string(),
  currency: z11.enum(["ARS", "USD"]),
  desiredMonth: z11.string(),
  priority: goalPrioritySchema,
  strategy: goalStrategySchema,
  annualReturnRate: z11.string(),
  availability: investmentAvailabilitySchema,
  availableFromMonth: z11.string(),
  allocations: z11.array(allocationEntrySchema)
});
function isValidAnnualReturnRate(value) {
  try {
    const rate = new BigNumber2(value.replace(",", "."));
    const decimals = rate.decimalPlaces();
    return rate.isFinite() && rate.gte(0) && rate.lte(100) && decimals !== null && decimals !== void 0 && decimals <= 3;
  } catch {
    return false;
  }
}
function needsAvailableFromMonth(availability, month) {
  return availability === "available_from" && !/^\d{4}-\d{2}$/.test(month);
}
function createObjectiveSchema(currentMonth) {
  return goalCreationDraftSchema.superRefine((draft, context) => {
    if (draft.type === "emergency_fund") {
      if (draft.currency !== "USD") context.addIssue({ code: "custom", path: ["currency"], message: "El colch\xF3n financiero se planifica en USD." });
    } else {
      const target = parseMoneyInput(draft.targetAmount, draft.currency);
      if (!target || new BigNumber2(target.amount).lte(0)) context.addIssue({ code: "custom", path: ["targetAmount"], message: "Ingres\xE1 un monto objetivo mayor a cero." });
    }
    if (draft.desiredMonth && draft.desiredMonth <= currentMonth) context.addIssue({ code: "custom", path: ["desiredMonth"], message: "Eleg\xED un mes posterior al actual." });
  });
}
var goalPlanSchema = goalCreationDraftSchema.superRefine((draft, context) => {
  if (draft.strategy !== "invest") return;
  if (!isValidAnnualReturnRate(draft.annualReturnRate)) {
    context.addIssue({ code: "custom", path: ["annualReturnRate"], message: "Ingres\xE1 un rendimiento entre 0% y 100%, con hasta tres decimales." });
  }
  if (needsAvailableFromMonth(draft.availability, draft.availableFromMonth)) {
    context.addIssue({ code: "custom", path: ["availableFromMonth"], message: "Eleg\xED desde qu\xE9 mes estar\xE1 disponible." });
  }
});
var goalImpactSchema = z11.object({
  allocations: z11.array(allocationEntrySchema).min(1)
}).superRefine((data, context) => {
  let total = new BigNumber2(0);
  for (const entry of data.allocations) {
    try {
      const entryBn = new BigNumber2(entry.percentage.replace(",", "."));
      if (entryBn.isFinite()) {
        total = total.plus(entryBn);
      }
    } catch {
    }
  }
  if (!total.eq(100)) {
    context.addIssue({ code: "custom", path: ["allocations"], message: `La distribuci\xF3n debe sumar 100%. Ahora suma ${total.toFixed(2)}%.` });
  }
});
var confirmGoalCreationSchema = z11.object({
  draft: goalCreationDraftSchema,
  previewToken: z11.string().regex(/^[a-f0-9]{64}$/)
}).superRefine((input, context) => {
  const impactResult = goalImpactSchema.safeParse({ allocations: input.draft.allocations });
  if (!impactResult.success) {
    for (const issue of impactResult.error.issues) {
      context.addIssue({ code: "custom", message: issue.message, path: ["draft", ...issue.path] });
    }
  }
});
var goalEditRequestSchema = z11.object({
  goalId: z11.string().uuid()
});
var previewGoalEditSchema = z11.object({
  goalId: z11.string().uuid(),
  draft: goalCreationDraftSchema
});
var confirmGoalEditSchema = z11.object({
  goalId: z11.string().uuid(),
  draft: goalCreationDraftSchema,
  previewToken: z11.string().regex(/^[a-f0-9]{64}$/)
}).superRefine((input, context) => {
  const impactResult = goalImpactSchema.safeParse({ allocations: input.draft.allocations });
  if (!impactResult.success) {
    for (const issue of impactResult.error.issues) {
      context.addIssue({ code: "custom", message: issue.message, path: ["draft", ...issue.path] });
    }
  }
});
function parseGoalCreationSubmission(input, currentMonth) {
  const draft = goalCreationDraftSchema.parse(input);
  createObjectiveSchema(currentMonth).parse(draft);
  goalPlanSchema.parse(draft);
  if (draft.allocations && draft.allocations.length > 0) {
    goalImpactSchema.parse({ allocations: draft.allocations });
  }
  return draft;
}
export {
  AllocationChangeConfirmationSchema,
  AllocationChangeContextSchema,
  AllocationChangeContextStateSchema,
  AllocationChangeDraftWireSchema,
  AllocationChangePreviewSchema,
  AllocationChangeStaleSchema,
  AllocationChangeUpdatedSchema,
  ConfirmAllocationChangeWireSchema,
  ConfirmGoalCompletionWireSchema,
  ConfirmGoalCreationWireSchema,
  ConfirmGoalLifecycleWireSchema,
  ConfirmSavingContributionWireSchema,
  ContributionIdPathWireSchema,
  ContributionSummarySchema,
  CreatePlaceholderItemSchema,
  CreateSavingsPlaceSchema,
  DeletePlaceholderItemResponseSchema,
  ExpenseDraftSchema,
  ExpenseMutationResponseSchema,
  FIXED_INCOME_SOURCES,
  FinancesWorkspaceSchema,
  FinancialOnboardingResponseSchema,
  FinancialOnboardingSchema,
  GoalCompletionCompletedSchema,
  GoalCompletionConfirmationSchema,
  GoalCompletionContextPresentSchema,
  GoalCompletionContextSchema,
  GoalCompletionContextStateSchema,
  GoalCompletionInvalidSchema,
  GoalCompletionPreviewSchema,
  GoalCompletionPreviewWireSchema,
  GoalCompletionStaleSchema,
  GoalCreationConfirmationSchema,
  GoalCreationContextMissingSchema,
  GoalCreationContextPresentSchema,
  GoalCreationContextStateSchema,
  GoalCreationContextWireSchema,
  GoalCreationCreatedSchema,
  GoalCreationDraftWireSchema,
  GoalCreationPreviewSchema,
  GoalCreationStaleSchema,
  GoalEditConfirmWireSchema,
  GoalEditConfirmationSchema,
  GoalEditStaleSchema,
  GoalEditUpdatedSchema,
  GoalIdPathWireSchema,
  GoalLifecycleActionSchema,
  GoalLifecycleConfirmationSchema,
  GoalLifecycleContextSchema,
  GoalLifecyclePreviewSchema,
  GoalLifecyclePreviewWireSchema,
  GoalLifecycleStaleSchema,
  GoalLifecycleUpdatedSchema,
  GoalPlanContextPresentSchema,
  GoalPlanContextStateSchema,
  GoalPlanEditContextWireSchema,
  GoalPlanQueryWireSchema,
  GoalWorkspaceItemSchema,
  GoalsWorkspaceMissingSchema,
  GoalsWorkspacePresentSchema,
  GoalsWorkspaceSchema,
  HomeQuerySchema,
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema,
  HomeRoadmapResponseSchema,
  IncomeDraftSchema,
  IncomeMutationResponseSchema,
  InitialHomeStateSchema,
  PlaceholderItemListSchema,
  PlaceholderItemSchema,
  PlaceholderStatusSchema,
  ProfileResponseSchema,
  RenameSavingsPlaceSchema,
  RoadmapDataSchema,
  RoadmapExpenseSchema,
  RoadmapFinancesSchema,
  RoadmapIncomeSchema,
  RoadmapMonthSchema,
  SavingContributionConfirmationSchema,
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema,
  SavingContributionContextSchema,
  SavingContributionContextStateSchema,
  SavingContributionCreatedSchema,
  SavingContributionDeletedSchema,
  SavingContributionDraftWireSchema,
  SavingContributionEditPreviewSchema,
  SavingContributionPreviewSchema,
  SavingContributionStaleSchema,
  SavingContributionUpdatedSchema,
  SavingsPlaceIdParamsSchema,
  SavingsPlaceMutationResponseSchema,
  SavingsTransferResponseSchema,
  SavingsTransferSchema,
  UpdatePlaceholderItemSchema,
  UpdateSavingContributionWireSchema,
  allocationEntrySchema,
  confirmGoalCreationSchema,
  confirmGoalEditSchema,
  createObjectiveSchema,
  deriveUsdPurchase,
  goalCreationDraftSchema,
  goalEditRequestSchema,
  goalImpactSchema,
  goalPlanSchema,
  goalPrioritySchema,
  goalStrategySchema,
  goalTypeSchema,
  investmentAvailabilitySchema,
  isExpenseIncludedInMonth,
  isIncomeIncludedInMonth,
  parseGoalCreationSubmission,
  previewGoalEditSchema
};
