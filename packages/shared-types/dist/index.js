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
import { z as z4 } from "zod";

// src/finance-entry.schema.ts
import { z as z3 } from "zod";
var amountSchema = z3.string().refine((amount) => {
  const clean = amount.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  if (!clean) return false;
  const normalized = clean.includes(",") && clean.includes(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.includes(",") ? clean.replace(",", ".") : clean.includes(".") && (clean.split(".").length > 2 || clean.split(".")[1].length === 3) ? clean.replace(/\./g, "") : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingres\xE1 un monto mayor a cero.");
var conceptSchema = z3.string().trim().max(120, "M\xE1ximo 120 caracteres.").nullish().transform((value) => value || null);
var customSourceSchemas = [
  z3.object({ kind: z3.literal("custom"), sourceId: z3.string().uuid() }),
  z3.object({
    kind: z3.literal("custom"),
    name: z3.string().trim().min(1, "Ingres\xE1 una categor\xEDa.").max(120, "M\xE1ximo 120 caracteres.")
  })
];
var entryResponseFields = {
  id: z3.string().uuid(),
  sourceKind: z3.string(),
  sourceId: z3.string().uuid().nullable(),
  concept: z3.string().nullable(),
  amount: z3.string(),
  currency: z3.enum(["ARS", "USD"]),
  recurring: z3.boolean()
};

// src/income.schema.ts
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
var sourceSchema = z4.union(
  [
    z4.object({
      kind: z4.enum(
        Object.keys(FIXED_INCOME_SOURCES)
      )
    }),
    ...customSourceSchemas
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var IncomeDraftSchema = z4.object({
  concept: conceptSchema,
  source: sourceSchema,
  amount: amountSchema,
  currency: z4.enum(["ARS", "USD"]),
  recurring: z4.boolean(),
  effectiveMonth: z4.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingres\xE1 un mes v\xE1lido.")
});
var IncomeMutationResponseSchema = z4.object({
  ...entryResponseFields,
  userId: z4.string(),
  effectiveMonth: z4.string(),
  createdAt: z4.iso.datetime(),
  updatedAt: z4.iso.datetime()
});

// src/expense.schema.ts
import { z as z5 } from "zod";
var RECURRING_EXPENSE_SOURCES = {
  housing: "Alquiler / vivienda",
  school: "Colegio",
  health: "Prepaga / salud",
  loans: "Pr\xE9stamos",
  utilities: "Servicios",
  insurance: "Seguros",
  family_support: "Ayuda a familiares",
  subscriptions: "Suscripciones",
  uncategorized: "Sin categor\xEDa"
};
var ONE_TIME_EXPENSE_SOURCES = {
  clothing: "Compra de ropa",
  gift: "Regalo",
  family_help: "Ayuda familiar",
  occasional_health: "Salud ocasional",
  maintenance: "Reparaci\xF3n / mantenimiento",
  travel_leisure: "Viaje / salida",
  technology: "Tecnolog\xEDa / electr\xF3nica",
  taxes_fees: "Tr\xE1mite / impuesto",
  uncategorized: "Sin categor\xEDa"
};
var FIXED_EXPENSE_SOURCES = {
  ...RECURRING_EXPENSE_SOURCES,
  ...ONE_TIME_EXPENSE_SOURCES
};
var fixedExpenseSources = Object.keys(FIXED_EXPENSE_SOURCES);
var sourceSchema2 = z5.union(
  [
    z5.object({ kind: z5.enum(fixedExpenseSources) }),
    ...customSourceSchemas
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var ExpenseDraftSchema = z5.object({
  concept: conceptSchema,
  source: sourceSchema2,
  amount: amountSchema,
  currency: z5.enum(["ARS", "USD"]),
  recurring: z5.boolean()
});
var ExpenseMutationResponseSchema = z5.object({
  ...entryResponseFields,
  effectiveMonth: z5.iso.date(),
  endMonth: z5.iso.date().nullable()
});

// src/savings-place.schema.ts
import { z as z6 } from "zod";
var SavingsPlaceNameSchema = z6.string().trim().min(1).max(120);
var CreateSavingsPlaceSchema = z6.object({ name: SavingsPlaceNameSchema });
var RenameSavingsPlaceSchema = z6.object({ name: SavingsPlaceNameSchema });
var SavingsPlaceIdParamsSchema = z6.object({ id: z6.string().uuid() });
var SavingsTransferSchema = z6.object({
  fromPlaceId: z6.string().uuid(),
  toPlaceId: z6.string().uuid(),
  currency: z6.enum(["ARS", "USD"]),
  amount: z6.string().min(1)
}).refine((value) => value.fromPlaceId !== value.toPlaceId, { message: "El origen y el destino deben ser distintos." });
var SavingsPlaceMutationResponseSchema = z6.object({ placeId: z6.string().uuid() });
var SavingsTransferResponseSchema = z6.object({ transferId: z6.string().uuid() });

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
import { z as z8 } from "zod";

// src/goals.schema.ts
import { z as z7 } from "zod";
var CurrencySchema = z7.enum(["ARS", "USD"]);
var MoneySchema2 = z7.object({ amount: z7.string(), currency: CurrencySchema }).strict();
var DateSchema = z7.iso.date();
var MonthSchema = z7.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var ContributionSummarySchema = z7.object({
  id: z7.string(),
  kind: z7.enum(["saving", "investment"]),
  userId: z7.string().optional(),
  amount: z7.string(),
  currency: CurrencySchema,
  placeId: z7.string().optional(),
  placeName: z7.string().optional(),
  arsSpent: z7.string().nullable().optional(),
  effectiveRate: z7.string().nullable().optional(),
  createdAt: z7.iso.datetime(),
  allocations: z7.array(z7.object({ goalId: z7.string(), goalName: z7.string(), amount: z7.string(), percentage: z7.string() }).strict())
}).strict();
var ContributionSchema = ContributionSummarySchema;
var ProjectionSchema = z7.discriminatedUnion("status", [
  z7.object({ status: z7.literal("available"), completionMonth: MonthSchema }).strict(),
  ...["target_unavailable", "no_future_allocation", "commitment_absent", "plan_paused", "investment_assumption_unavailable", "outside_horizon"].map((status) => z7.object({ status: z7.literal(status) }).strict())
]);
var GoalWorkspaceItemSchema = z7.object({
  id: z7.string(),
  name: z7.string(),
  type: z7.string(),
  currency: CurrencySchema,
  priority: z7.enum(["high", "medium", "low"]),
  strategy: z7.enum(["save", "invest"]),
  status: z7.enum(["active", "paused", "completed"]),
  createdAt: z7.iso.datetime(),
  desiredDate: DateSchema.optional(),
  completedAt: z7.iso.datetime().optional(),
  targetAmount: MoneySchema2.optional(),
  savingsValue: MoneySchema2,
  investmentValue: MoneySchema2,
  actualValue: MoneySchema2,
  progressPercentage: z7.string().optional(),
  funding: z7.array(z7.object({ percentage: z7.string(), monthlyContribution: MoneySchema2.optional(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), effectiveMonth: DateSchema }).strict()),
  projection: ProjectionSchema,
  desiredDateDeltaMonths: z7.number().optional(),
  annualReturnRate: z7.string().optional(),
  availability: z7.enum(["available_now", "available_from", "long_term"]).optional(),
  availableFrom: DateSchema.optional(),
  usesPlanningRate: z7.boolean(),
  completionEligible: z7.boolean(),
  completionWithdrawals: z7.array(z7.object({ id: z7.string(), placeId: z7.string(), placeName: z7.string(), amount: MoneySchema2, createdAt: z7.iso.datetime() }).strict()).optional(),
  contributions: z7.array(ContributionSchema).optional(),
  savingContributions: z7.array(ContributionSchema).optional()
}).strict();
var GoalSchema = GoalWorkspaceItemSchema;
var FinancialSummarySchema = z7.object({ month: MonthSchema, income: MoneySchema2, expenses: MoneySchema2, balance: MoneySchema2, dedicationPercentage: z7.string(), contribution: MoneySchema2 }).strict();
var WorkspaceSchema = z7.object({ financialSummary: FinancialSummarySchema, groups: z7.array(z7.object({ status: z7.enum(["active", "paused", "completed"]), goals: z7.array(GoalSchema) }).strict()) }).strict();
var GoalCreationDraftSchema = z7.object({
  type: z7.enum(["emergency_fund", "purchase", "retirement", "other"]),
  name: z7.string(),
  targetAmount: z7.string(),
  currency: CurrencySchema,
  desiredMonth: z7.string(),
  priority: z7.enum(["high", "medium", "low"]),
  strategy: z7.enum(["save", "invest"]),
  annualReturnRate: z7.string(),
  availability: z7.enum(["available_now", "available_from", "long_term"]),
  availableFromMonth: z7.string(),
  allocations: z7.array(z7.object({ goalId: z7.string(), percentage: z7.string() }).strict())
}).strict();
var GoalProjectionSchema = ProjectionSchema;
var AllocationEntrySchema = z7.object({ goalId: z7.string(), goalName: z7.string(), percentage: z7.string(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), pending: z7.boolean() }).strict();
var ProposalSourceSchema = z7.object({
  profile: z7.object({ userId: z7.string(), baseCurrency: CurrencySchema, expensesKnowledge: z7.string(), plannedMonthlyContribution: z7.string().nullable().optional(), goalDedicationPercentage: z7.string().optional(), onboardingCompleted: z7.boolean() }).strict().nullable().optional(),
  goals: z7.array(z7.object({ id: z7.string(), userId: z7.string().nullable().optional(), name: z7.string(), type: z7.string(), targetAmount: z7.string().nullable().optional(), currency: CurrencySchema, priority: z7.enum(["high", "medium", "low"]), strategy: z7.enum(["save", "invest"]), status: z7.enum(["active", "paused", "completed"]), desiredDate: z7.string().nullable().optional(), completedAt: z7.string().nullable().optional(), emergencyFundMonths: z7.number().nullable().optional(), createdAt: z7.string() }).strict()),
  savingsPositions: z7.array(z7.object({ id: z7.string(), goalId: z7.string(), amount: z7.string(), currency: CurrencySchema, location: z7.string().nullable().optional() }).strict()),
  investmentPositions: z7.array(z7.object({ id: z7.string(), goalId: z7.string(), currentValue: z7.string(), currency: CurrencySchema, annualReturnRate: z7.string().nullable().optional(), availability: z7.enum(["available_now", "available_from", "long_term"]).nullable().optional(), availableFrom: z7.string().nullable().optional() }).strict()),
  snapshots: z7.array(z7.object({ id: z7.string(), userId: z7.string().nullable().optional(), effectiveMonth: z7.string() }).strict()),
  allocations: z7.array(z7.object({ id: z7.string(), snapshotId: z7.string(), goalId: z7.string(), percentage: z7.string() }).strict()),
  contributions: z7.array(ContributionSchema).optional(),
  savingContributions: z7.array(ContributionSchema).optional(),
  incomes: z7.array(z7.object({ id: z7.string(), sourceKind: z7.string(), sourceId: z7.string().nullable(), sourceName: z7.string().nullable(), concept: z7.string().nullable(), amount: z7.string(), currency: CurrencySchema, recurring: z7.boolean(), effectiveMonth: z7.string() }).strict()).optional(),
  expenses: z7.array(z7.object({ id: z7.string(), sourceKind: z7.string(), sourceId: z7.string().nullable(), sourceName: z7.string().nullable(), concept: z7.string().nullable(), amount: z7.string(), currency: CurrencySchema, recurring: z7.boolean(), effectiveMonth: z7.string(), endMonth: z7.string().nullable() }).strict()).optional(),
  completionWithdrawals: z7.array(z7.object({ id: z7.string(), goalId: z7.string(), placeId: z7.string(), placeName: z7.string(), amount: z7.string(), currency: CurrencySchema, createdAt: z7.string() }).strict()).optional()
}).strict();
var GoalCreationProposalSchema = z7.object({
  normalizedGoal: z7.object({ name: z7.string(), type: z7.enum(["emergency_fund", "purchase", "retirement", "other"]), targetAmount: MoneySchema2.optional(), currency: CurrencySchema, priority: z7.enum(["high", "medium", "low"]), strategy: z7.enum(["save", "invest"]), desiredDate: DateSchema.optional(), emergencyFundMonths: z7.number().optional() }).strict(),
  investment: z7.object({ annualReturnRate: z7.string(), availability: z7.enum(["available_now", "available_from", "long_term"]), availableFrom: DateSchema.optional() }).strict().optional(),
  allocation: z7.object({ monthlyContribution: MoneySchema2.optional(), effectiveMonth: z7.string(), entries: z7.array(AllocationEntrySchema), totalPercentage: z7.string() }).strict(),
  impacts: z7.array(z7.object({ goalId: z7.string(), goalName: z7.string(), before: z7.discriminatedUnion("status", [z7.object({ status: z7.literal("not_created") }).strict(), z7.object({ status: z7.literal("existing"), projection: GoalProjectionSchema, allocatedMonthlyAmounts: z7.array(MoneySchema2) }).strict()]), after: GoalProjectionSchema }).strict()),
  proposedSource: ProposalSourceSchema
}).strict();
var GoalCreationDraftWireSchema = GoalCreationDraftSchema;
var ConfirmGoalCreationWireSchema = z7.object({ draft: GoalCreationDraftSchema, previewToken: z7.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationContextWireSchema = z7.object({ currentMonth: MonthSchema, expensesKnowledge: z7.enum(["known", "unknown"]), hasEmergencyFund: z7.boolean(), plannedMonthlyContribution: MoneySchema2.optional(), currentAllocation: z7.object({ effectiveMonth: z7.string(), entries: z7.array(z7.object({ goalId: z7.string(), percentage: z7.string() }).strict()) }).strict().optional() }).strict();
var GoalCreationContextMissingSchema = z7.object({ profile: z7.literal("missing") }).strict();
var GoalCreationContextPresentSchema = z7.object({ profile: z7.literal("present"), context: GoalCreationContextWireSchema }).strict();
var GoalCreationContextStateSchema = z7.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCreationContextPresentSchema]);
var GoalCreationPreviewSchema = z7.object({ proposal: GoalCreationProposalSchema, previewToken: z7.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationCreatedSchema = z7.object({ status: z7.literal("created"), goalId: z7.string() }).strict();
var GoalCreationStaleSchema = z7.object({ status: z7.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalCreationConfirmationSchema = z7.discriminatedUnion("status", [GoalCreationCreatedSchema, GoalCreationStaleSchema]);
var AllocationChangeDraftWireSchema = z7.object({
  dedicationPercentage: z7.number().int().min(0).max(100),
  allocations: z7.array(z7.object({ goalId: z7.string(), percentage: z7.string() }).strict()).min(1)
}).strict();
var ConfirmAllocationChangeWireSchema = z7.object({ draft: AllocationChangeDraftWireSchema, previewToken: z7.string().regex(/^[a-f0-9]{64}$/) }).strict();
var AllocationSchema = GoalCreationProposalSchema.shape.allocation;
var ImpactsSchema = GoalCreationProposalSchema.shape.impacts;
var AllocationChangePreviewSchema = z7.object({
  proposal: z7.object({
    dedicationPercentage: z7.number().int().min(0).max(100),
    allocation: AllocationSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: z7.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var AllocationChangeUpdatedSchema = z7.object({ status: z7.literal("updated") }).strict();
var AllocationChangeStaleSchema = z7.object({ status: z7.literal("stale"), preview: AllocationChangePreviewSchema }).strict();
var AllocationChangeConfirmationSchema = z7.discriminatedUnion("status", [AllocationChangeUpdatedSchema, AllocationChangeStaleSchema]);
var AllocationSnapshotSchema = z7.object({ effectiveMonth: z7.string(), entries: z7.array(z7.object({ goalId: z7.string(), percentage: z7.string() }).strict()) }).strict();
var AllocationChangeContextSchema = z7.object({
  currentMonth: MonthSchema,
  financialSummary: FinancialSummarySchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: z7.array(z7.object({ id: z7.string(), name: z7.string(), currency: CurrencySchema, projection: ProjectionSchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var AllocationChangeContextStateSchema = z7.discriminatedUnion("profile", [
  GoalCreationContextMissingSchema,
  z7.object({ profile: z7.literal("present"), context: AllocationChangeContextSchema }).strict()
]);
var GoalLifecycleActionSchema = z7.enum(["pause", "resume"]);
var GoalLifecycleAllocationEntrySchema = z7.object({ goalId: z7.string(), percentage: z7.string() }).strict();
var allocationContextFields = {
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: z7.array(z7.object({ id: z7.string(), name: z7.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
};
var GoalLifecycleContextSchema = z7.object({
  goalId: z7.string(),
  lifecycle: GoalLifecycleActionSchema,
  goalName: z7.string(),
  goalCurrency: CurrencySchema,
  currentMonth: MonthSchema,
  ...allocationContextFields
}).strict();
var GoalLifecyclePreviewWireSchema = z7.object({ lifecycle: GoalLifecycleActionSchema, allocations: z7.array(GoalLifecycleAllocationEntrySchema).optional() }).strict();
var ConfirmGoalLifecycleWireSchema = z7.object({
  lifecycle: GoalLifecycleActionSchema,
  allocations: z7.array(GoalLifecycleAllocationEntrySchema),
  previewToken: z7.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalStatusSchema = z7.enum(["active", "paused", "completed"]);
var GoalLifecyclePreviewSchema = z7.object({
  proposal: z7.object({
    lifecycle: GoalLifecycleActionSchema,
    goalId: z7.string(),
    nextStatus: GoalStatusSchema,
    transition: z7.object({ goalId: z7.string(), status: GoalStatusSchema }).strict(),
    pauseMonthlyCommitment: z7.boolean(),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: z7.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalLifecycleUpdatedSchema = z7.object({ status: z7.literal("updated") }).strict();
var GoalLifecycleStaleSchema = z7.object({ status: z7.literal("stale"), preview: GoalLifecyclePreviewSchema }).strict();
var GoalLifecycleConfirmationSchema = z7.discriminatedUnion("status", [GoalLifecycleUpdatedSchema, GoalLifecycleStaleSchema]);
var GoalCompletionContextSchema = z7.object({
  goalId: z7.string(),
  goalName: z7.string(),
  targetAmount: MoneySchema2,
  savingsValue: MoneySchema2,
  currentMonth: MonthSchema,
  savingsPlaces: z7.array(z7.object({ id: z7.string(), name: z7.string(), balance: MoneySchema2 }).strict()),
  ...allocationContextFields
}).strict();
var GoalCompletionContextPresentSchema = z7.object({ profile: z7.literal("present"), context: GoalCompletionContextSchema }).strict();
var GoalCompletionContextStateSchema = z7.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCompletionContextPresentSchema]);
var GoalCompletionPreviewWireSchema = z7.object({
  withdrawals: z7.array(z7.object({ placeId: z7.string(), amount: z7.string() }).strict()),
  allocations: z7.array(GoalLifecycleAllocationEntrySchema)
}).strict();
var ConfirmGoalCompletionWireSchema = z7.object({
  withdrawals: z7.array(z7.object({ placeId: z7.string(), amount: z7.string() }).strict()),
  allocations: z7.array(GoalLifecycleAllocationEntrySchema),
  previewToken: z7.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionPreviewSchema = z7.object({
  proposal: z7.object({
    goalId: z7.string(),
    goalName: z7.string(),
    targetAmount: MoneySchema2,
    withdrawals: z7.array(z7.object({ placeId: z7.string(), placeName: z7.string(), amount: MoneySchema2 }).strict()),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    pauseMonthlyCommitment: z7.boolean(),
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: z7.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionCompletedSchema = z7.object({ status: z7.literal("completed"), completedAt: z7.iso.datetime() }).strict();
var GoalCompletionStaleSchema = z7.object({ status: z7.literal("stale"), preview: GoalCompletionPreviewSchema }).strict();
var GoalCompletionInvalidSchema = z7.object({ status: z7.literal("invalid"), message: z7.string() }).strict();
var GoalCompletionConfirmationSchema = z7.discriminatedUnion("status", [GoalCompletionCompletedSchema, GoalCompletionStaleSchema, GoalCompletionInvalidSchema]);
var GoalPlanQueryWireSchema = z7.object({ goalId: z7.string().uuid().optional(), action: GoalLifecycleActionSchema.optional() }).refine((query) => query.action === void 0 || query.goalId !== void 0, { message: "Falta el objetivo de la acci\xF3n." });
var GoalIdPathWireSchema = z7.object({ id: z7.string().uuid() }).strict();
var GoalPlanEditContextWireSchema = z7.object({
  goalId: z7.string().uuid(),
  status: z7.enum(["active", "paused"]),
  draft: GoalCreationDraftSchema
}).strict();
var GoalPlanContextPresentSchema = z7.object({
  profile: z7.literal("present"),
  context: GoalCreationContextWireSchema,
  editContext: GoalPlanEditContextWireSchema.optional(),
  allocationContext: AllocationChangeContextSchema.optional(),
  lifecycleContext: GoalLifecycleContextSchema.optional()
}).strict();
var GoalPlanContextStateSchema = z7.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalPlanContextPresentSchema]);
var GoalEditConfirmWireSchema = z7.object({ draft: GoalCreationDraftSchema, previewToken: z7.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalEditUpdatedSchema = z7.object({ status: z7.literal("updated") }).strict();
var GoalEditStaleSchema = z7.object({ status: z7.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalEditConfirmationSchema = z7.discriminatedUnion("status", [GoalEditUpdatedSchema, GoalEditStaleSchema]);
var GoalsWorkspaceMissingSchema = z7.object({ profile: z7.literal("missing") }).strict();
var GoalsWorkspacePresentSchema = z7.object({ profile: z7.literal("present"), workspace: WorkspaceSchema }).strict();
var GoalsWorkspaceSchema = z7.discriminatedUnion("profile", [GoalsWorkspaceMissingSchema, GoalsWorkspacePresentSchema]);

// src/contribution.schema.ts
var MonthSchema2 = z8.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var PreviewTokenSchema = z8.string().regex(/^[a-f0-9]{64}$/, "Token de vista previa inv\xE1lido.");
var ContributionIdSchema = z8.string().uuid("ID de aporte inv\xE1lido.");
var CatchUpMonthSchema = z8.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes de regularizaci\xF3n inv\xE1lido.");
var SavingsPlaceSelectionWireSchema = z8.discriminatedUnion("kind", [
  z8.object({ kind: z8.literal("existing"), placeId: z8.string().uuid("Eleg\xED un lugar v\xE1lido.") }).strict(),
  z8.object({ kind: z8.literal("new"), name: z8.string().trim().min(1, "Escrib\xED un nombre para el lugar.").max(120) }).strict()
]);
var ContributionDraftWireBaseSchema = z8.object({
  kind: z8.enum(["saving", "investment"]).optional().default("saving"),
  currency: z8.enum(["ARS", "USD"]),
  amount: z8.string(),
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: z8.string().nullish(),
  effectiveRate: z8.string().nullish()
}).strict();
var SavingContributionDraftWireSchema = ContributionDraftWireBaseSchema.superRefine((data, ctx) => {
  if (data.kind === "saving" && !data.place) {
    ctx.addIssue({ code: "custom", message: "Eleg\xED un lugar para tu ahorro.", path: ["place"] });
  }
});
var ConfirmSavingContributionWireSchema = z8.object({
  draft: SavingContributionDraftWireSchema,
  previewToken: PreviewTokenSchema,
  catchUpMonth: CatchUpMonthSchema.optional()
}).strict();
var UpdateSavingContributionWireSchema = z8.object({
  draft: SavingContributionDraftWireSchema
}).strict();
var ContributionIdPathWireSchema = z8.object({ id: ContributionIdSchema }).strict();
var EligibleGoalSchema = z8.object({
  id: z8.string(),
  name: z8.string(),
  percentage: z8.union([z8.string(), z8.number()])
}).strict();
var InvestmentCurrencyStateSchema = z8.discriminatedUnion("status", [
  z8.object({ status: z8.literal("ready") }).strict(),
  z8.object({ status: z8.literal("incomplete"), reason: z8.literal("missing_investment_position") }).strict()
]);
var SavingContributionContextSchema = z8.object({
  currentMonth: MonthSchema2,
  eligibleGoals: z8.array(EligibleGoalSchema),
  eligibleGoalsUsd: z8.array(EligibleGoalSchema),
  eligibleInvestmentGoals: z8.array(EligibleGoalSchema).optional(),
  eligibleInvestmentGoalsUsd: z8.array(EligibleGoalSchema).optional(),
  monthlyTargetArs: MoneySchema2.nullish(),
  monthlyTargetUsd: MoneySchema2.nullish(),
  monthlyInvestmentTargetArs: MoneySchema2.nullish(),
  monthlyInvestmentTargetUsd: MoneySchema2.nullish(),
  places: z8.array(z8.object({ id: z8.string(), name: z8.string() }).strict()),
  investmentState: z8.object({ ars: InvestmentCurrencyStateSchema, usd: InvestmentCurrencyStateSchema }).strict()
}).strict();
var SavingContributionContextMissingSchema = z8.object({ profile: z8.literal("missing") }).strict();
var SavingContributionContextPresentSchema = z8.object({ profile: z8.literal("present"), context: SavingContributionContextSchema }).strict();
var SavingContributionContextStateSchema = z8.discriminatedUnion("profile", [
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema
]);
var SavingDraftResultSchema = z8.object({
  kind: z8.enum(["saving", "investment"]).optional(),
  currency: z8.enum(["ARS", "USD"]),
  amount: MoneySchema2,
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: MoneySchema2.optional(),
  effectiveRate: z8.string().optional()
}).strict();
var SavingAllocationPreviewSchema = z8.object({
  goalId: z8.string(),
  goalName: z8.string(),
  percentage: z8.string(),
  amount: MoneySchema2,
  progressBefore: z8.string().optional(),
  progressAfter: z8.string().optional(),
  projectionBefore: ProjectionSchema.optional(),
  projectionAfter: ProjectionSchema.optional()
}).strict();
var SavingContributionPreviewBodySchema = z8.object({
  draft: SavingDraftResultSchema,
  allocations: z8.array(SavingAllocationPreviewSchema)
}).strict();
var SavingContributionEditPreviewSchema = z8.object({
  preview: SavingContributionPreviewBodySchema
}).strict();
var SavingContributionPreviewSchema = z8.object({
  preview: SavingContributionPreviewBodySchema,
  previewToken: PreviewTokenSchema
}).strict();
var SavingContributionCreatedSchema = z8.object({ status: z8.literal("created"), contributionId: z8.string().uuid() }).strict();
var SavingContributionStaleSchema = z8.object({ status: z8.literal("stale"), preview: SavingContributionPreviewSchema }).strict();
var SavingContributionConfirmationSchema = z8.discriminatedUnion("status", [
  SavingContributionCreatedSchema,
  SavingContributionStaleSchema
]);
var SavingContributionUpdatedSchema = z8.object({ status: z8.literal("updated") }).strict();
var SavingContributionDeletedSchema = z8.object({ status: z8.literal("deleted") }).strict();

// src/finances.schema.ts
import { z as z9 } from "zod";
var IdSchema = z9.uuid();
var MonthSchema3 = z9.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var DateSchema2 = z9.iso.date();
var SourceSchema = z9.object({ id: IdSchema, name: z9.string(), normalizedName: z9.string() });
var IncomeSchema = z9.object({
  id: IdSchema,
  sourceKind: z9.string(),
  sourceId: IdSchema.nullable(),
  sourceName: z9.string(),
  concept: z9.string().nullable(),
  amount: z9.string(),
  currency: z9.enum(["ARS", "USD"]),
  recurring: z9.boolean(),
  effectiveMonth: DateSchema2,
  arsEquivalent: z9.string().nullable(),
  createdAt: z9.iso.datetime()
});
var ExpenseSchema = IncomeSchema.extend({ endMonth: DateSchema2.nullable() });
var MoneySchema3 = z9.object({ amount: z9.string(), currency: z9.literal("ARS") });
var MovementSchema = z9.discriminatedUnion("kind", [
  z9.object({ kind: z9.literal("contribution"), id: IdSchema, placeId: IdSchema, placeName: z9.string(), amount: z9.string(), currency: z9.enum(["ARS", "USD"]), createdAt: z9.iso.datetime() }),
  z9.object({ kind: z9.literal("completion"), id: IdSchema, goalId: IdSchema, goalName: z9.string(), placeId: IdSchema, placeName: z9.string(), amount: z9.string(), currency: z9.enum(["ARS", "USD"]), createdAt: z9.iso.datetime() }),
  z9.object({ kind: z9.literal("transfer"), id: IdSchema, fromPlaceId: IdSchema, fromPlaceName: z9.string(), toPlaceId: IdSchema, toPlaceName: z9.string(), amount: z9.string(), currency: z9.enum(["ARS", "USD"]), createdAt: z9.iso.datetime() })
]);
var FinancesWorkspaceSchema = z9.object({
  goalDedicationPercentage: z9.string(),
  month: MonthSchema3,
  summary: z9.object({ income: MoneySchema3, expenses: MoneySchema3, balance: MoneySchema3, contribution: MoneySchema3 }),
  incomes: z9.object({ sources: z9.array(SourceSchema), incomes: z9.array(IncomeSchema) }),
  expenses: z9.object({ sources: z9.array(SourceSchema), expenses: z9.array(ExpenseSchema) }),
  savings: z9.object({ places: z9.array(z9.object({ id: IdSchema, name: z9.string(), balances: z9.object({ ARS: z9.string(), USD: z9.string() }), hasMovements: z9.boolean() })), movements: z9.array(MovementSchema) })
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
import { z as z10 } from "zod";
var percentageSchema = z10.string().refine((value) => {
  const normalized = value.replace(",", ".");
  return /^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(normalized) && Number(normalized) <= 100;
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var onboardingGoalSchema = GoalCreationDraftWireSchema.extend({
  name: z10.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  allocations: z10.array(
    z10.object({ goalId: z10.string().min(1), percentage: percentageSchema }).strict()
  )
});
var FinancialOnboardingSchema = z10.object({
  goal: onboardingGoalSchema,
  incomes: z10.array(IncomeDraftSchema).min(1, "Agreg\xE1 al menos un ingreso recurrente."),
  expenses: z10.array(ExpenseDraftSchema).min(1, "Agreg\xE1 al menos un gasto recurrente.")
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
var FinancialOnboardingResponseSchema = z10.object({ created: z10.boolean() }).strict();

// src/home.schema.ts
import { z as z11 } from "zod";
var CurrencySchema2 = z11.enum(["ARS", "USD"]);
var MonthSchema4 = z11.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var MonthOrDateSchema = z11.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/);
var HomeQuerySchema = z11.object({
  currentMonth: MonthSchema4.optional()
}).strict();
var RoadmapIncomeSchema = z11.object({
  id: z11.string(),
  sourceKind: z11.string(),
  sourceId: z11.string().nullable(),
  sourceName: z11.string(),
  concept: z11.string().nullable(),
  amount: z11.string(),
  currency: CurrencySchema2,
  recurring: z11.boolean(),
  effectiveMonth: MonthOrDateSchema,
  arsEquivalent: z11.string().nullable().optional()
}).strict();
var RoadmapExpenseSchema = RoadmapIncomeSchema.extend({
  endMonth: MonthOrDateSchema.nullable()
}).strict();
var RoadmapFinancesSchema = z11.object({
  incomes: z11.object({
    sources: z11.array(z11.object({
      id: z11.string(),
      name: z11.string(),
      normalizedName: z11.string()
    }).strict()).optional(),
    incomes: z11.array(RoadmapIncomeSchema)
  }).strict(),
  expenses: z11.object({
    sources: z11.array(z11.object({
      id: z11.string(),
      name: z11.string(),
      normalizedName: z11.string()
    }).strict()).optional(),
    expenses: z11.array(RoadmapExpenseSchema)
  }).strict()
}).strict();
var RoadmapMonthSchema = z11.object({
  month: MonthSchema4,
  objectives: z11.array(GoalWorkspaceItemSchema),
  oneTimeExpenses: z11.array(RoadmapExpenseSchema),
  recurringExpenses: z11.array(RoadmapExpenseSchema),
  endingExpenses: z11.array(RoadmapExpenseSchema),
  oneTimeIncomes: z11.array(RoadmapIncomeSchema),
  recurringIncomes: z11.array(RoadmapIncomeSchema),
  contributions: z11.array(ContributionSummarySchema)
}).strict();
var RoadmapDataSchema = z11.object({
  undatedObjectives: z11.array(GoalWorkspaceItemSchema),
  futureMonths: z11.array(RoadmapMonthSchema),
  currentMonth: RoadmapMonthSchema,
  historyMonths: z11.array(RoadmapMonthSchema)
}).strict();
var HomeRoadmapMissingSchema = z11.object({
  profile: z11.literal("missing")
}).strict();
var HomeRoadmapPresentSchema = z11.object({
  profile: z11.literal("present").optional(),
  roadmap: RoadmapDataSchema,
  completionGoals: z11.array(GoalWorkspaceItemSchema)
}).strict();
var HomeRoadmapResponseSchema = z11.discriminatedUnion("profile", [
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema
]);

// src/goal-creation.schema.ts
import { parseMoneyInput } from "@repo/finance-utils";
import BigNumber2 from "bignumber.js";
import { z as z12 } from "zod";
var goalTypeSchema = z12.enum(["emergency_fund", "purchase", "retirement", "other"]);
var goalPrioritySchema = z12.enum(["high", "medium", "low"]);
var goalStrategySchema = z12.enum(["save", "invest"]);
var investmentAvailabilitySchema = z12.enum(["available_now", "available_from", "long_term"]);
var percentageSchema2 = z12.string().refine((value) => {
  try {
    const amount = new BigNumber2(value.replace(",", "."));
    const decimals = amount.decimalPlaces();
    return amount.isFinite() && amount.gte(0) && amount.lte(100) && decimals !== null && decimals <= 2;
  } catch {
    return false;
  }
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var allocationEntrySchema = z12.object({
  goalId: z12.string().min(1),
  percentage: percentageSchema2
});
var goalCreationDraftSchema = z12.object({
  type: goalTypeSchema,
  name: z12.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  targetAmount: z12.string(),
  currency: z12.enum(["ARS", "USD"]),
  desiredMonth: z12.string(),
  priority: goalPrioritySchema,
  strategy: goalStrategySchema,
  annualReturnRate: z12.string(),
  availability: investmentAvailabilitySchema,
  availableFromMonth: z12.string(),
  allocations: z12.array(allocationEntrySchema)
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
var goalImpactSchema = z12.object({
  allocations: z12.array(allocationEntrySchema).min(1)
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
function refineDraftAllocations(input, context) {
  const impactResult = goalImpactSchema.safeParse({ allocations: input.draft.allocations });
  if (!impactResult.success) {
    for (const issue of impactResult.error.issues) {
      context.addIssue({ code: "custom", message: issue.message, path: ["draft", ...issue.path] });
    }
  }
}
var confirmGoalCreationSchema = z12.object({
  draft: goalCreationDraftSchema,
  previewToken: z12.string().regex(/^[a-f0-9]{64}$/)
}).superRefine(refineDraftAllocations);
var goalEditRequestSchema = z12.object({
  goalId: z12.string().uuid()
});
var previewGoalEditSchema = z12.object({
  goalId: z12.string().uuid(),
  draft: goalCreationDraftSchema
});
var confirmGoalEditSchema = z12.object({
  goalId: z12.string().uuid(),
  draft: goalCreationDraftSchema,
  previewToken: z12.string().regex(/^[a-f0-9]{64}$/)
}).superRefine(refineDraftAllocations);
function parseGoalCreationSubmission(input, currentMonth) {
  const draft = goalCreationDraftSchema.parse(input);
  createObjectiveSchema(currentMonth).parse(draft);
  goalPlanSchema.parse(draft);
  if (draft.allocations && draft.allocations.length > 0) {
    goalImpactSchema.parse({ allocations: draft.allocations });
  }
  return draft;
}

// src/notification.schema.ts
import { z as z13 } from "zod";
var NOTIFICATION_TYPES = [
  "day_close_checkin",
  "savings_digest"
];
var NotificationTypeSchema = z13.enum(NOTIFICATION_TYPES);
var NotificationTimeSchema = z13.string().regex(
  /^([01]\d|2[0-3]):(00|30)$/,
  "Eleg\xED un horario en punto o y media (ej. 21:00 o 21:30)."
);
var NotificationSettingSchema = z13.object({
  type: NotificationTypeSchema,
  enabled: z13.boolean(),
  frequency: z13.literal("daily"),
  time: NotificationTimeSchema
});
var NotificationSettingsResponseSchema = z13.object({
  settings: z13.array(NotificationSettingSchema)
});
var UpdateNotificationSettingSchema = z13.object({
  enabled: z13.boolean().optional(),
  time: NotificationTimeSchema.optional()
}).refine((v) => v.enabled !== void 0 || v.time !== void 0, {
  message: "Indic\xE1 si activar/desactivar o el horario."
});

// src/benefits.schema.ts
import { z as z14 } from "zod";
var BENEFIT_CATEGORIES = [
  "supermercado",
  "combustible",
  "gastronomia",
  "cine",
  "farmacia",
  "indumentaria",
  "viajes",
  "tecnologia",
  "otros"
];
var BenefitCategorySchema = z14.enum(BENEFIT_CATEGORIES);
var BENEFIT_CATEGORY_LABELS = {
  supermercado: "Supermercado",
  combustible: "Combustible",
  gastronomia: "Gastronom\xEDa",
  cine: "Cine",
  farmacia: "Farmacia",
  indumentaria: "Indumentaria",
  viajes: "Viajes",
  tecnologia: "Tecnolog\xEDa",
  otros: "Otros"
};
var BENEFIT_KINDS = [
  "discount",
  "cashback",
  "installments",
  "nxm"
];
var BENEFIT_CAP_PERIODS = [
  "transaction",
  "day",
  "week",
  "month"
];
var PROVIDER_KINDS = [
  "bank",
  "network",
  "wallet",
  "membership"
];
var INSTRUMENT_TYPES = [
  "credit",
  "debit",
  "prepaid",
  "membership"
];
var CARD_NETWORKS = ["visa", "mastercard", "amex", "cabal"];
var CardNetworkSchema = z14.enum(CARD_NETWORKS);
var CARD_TYPES = ["credit", "debit", "prepaid"];
var MEMBERSHIP_USAGES = [
  "wallet_access",
  "account_access",
  "subscription",
  "loyalty"
];
var slug = z14.string().min(1).max(80);
var slugList = z14.array(slug).min(1).max(50);
var CardSelectorSchema = z14.object({
  instrumentSlugs: slugList.optional(),
  issuerProviderSlugs: slugList.optional(),
  excludedIssuerProviderSlugs: slugList.optional(),
  network: CardNetworkSchema.optional(),
  types: z14.array(z14.enum(CARD_TYPES)).min(1).optional(),
  productLevels: slugList.optional(),
  segments: slugList.optional(),
  issuerCountries: z14.array(z14.string().length(2)).min(1).optional()
}).strict().refine((s) => Object.values(s).some((v) => v !== void 0), {
  message: "CardSelector vac\xEDo"
});
var PROVIDER_FACT_KEYS = [
  "salaryAccount",
  "plan",
  "loyaltyLevel"
];
var REQUIREMENT_MAX_DEPTH = 5;
var REQUIREMENT_MAX_NODES = 50;
var RequirementNodeSchema = z14.lazy(
  () => z14.union([
    z14.object({ allOf: z14.array(RequirementNodeSchema).min(1) }).strict(),
    z14.object({ anyOf: z14.array(RequirementNodeSchema).min(1) }).strict(),
    z14.object({ card: CardSelectorSchema }).strict(),
    z14.object({ membership: z14.object({ instrumentSlug: slug }).strict() }).strict(),
    z14.object({
      providerFact: z14.object({
        providerSlug: slug,
        key: z14.enum(PROVIDER_FACT_KEYS),
        values: z14.array(z14.union([z14.string().min(1), z14.boolean()])).min(1)
      }).strict()
    }).strict()
  ])
);
function requirementShape(r, depth = 1) {
  const children = "allOf" in r ? r.allOf : "anyOf" in r ? r.anyOf : [];
  return children.reduce(
    (acc, child) => {
      const c = requirementShape(child, depth + 1);
      return {
        depth: Math.max(acc.depth, c.depth),
        nodes: acc.nodes + c.nodes
      };
    },
    { depth, nodes: 1 }
  );
}
var RequirementSchema = RequirementNodeSchema.refine((r) => {
  const { depth, nodes } = requirementShape(r);
  return depth <= REQUIREMENT_MAX_DEPTH && nodes <= REQUIREMENT_MAX_NODES;
}, "\xC1rbol de requisitos demasiado grande");
var isoDay = z14.iso.date();
var InstrumentFactsSchema = z14.object({
  segment: slug.optional(),
  productLevel: slug.optional(),
  issuerCountry: z14.string().length(2).optional(),
  membershipStatus: z14.enum(["active", "inactive", "unknown"]).optional(),
  membershipValidUntil: isoDay.optional()
}).strict();
var ProviderFactsSchema = z14.object({
  salaryAccount: z14.boolean().optional(),
  plan: slug.optional(),
  loyaltyLevel: slug.optional()
}).strict();
var BenefitProfileFactsSchema = z14.object({
  instrumentFacts: z14.record(slug, InstrumentFactsSchema).default({}),
  providerFacts: z14.record(slug, ProviderFactsSchema).default({})
});
var OFFER_TYPES = [
  "discount",
  "cashback",
  "installments",
  "points",
  "other"
];
var CAP_PERIODS = [
  "transaction",
  "day",
  "week",
  "month",
  "campaign"
];
var CAP_SCOPES = [
  "card",
  "account",
  "person",
  "bank",
  "promotion"
];
var TRI_STATE = ["yes", "no", "unknown"];
var BENEFIT_LIFECYCLE = [
  "draft",
  "needs_review",
  "published",
  "expired",
  "withdrawn"
];
var BenefitCapSchema = z14.object({
  amountMinor: z14.number().int().positive().nullable(),
  // null = cap exists, amount unknown
  period: z14.enum(CAP_PERIODS),
  scope: z14.enum(CAP_SCOPES).nullable(),
  sharedCapGroupId: slug.optional()
}).strict();
var BenefitRulesSchema = z14.object({
  eligibility: RequirementSchema,
  eligibilityCompleteness: z14.enum(["complete", "incomplete"]),
  unresolved: z14.array(z14.string().min(1)).default([]),
  offer: z14.discriminatedUnion("type", [
    z14.object({
      type: z14.literal("discount"),
      percentageBps: z14.number().int().min(1).max(1e4)
    }),
    z14.object({
      type: z14.literal("cashback"),
      percentageBps: z14.number().int().min(1).max(1e4)
    }),
    z14.object({
      type: z14.literal("installments"),
      installments: z14.number().int().min(2).max(60)
    }),
    z14.object({ type: z14.literal("points"), description: z14.string().min(1) }),
    z14.object({ type: z14.literal("other"), description: z14.string().min(1) })
  ]),
  currency: z14.literal("ARS"),
  // null = unknown minimum; 0 = no minimum.
  minimumSpendMinor: z14.number().int().nonnegative().nullable(),
  capState: z14.enum(["known", "none", "unknown"]),
  caps: z14.array(BenefitCapSchema).max(5),
  validity: z14.object({
    from: isoDay.nullable(),
    // inclusive, America/Argentina/Buenos_Aires
    to: isoDay.nullable(),
    // inclusive; null = unknown end, NOT unlimited
    weekdays: z14.array(z14.number().int().min(0).max(6)).min(1).nullable(),
    // 0=Sunday; null = every weekday
    monthDays: z14.array(z14.number().int().min(1).max(31)).min(1).nullable()
    // null = every day of month
  }).strict(),
  channels: z14.object({
    allowed: z14.array(slug).default([]),
    excluded: z14.array(slug).default([])
  }).strict(),
  requiredActions: z14.array(z14.string().min(1)).default([]),
  stackable: z14.enum(TRI_STATE),
  // ongoing = fixed membership perk; the digest only surfaces it on category match or right after declaring it.
  recurrence: z14.enum(["campaign", "ongoing"])
}).strict().superRefine((r, ctx) => {
  if (r.capState === "known" && !r.caps.length)
    ctx.addIssue({ code: "custom", message: "capState known requiere caps" });
  if (r.capState === "none" && r.caps.length)
    ctx.addIssue({ code: "custom", message: "capState none sin caps" });
  if (r.validity.from && r.validity.to && r.validity.from > r.validity.to)
    ctx.addIssue({ code: "custom", message: "vigencia invertida" });
});
var BenefitMatchSchema = z14.object({
  benefitId: z14.string(),
  eligibility: z14.enum(["eligible", "ineligible", "needs_information"]),
  availability: z14.enum(["available", "upcoming", "unavailable", "unknown"]),
  nextDate: isoDay.nullable(),
  stale: z14.boolean(),
  // Allowed channels are alternatives, not cumulative required actions.
  channels: z14.object({
    allowed: z14.array(z14.string()),
    excluded: z14.array(z14.string())
  }),
  matchedInstrumentSlugs: z14.array(z14.string()),
  missingFacts: z14.array(z14.string()),
  reasons: z14.array(z14.string()),
  requiredActions: z14.array(z14.string()),
  estimatedSavingMinor: z14.number().int().nonnegative().nullable(),
  estimateAssumptions: z14.array(z14.string())
});
var BenefitCatalogResponseSchema = z14.object({
  providers: z14.array(
    z14.object({
      slug: z14.string(),
      name: z14.string(),
      kind: z14.enum(PROVIDER_KINDS),
      coverage: z14.enum(["active", "partial", "pending"]),
      instruments: z14.array(
        z14.object({
          slug: z14.string(),
          label: z14.string(),
          network: z14.enum(CARD_NETWORKS).nullable(),
          type: z14.enum(INSTRUMENT_TYPES),
          tier: z14.string().nullable(),
          issuerProviderSlug: z14.string().nullable(),
          segment: z14.string().nullable(),
          productLevel: z14.string().nullable(),
          usage: z14.enum(MEMBERSHIP_USAGES).nullable()
        })
      )
    })
  ),
  categories: z14.array(
    z14.object({ slug: BenefitCategorySchema, label: z14.string() })
  )
});
var UpdateBenefitPreferencesSchema = z14.object({
  instrumentFacts: BenefitProfileFactsSchema.shape.instrumentFacts.removeDefault().optional(),
  providerFacts: BenefitProfileFactsSchema.shape.providerFacts.removeDefault().optional(),
  instrumentSlugs: z14.array(z14.string().min(1)).min(1, "Eleg\xED al menos una tarjeta, cuenta o membres\xEDa.").max(100),
  categories: z14.array(BenefitCategorySchema).min(1, "Eleg\xED al menos una categor\xEDa.")
});
var BenefitPreferencesSchema = z14.object({
  ...BenefitProfileFactsSchema.shape,
  instrumentSlugs: z14.array(z14.string()),
  categories: z14.array(BenefitCategorySchema),
  enabled: z14.boolean()
});
export {
  AllocationChangeConfirmationSchema,
  AllocationChangeContextSchema,
  AllocationChangeContextStateSchema,
  AllocationChangeDraftWireSchema,
  AllocationChangePreviewSchema,
  AllocationChangeStaleSchema,
  AllocationChangeUpdatedSchema,
  BENEFIT_CAP_PERIODS,
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_KINDS,
  BENEFIT_LIFECYCLE,
  BenefitCapSchema,
  BenefitCatalogResponseSchema,
  BenefitCategorySchema,
  BenefitMatchSchema,
  BenefitPreferencesSchema,
  BenefitProfileFactsSchema,
  BenefitRulesSchema,
  CAP_PERIODS,
  CAP_SCOPES,
  CARD_NETWORKS,
  CARD_TYPES,
  CardNetworkSchema,
  CardSelectorSchema,
  ConfirmAllocationChangeWireSchema,
  ConfirmGoalCompletionWireSchema,
  ConfirmGoalCreationWireSchema,
  ConfirmGoalLifecycleWireSchema,
  ConfirmSavingContributionWireSchema,
  ContributionDraftWireBaseSchema,
  ContributionIdPathWireSchema,
  ContributionSummarySchema,
  CreatePlaceholderItemSchema,
  CreateSavingsPlaceSchema,
  DeletePlaceholderItemResponseSchema,
  ExpenseDraftSchema,
  ExpenseMutationResponseSchema,
  FIXED_EXPENSE_SOURCES,
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
  INSTRUMENT_TYPES,
  IncomeDraftSchema,
  IncomeMutationResponseSchema,
  InitialHomeStateSchema,
  InstrumentFactsSchema,
  MEMBERSHIP_USAGES,
  NOTIFICATION_TYPES,
  NotificationSettingSchema,
  NotificationSettingsResponseSchema,
  NotificationTimeSchema,
  NotificationTypeSchema,
  OFFER_TYPES,
  ONE_TIME_EXPENSE_SOURCES,
  PROVIDER_FACT_KEYS,
  PROVIDER_KINDS,
  PlaceholderItemListSchema,
  PlaceholderItemSchema,
  PlaceholderStatusSchema,
  ProfileResponseSchema,
  ProviderFactsSchema,
  RECURRING_EXPENSE_SOURCES,
  REQUIREMENT_MAX_DEPTH,
  REQUIREMENT_MAX_NODES,
  RenameSavingsPlaceSchema,
  RequirementSchema,
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
  TRI_STATE,
  UpdateBenefitPreferencesSchema,
  UpdateNotificationSettingSchema,
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
