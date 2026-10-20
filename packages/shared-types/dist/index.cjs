"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AllocationChangeConfirmationSchema: () => AllocationChangeConfirmationSchema,
  AllocationChangeContextSchema: () => AllocationChangeContextSchema,
  AllocationChangeContextStateSchema: () => AllocationChangeContextStateSchema,
  AllocationChangeDraftWireSchema: () => AllocationChangeDraftWireSchema,
  AllocationChangePreviewSchema: () => AllocationChangePreviewSchema,
  AllocationChangeStaleSchema: () => AllocationChangeStaleSchema,
  AllocationChangeUpdatedSchema: () => AllocationChangeUpdatedSchema,
  ConfirmAllocationChangeWireSchema: () => ConfirmAllocationChangeWireSchema,
  ConfirmGoalCompletionWireSchema: () => ConfirmGoalCompletionWireSchema,
  ConfirmGoalCreationWireSchema: () => ConfirmGoalCreationWireSchema,
  ConfirmGoalLifecycleWireSchema: () => ConfirmGoalLifecycleWireSchema,
  ConfirmSavingContributionWireSchema: () => ConfirmSavingContributionWireSchema,
  ContributionIdPathWireSchema: () => ContributionIdPathWireSchema,
  ContributionSummarySchema: () => ContributionSummarySchema,
  CreatePlaceholderItemSchema: () => CreatePlaceholderItemSchema,
  CreateSavingsPlaceSchema: () => CreateSavingsPlaceSchema,
  DeletePlaceholderItemResponseSchema: () => DeletePlaceholderItemResponseSchema,
  ExpenseDraftSchema: () => ExpenseDraftSchema,
  ExpenseMutationResponseSchema: () => ExpenseMutationResponseSchema,
  FIXED_INCOME_SOURCES: () => FIXED_INCOME_SOURCES,
  FinancesWorkspaceSchema: () => FinancesWorkspaceSchema,
  FinancialOnboardingResponseSchema: () => FinancialOnboardingResponseSchema,
  FinancialOnboardingSchema: () => FinancialOnboardingSchema,
  GoalCompletionCompletedSchema: () => GoalCompletionCompletedSchema,
  GoalCompletionConfirmationSchema: () => GoalCompletionConfirmationSchema,
  GoalCompletionContextPresentSchema: () => GoalCompletionContextPresentSchema,
  GoalCompletionContextSchema: () => GoalCompletionContextSchema,
  GoalCompletionContextStateSchema: () => GoalCompletionContextStateSchema,
  GoalCompletionInvalidSchema: () => GoalCompletionInvalidSchema,
  GoalCompletionPreviewSchema: () => GoalCompletionPreviewSchema,
  GoalCompletionPreviewWireSchema: () => GoalCompletionPreviewWireSchema,
  GoalCompletionStaleSchema: () => GoalCompletionStaleSchema,
  GoalCreationConfirmationSchema: () => GoalCreationConfirmationSchema,
  GoalCreationContextMissingSchema: () => GoalCreationContextMissingSchema,
  GoalCreationContextPresentSchema: () => GoalCreationContextPresentSchema,
  GoalCreationContextStateSchema: () => GoalCreationContextStateSchema,
  GoalCreationContextWireSchema: () => GoalCreationContextWireSchema,
  GoalCreationCreatedSchema: () => GoalCreationCreatedSchema,
  GoalCreationDraftWireSchema: () => GoalCreationDraftWireSchema,
  GoalCreationPreviewSchema: () => GoalCreationPreviewSchema,
  GoalCreationStaleSchema: () => GoalCreationStaleSchema,
  GoalEditConfirmWireSchema: () => GoalEditConfirmWireSchema,
  GoalEditConfirmationSchema: () => GoalEditConfirmationSchema,
  GoalEditStaleSchema: () => GoalEditStaleSchema,
  GoalEditUpdatedSchema: () => GoalEditUpdatedSchema,
  GoalIdPathWireSchema: () => GoalIdPathWireSchema,
  GoalLifecycleActionSchema: () => GoalLifecycleActionSchema,
  GoalLifecycleConfirmationSchema: () => GoalLifecycleConfirmationSchema,
  GoalLifecycleContextSchema: () => GoalLifecycleContextSchema,
  GoalLifecyclePreviewSchema: () => GoalLifecyclePreviewSchema,
  GoalLifecyclePreviewWireSchema: () => GoalLifecyclePreviewWireSchema,
  GoalLifecycleStaleSchema: () => GoalLifecycleStaleSchema,
  GoalLifecycleUpdatedSchema: () => GoalLifecycleUpdatedSchema,
  GoalPlanContextPresentSchema: () => GoalPlanContextPresentSchema,
  GoalPlanContextStateSchema: () => GoalPlanContextStateSchema,
  GoalPlanEditContextWireSchema: () => GoalPlanEditContextWireSchema,
  GoalPlanQueryWireSchema: () => GoalPlanQueryWireSchema,
  GoalWorkspaceItemSchema: () => GoalWorkspaceItemSchema,
  GoalsWorkspaceMissingSchema: () => GoalsWorkspaceMissingSchema,
  GoalsWorkspacePresentSchema: () => GoalsWorkspacePresentSchema,
  GoalsWorkspaceSchema: () => GoalsWorkspaceSchema,
  HomeQuerySchema: () => HomeQuerySchema,
  HomeRoadmapMissingSchema: () => HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema: () => HomeRoadmapPresentSchema,
  HomeRoadmapResponseSchema: () => HomeRoadmapResponseSchema,
  IncomeDraftSchema: () => IncomeDraftSchema,
  IncomeMutationResponseSchema: () => IncomeMutationResponseSchema,
  InitialHomeStateSchema: () => InitialHomeStateSchema,
  PlaceholderItemListSchema: () => PlaceholderItemListSchema,
  PlaceholderItemSchema: () => PlaceholderItemSchema,
  PlaceholderStatusSchema: () => PlaceholderStatusSchema,
  ProfileResponseSchema: () => ProfileResponseSchema,
  RenameSavingsPlaceSchema: () => RenameSavingsPlaceSchema,
  RoadmapDataSchema: () => RoadmapDataSchema,
  RoadmapExpenseSchema: () => RoadmapExpenseSchema,
  RoadmapFinancesSchema: () => RoadmapFinancesSchema,
  RoadmapIncomeSchema: () => RoadmapIncomeSchema,
  RoadmapMonthSchema: () => RoadmapMonthSchema,
  SavingContributionConfirmationSchema: () => SavingContributionConfirmationSchema,
  SavingContributionContextMissingSchema: () => SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema: () => SavingContributionContextPresentSchema,
  SavingContributionContextSchema: () => SavingContributionContextSchema,
  SavingContributionContextStateSchema: () => SavingContributionContextStateSchema,
  SavingContributionCreatedSchema: () => SavingContributionCreatedSchema,
  SavingContributionDeletedSchema: () => SavingContributionDeletedSchema,
  SavingContributionDraftWireSchema: () => SavingContributionDraftWireSchema,
  SavingContributionEditPreviewSchema: () => SavingContributionEditPreviewSchema,
  SavingContributionPreviewSchema: () => SavingContributionPreviewSchema,
  SavingContributionStaleSchema: () => SavingContributionStaleSchema,
  SavingContributionUpdatedSchema: () => SavingContributionUpdatedSchema,
  SavingsPlaceIdParamsSchema: () => SavingsPlaceIdParamsSchema,
  SavingsPlaceMutationResponseSchema: () => SavingsPlaceMutationResponseSchema,
  SavingsTransferResponseSchema: () => SavingsTransferResponseSchema,
  SavingsTransferSchema: () => SavingsTransferSchema,
  UpdatePlaceholderItemSchema: () => UpdatePlaceholderItemSchema,
  UpdateSavingContributionWireSchema: () => UpdateSavingContributionWireSchema,
  deriveUsdPurchase: () => deriveUsdPurchase,
  isExpenseIncludedInMonth: () => isExpenseIncludedInMonth,
  isIncomeIncludedInMonth: () => isIncomeIncludedInMonth
});
module.exports = __toCommonJS(index_exports);

// src/placeholder.schema.ts
var import_zod = require("zod");
var PlaceholderStatusSchema = import_zod.z.enum(["todo", "in-progress", "done"]);
var PlaceholderItemSchema = import_zod.z.object({
  id: import_zod.z.uuid(),
  title: import_zod.z.string().min(1, "Title is required"),
  description: import_zod.z.string(),
  status: PlaceholderStatusSchema,
  createdAt: import_zod.z.iso.datetime(),
  updatedAt: import_zod.z.iso.datetime()
});
var PlaceholderItemListSchema = import_zod.z.array(PlaceholderItemSchema);
var CreatePlaceholderItemSchema = import_zod.z.object({
  title: import_zod.z.string().min(1, "Title is required").max(200),
  description: import_zod.z.string().optional().default("")
});
var UpdatePlaceholderItemSchema = import_zod.z.object({
  title: import_zod.z.string().min(1, "Title is required").max(200).optional(),
  description: import_zod.z.string().optional(),
  status: PlaceholderStatusSchema.optional()
});
var DeletePlaceholderItemResponseSchema = import_zod.z.object({
  success: import_zod.z.boolean()
});

// src/profile.schema.ts
var import_zod2 = require("zod");
var MoneySchema = import_zod2.z.object({
  amount: import_zod2.z.string(),
  currency: import_zod2.z.enum(["ARS", "USD"])
});
var PreviousMonthShortfallSchema = import_zod2.z.object({
  kind: import_zod2.z.enum(["saving", "investment"]),
  currency: import_zod2.z.enum(["ARS", "USD"]),
  amount: MoneySchema
});
var InitialHomeStateSchema = import_zod2.z.object({
  income: MoneySchema,
  expensesKnowledge: import_zod2.z.enum(["known", "unknown"]),
  expenses: MoneySchema.optional(),
  plan: import_zod2.z.object({
    fundingMethod: import_zod2.z.enum(["save", "invest"]),
    destinationCurrency: import_zod2.z.enum(["ARS", "USD"]),
    monthlyCommitment: MoneySchema,
    destinationAmount: MoneySchema,
    effectiveMonth: import_zod2.z.string(),
    allocationPercentage: import_zod2.z.string()
  }),
  goal: import_zod2.z.object({
    type: import_zod2.z.string(),
    name: import_zod2.z.string(),
    targetAmount: MoneySchema.optional(),
    currentAmount: MoneySchema,
    emergencyFundMonths: import_zod2.z.number().optional()
  }),
  previousMonthShortfalls: import_zod2.z.array(PreviousMonthShortfallSchema)
});
var ProfileResponseSchema = import_zod2.z.object({
  profile: import_zod2.z.enum(["missing", "present"]),
  home: InitialHomeStateSchema.optional()
}).refine(
  (value) => value.profile === "present" === (value.home !== void 0)
);

// src/income.schema.ts
var import_zod3 = require("zod");
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
var amountSchema = import_zod3.z.string().refine((amount) => {
  const clean = amount.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  if (!clean) return false;
  const normalized = clean.includes(",") && clean.includes(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.includes(",") ? clean.replace(",", ".") : clean.includes(".") && (clean.split(".").length > 2 || clean.split(".")[1].length === 3) ? clean.replace(/\./g, "") : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingres\xE1 un monto mayor a cero.");
var conceptSchema = import_zod3.z.string().trim().max(120, "M\xE1ximo 120 caracteres.").nullish().transform((value) => value || null);
var sourceSchema = import_zod3.z.union(
  [
    import_zod3.z.object({
      kind: import_zod3.z.enum(
        Object.keys(FIXED_INCOME_SOURCES)
      )
    }),
    import_zod3.z.object({ kind: import_zod3.z.literal("custom"), sourceId: import_zod3.z.string().uuid() }),
    import_zod3.z.object({
      kind: import_zod3.z.literal("custom"),
      name: import_zod3.z.string().trim().min(1, "Ingres\xE1 una categor\xEDa.").max(120, "M\xE1ximo 120 caracteres.")
    })
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var IncomeDraftSchema = import_zod3.z.object({
  concept: conceptSchema,
  source: sourceSchema,
  amount: amountSchema,
  currency: import_zod3.z.enum(["ARS", "USD"]),
  recurring: import_zod3.z.boolean(),
  effectiveMonth: import_zod3.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingres\xE1 un mes v\xE1lido.")
});
var IncomeMutationResponseSchema = import_zod3.z.object({
  id: import_zod3.z.string().uuid(),
  userId: import_zod3.z.string(),
  sourceKind: import_zod3.z.string(),
  sourceId: import_zod3.z.string().uuid().nullable(),
  concept: import_zod3.z.string().nullable(),
  amount: import_zod3.z.string(),
  currency: import_zod3.z.enum(["ARS", "USD"]),
  recurring: import_zod3.z.boolean(),
  effectiveMonth: import_zod3.z.string(),
  createdAt: import_zod3.z.iso.datetime(),
  updatedAt: import_zod3.z.iso.datetime()
});

// src/expense.schema.ts
var import_zod4 = require("zod");
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
var sourceSchema2 = import_zod4.z.union(
  [
    import_zod4.z.object({ kind: import_zod4.z.enum(fixedExpenseSources) }),
    import_zod4.z.object({ kind: import_zod4.z.literal("custom"), sourceId: import_zod4.z.string().uuid() }),
    import_zod4.z.object({
      kind: import_zod4.z.literal("custom"),
      name: import_zod4.z.string().trim().min(1, "Ingres\xE1 una categor\xEDa.").max(120, "M\xE1ximo 120 caracteres.")
    })
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var amountSchema2 = import_zod4.z.string().refine((input) => {
  const clean = input.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  const normalized = clean.includes(",") && clean.includes(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.includes(",") ? clean.replace(",", ".") : clean.includes(".") && (clean.split(".").length > 2 || clean.split(".")[1].length === 3) ? clean.replace(/\./g, "") : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingres\xE1 un monto mayor a cero.");
var ExpenseDraftSchema = import_zod4.z.object({
  concept: import_zod4.z.string().trim().max(120, "M\xE1ximo 120 caracteres.").nullish().transform((value) => value || null),
  source: sourceSchema2,
  amount: amountSchema2,
  currency: import_zod4.z.enum(["ARS", "USD"]),
  recurring: import_zod4.z.boolean()
});
var ExpenseMutationResponseSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  sourceKind: import_zod4.z.string(),
  sourceId: import_zod4.z.string().uuid().nullable(),
  concept: import_zod4.z.string().nullable(),
  amount: import_zod4.z.string(),
  currency: import_zod4.z.enum(["ARS", "USD"]),
  recurring: import_zod4.z.boolean(),
  effectiveMonth: import_zod4.z.iso.date(),
  endMonth: import_zod4.z.iso.date().nullable()
});

// src/savings-place.schema.ts
var import_zod5 = require("zod");
var SavingsPlaceNameSchema = import_zod5.z.string().trim().min(1).max(120);
var CreateSavingsPlaceSchema = import_zod5.z.object({ name: SavingsPlaceNameSchema });
var RenameSavingsPlaceSchema = import_zod5.z.object({ name: SavingsPlaceNameSchema });
var SavingsPlaceIdParamsSchema = import_zod5.z.object({ id: import_zod5.z.string().uuid() });
var SavingsTransferSchema = import_zod5.z.object({
  fromPlaceId: import_zod5.z.string().uuid(),
  toPlaceId: import_zod5.z.string().uuid(),
  currency: import_zod5.z.enum(["ARS", "USD"]),
  amount: import_zod5.z.string().min(1)
}).refine((value) => value.fromPlaceId !== value.toPlaceId, { message: "El origen y el destino deben ser distintos." });
var SavingsPlaceMutationResponseSchema = import_zod5.z.object({ placeId: import_zod5.z.string().uuid() });
var SavingsTransferResponseSchema = import_zod5.z.object({ transferId: import_zod5.z.string().uuid() });

// src/usd-purchase.ts
var import_bignumber = __toESM(require("bignumber.js"), 1);
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
    const parsed = new import_bignumber.default(normalized);
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
  return { effectiveRate: ars.dividedBy(usd).toFixed(2, import_bignumber.default.ROUND_HALF_UP) };
}
function deriveArsSpent(usd, rate) {
  return { arsSpent: usd.times(rate).toFixed(2, import_bignumber.default.ROUND_HALF_UP) };
}
function deriveUsdAmount(ars, rate) {
  return { usdAmount: ars.dividedBy(rate).toFixed(2, import_bignumber.default.ROUND_HALF_UP) };
}
function deriveTwoUsdPurchaseValues(values) {
  const { usd, ars, rate } = values;
  if (hasUsdPurchasePair(usd, ars)) return deriveUsdRate(usd.value, ars.value);
  if (hasUsdPurchasePair(usd, rate)) return deriveArsSpent(usd.value, rate.value);
  if (hasUsdPurchasePair(ars, rate)) return deriveUsdAmount(ars.value, rate.value);
  return null;
}
function hasIncoherentUsdPurchase(ars, expectedArs) {
  const roundedExpected = expectedArs.toFixed(2, import_bignumber.default.ROUND_HALF_UP);
  const roundedActual = ars.toFixed(2, import_bignumber.default.ROUND_HALF_UP);
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
    usdAmount: usdValue.toFixed(2, import_bignumber.default.ROUND_HALF_UP),
    arsSpent: arsValue.toFixed(2, import_bignumber.default.ROUND_HALF_UP),
    effectiveRate: rateValue.toFixed(2, import_bignumber.default.ROUND_HALF_UP)
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
var import_zod7 = require("zod");

// src/goals.schema.ts
var import_zod6 = require("zod");
var CurrencySchema = import_zod6.z.enum(["ARS", "USD"]);
var MoneySchema2 = import_zod6.z.object({ amount: import_zod6.z.string(), currency: CurrencySchema }).strict();
var DateSchema = import_zod6.z.iso.date();
var MonthSchema = import_zod6.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var ContributionSummarySchema = import_zod6.z.object({
  id: import_zod6.z.string(),
  kind: import_zod6.z.enum(["saving", "investment"]),
  userId: import_zod6.z.string().optional(),
  amount: import_zod6.z.string(),
  currency: CurrencySchema,
  placeId: import_zod6.z.string().optional(),
  placeName: import_zod6.z.string().optional(),
  arsSpent: import_zod6.z.string().nullable().optional(),
  effectiveRate: import_zod6.z.string().nullable().optional(),
  createdAt: import_zod6.z.iso.datetime(),
  allocations: import_zod6.z.array(import_zod6.z.object({ goalId: import_zod6.z.string(), goalName: import_zod6.z.string(), amount: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict())
}).strict();
var ContributionSchema = ContributionSummarySchema;
var ProjectionSchema = import_zod6.z.discriminatedUnion("status", [
  import_zod6.z.object({ status: import_zod6.z.literal("available"), completionMonth: MonthSchema }).strict(),
  ...["target_unavailable", "no_future_allocation", "commitment_absent", "plan_paused", "investment_assumption_unavailable", "outside_horizon"].map((status) => import_zod6.z.object({ status: import_zod6.z.literal(status) }).strict())
]);
var GoalWorkspaceItemSchema = import_zod6.z.object({
  id: import_zod6.z.string(),
  name: import_zod6.z.string(),
  type: import_zod6.z.string(),
  currency: CurrencySchema,
  priority: import_zod6.z.enum(["high", "medium", "low"]),
  strategy: import_zod6.z.enum(["save", "invest"]),
  status: import_zod6.z.enum(["active", "paused", "completed"]),
  createdAt: import_zod6.z.iso.datetime(),
  desiredDate: DateSchema.optional(),
  completedAt: import_zod6.z.iso.datetime().optional(),
  targetAmount: MoneySchema2.optional(),
  savingsValue: MoneySchema2,
  investmentValue: MoneySchema2,
  actualValue: MoneySchema2,
  progressPercentage: import_zod6.z.string().optional(),
  funding: import_zod6.z.array(import_zod6.z.object({ percentage: import_zod6.z.string(), monthlyContribution: MoneySchema2.optional(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), effectiveMonth: DateSchema }).strict()),
  projection: ProjectionSchema,
  desiredDateDeltaMonths: import_zod6.z.number().optional(),
  annualReturnRate: import_zod6.z.string().optional(),
  availability: import_zod6.z.enum(["available_now", "available_from", "long_term"]).optional(),
  availableFrom: DateSchema.optional(),
  usesPlanningRate: import_zod6.z.boolean(),
  completionEligible: import_zod6.z.boolean(),
  completionWithdrawals: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), placeId: import_zod6.z.string(), placeName: import_zod6.z.string(), amount: MoneySchema2, createdAt: import_zod6.z.iso.datetime() }).strict()).optional(),
  contributions: import_zod6.z.array(ContributionSchema).optional(),
  savingContributions: import_zod6.z.array(ContributionSchema).optional()
}).strict();
var GoalSchema = GoalWorkspaceItemSchema;
var FinancialSummarySchema = import_zod6.z.object({ month: MonthSchema, income: MoneySchema2, expenses: MoneySchema2, balance: MoneySchema2, dedicationPercentage: import_zod6.z.string(), contribution: MoneySchema2 }).strict();
var WorkspaceSchema = import_zod6.z.object({ financialSummary: FinancialSummarySchema, groups: import_zod6.z.array(import_zod6.z.object({ status: import_zod6.z.enum(["active", "paused", "completed"]), goals: import_zod6.z.array(GoalSchema) }).strict()) }).strict();
var GoalCreationDraftSchema = import_zod6.z.object({
  type: import_zod6.z.enum(["emergency_fund", "purchase", "retirement", "other"]),
  name: import_zod6.z.string(),
  targetAmount: import_zod6.z.string(),
  currency: CurrencySchema,
  desiredMonth: import_zod6.z.string(),
  priority: import_zod6.z.enum(["high", "medium", "low"]),
  strategy: import_zod6.z.enum(["save", "invest"]),
  annualReturnRate: import_zod6.z.string(),
  availability: import_zod6.z.enum(["available_now", "available_from", "long_term"]),
  availableFromMonth: import_zod6.z.string(),
  allocations: import_zod6.z.array(import_zod6.z.object({ goalId: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict())
}).strict();
var GoalProjectionSchema = ProjectionSchema;
var AllocationEntrySchema = import_zod6.z.object({ goalId: import_zod6.z.string(), goalName: import_zod6.z.string(), percentage: import_zod6.z.string(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), pending: import_zod6.z.boolean() }).strict();
var ProposalSourceSchema = import_zod6.z.object({
  profile: import_zod6.z.object({ userId: import_zod6.z.string(), baseCurrency: CurrencySchema, expensesKnowledge: import_zod6.z.string(), plannedMonthlyContribution: import_zod6.z.string().nullable().optional(), goalDedicationPercentage: import_zod6.z.string().optional(), onboardingCompleted: import_zod6.z.boolean() }).strict().nullable().optional(),
  goals: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), userId: import_zod6.z.string().nullable().optional(), name: import_zod6.z.string(), type: import_zod6.z.string(), targetAmount: import_zod6.z.string().nullable().optional(), currency: CurrencySchema, priority: import_zod6.z.enum(["high", "medium", "low"]), strategy: import_zod6.z.enum(["save", "invest"]), status: import_zod6.z.enum(["active", "paused", "completed"]), desiredDate: import_zod6.z.string().nullable().optional(), completedAt: import_zod6.z.string().nullable().optional(), emergencyFundMonths: import_zod6.z.number().nullable().optional(), createdAt: import_zod6.z.string() }).strict()),
  savingsPositions: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), goalId: import_zod6.z.string(), amount: import_zod6.z.string(), currency: CurrencySchema, location: import_zod6.z.string().nullable().optional() }).strict()),
  investmentPositions: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), goalId: import_zod6.z.string(), currentValue: import_zod6.z.string(), currency: CurrencySchema, annualReturnRate: import_zod6.z.string().nullable().optional(), availability: import_zod6.z.enum(["available_now", "available_from", "long_term"]).nullable().optional(), availableFrom: import_zod6.z.string().nullable().optional() }).strict()),
  snapshots: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), userId: import_zod6.z.string().nullable().optional(), effectiveMonth: import_zod6.z.string() }).strict()),
  allocations: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), snapshotId: import_zod6.z.string(), goalId: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict()),
  contributions: import_zod6.z.array(ContributionSchema).optional(),
  savingContributions: import_zod6.z.array(ContributionSchema).optional(),
  incomes: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), sourceKind: import_zod6.z.string(), sourceId: import_zod6.z.string().nullable(), sourceName: import_zod6.z.string().nullable(), concept: import_zod6.z.string().nullable(), amount: import_zod6.z.string(), currency: CurrencySchema, recurring: import_zod6.z.boolean(), effectiveMonth: import_zod6.z.string() }).strict()).optional(),
  expenses: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), sourceKind: import_zod6.z.string(), sourceId: import_zod6.z.string().nullable(), sourceName: import_zod6.z.string().nullable(), concept: import_zod6.z.string().nullable(), amount: import_zod6.z.string(), currency: CurrencySchema, recurring: import_zod6.z.boolean(), effectiveMonth: import_zod6.z.string(), endMonth: import_zod6.z.string().nullable() }).strict()).optional(),
  completionWithdrawals: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), goalId: import_zod6.z.string(), placeId: import_zod6.z.string(), placeName: import_zod6.z.string(), amount: import_zod6.z.string(), currency: CurrencySchema, createdAt: import_zod6.z.string() }).strict()).optional()
}).strict();
var GoalCreationProposalSchema = import_zod6.z.object({
  normalizedGoal: import_zod6.z.object({ name: import_zod6.z.string(), type: import_zod6.z.enum(["emergency_fund", "purchase", "retirement", "other"]), targetAmount: MoneySchema2.optional(), currency: CurrencySchema, priority: import_zod6.z.enum(["high", "medium", "low"]), strategy: import_zod6.z.enum(["save", "invest"]), desiredDate: DateSchema.optional(), emergencyFundMonths: import_zod6.z.number().optional() }).strict(),
  investment: import_zod6.z.object({ annualReturnRate: import_zod6.z.string(), availability: import_zod6.z.enum(["available_now", "available_from", "long_term"]), availableFrom: DateSchema.optional() }).strict().optional(),
  allocation: import_zod6.z.object({ monthlyContribution: MoneySchema2.optional(), effectiveMonth: import_zod6.z.string(), entries: import_zod6.z.array(AllocationEntrySchema), totalPercentage: import_zod6.z.string() }).strict(),
  impacts: import_zod6.z.array(import_zod6.z.object({ goalId: import_zod6.z.string(), goalName: import_zod6.z.string(), before: import_zod6.z.discriminatedUnion("status", [import_zod6.z.object({ status: import_zod6.z.literal("not_created") }).strict(), import_zod6.z.object({ status: import_zod6.z.literal("existing"), projection: GoalProjectionSchema, allocatedMonthlyAmounts: import_zod6.z.array(MoneySchema2) }).strict()]), after: GoalProjectionSchema }).strict()),
  proposedSource: ProposalSourceSchema
}).strict();
var GoalCreationDraftWireSchema = GoalCreationDraftSchema;
var ConfirmGoalCreationWireSchema = import_zod6.z.object({ draft: GoalCreationDraftSchema, previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationContextWireSchema = import_zod6.z.object({ currentMonth: MonthSchema, expensesKnowledge: import_zod6.z.enum(["known", "unknown"]), hasEmergencyFund: import_zod6.z.boolean(), plannedMonthlyContribution: MoneySchema2.optional(), currentAllocation: import_zod6.z.object({ effectiveMonth: import_zod6.z.string(), entries: import_zod6.z.array(import_zod6.z.object({ goalId: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict()) }).strict().optional() }).strict();
var GoalCreationContextMissingSchema = import_zod6.z.object({ profile: import_zod6.z.literal("missing") }).strict();
var GoalCreationContextPresentSchema = import_zod6.z.object({ profile: import_zod6.z.literal("present"), context: GoalCreationContextWireSchema }).strict();
var GoalCreationContextStateSchema = import_zod6.z.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCreationContextPresentSchema]);
var GoalCreationPreviewSchema = import_zod6.z.object({ proposal: GoalCreationProposalSchema, previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationCreatedSchema = import_zod6.z.object({ status: import_zod6.z.literal("created"), goalId: import_zod6.z.string() }).strict();
var GoalCreationStaleSchema = import_zod6.z.object({ status: import_zod6.z.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalCreationConfirmationSchema = import_zod6.z.discriminatedUnion("status", [GoalCreationCreatedSchema, GoalCreationStaleSchema]);
var AllocationChangeDraftWireSchema = import_zod6.z.object({
  dedicationPercentage: import_zod6.z.number().int().min(0).max(100),
  allocations: import_zod6.z.array(import_zod6.z.object({ goalId: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict()).min(1)
}).strict();
var ConfirmAllocationChangeWireSchema = import_zod6.z.object({ draft: AllocationChangeDraftWireSchema, previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var AllocationSchema = GoalCreationProposalSchema.shape.allocation;
var ImpactsSchema = GoalCreationProposalSchema.shape.impacts;
var AllocationChangePreviewSchema = import_zod6.z.object({
  proposal: import_zod6.z.object({
    dedicationPercentage: import_zod6.z.number().int().min(0).max(100),
    allocation: AllocationSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var AllocationChangeUpdatedSchema = import_zod6.z.object({ status: import_zod6.z.literal("updated") }).strict();
var AllocationChangeStaleSchema = import_zod6.z.object({ status: import_zod6.z.literal("stale"), preview: AllocationChangePreviewSchema }).strict();
var AllocationChangeConfirmationSchema = import_zod6.z.discriminatedUnion("status", [AllocationChangeUpdatedSchema, AllocationChangeStaleSchema]);
var AllocationSnapshotSchema = import_zod6.z.object({ effectiveMonth: import_zod6.z.string(), entries: import_zod6.z.array(import_zod6.z.object({ goalId: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict()) }).strict();
var AllocationChangeContextSchema = import_zod6.z.object({
  currentMonth: MonthSchema,
  financialSummary: FinancialSummarySchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), name: import_zod6.z.string(), currency: CurrencySchema, projection: ProjectionSchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var AllocationChangeContextStateSchema = import_zod6.z.discriminatedUnion("profile", [
  GoalCreationContextMissingSchema,
  import_zod6.z.object({ profile: import_zod6.z.literal("present"), context: AllocationChangeContextSchema }).strict()
]);
var GoalLifecycleActionSchema = import_zod6.z.enum(["pause", "resume"]);
var GoalLifecycleAllocationEntrySchema = import_zod6.z.object({ goalId: import_zod6.z.string(), percentage: import_zod6.z.string() }).strict();
var GoalLifecycleContextSchema = import_zod6.z.object({
  goalId: import_zod6.z.string(),
  lifecycle: GoalLifecycleActionSchema,
  goalName: import_zod6.z.string(),
  goalCurrency: CurrencySchema,
  currentMonth: MonthSchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), name: import_zod6.z.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var GoalLifecyclePreviewWireSchema = import_zod6.z.object({ lifecycle: GoalLifecycleActionSchema, allocations: import_zod6.z.array(GoalLifecycleAllocationEntrySchema).optional() }).strict();
var ConfirmGoalLifecycleWireSchema = import_zod6.z.object({
  lifecycle: GoalLifecycleActionSchema,
  allocations: import_zod6.z.array(GoalLifecycleAllocationEntrySchema),
  previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalStatusSchema = import_zod6.z.enum(["active", "paused", "completed"]);
var GoalLifecyclePreviewSchema = import_zod6.z.object({
  proposal: import_zod6.z.object({
    lifecycle: GoalLifecycleActionSchema,
    goalId: import_zod6.z.string(),
    nextStatus: GoalStatusSchema,
    transition: import_zod6.z.object({ goalId: import_zod6.z.string(), status: GoalStatusSchema }).strict(),
    pauseMonthlyCommitment: import_zod6.z.boolean(),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalLifecycleUpdatedSchema = import_zod6.z.object({ status: import_zod6.z.literal("updated") }).strict();
var GoalLifecycleStaleSchema = import_zod6.z.object({ status: import_zod6.z.literal("stale"), preview: GoalLifecyclePreviewSchema }).strict();
var GoalLifecycleConfirmationSchema = import_zod6.z.discriminatedUnion("status", [GoalLifecycleUpdatedSchema, GoalLifecycleStaleSchema]);
var GoalCompletionContextSchema = import_zod6.z.object({
  goalId: import_zod6.z.string(),
  goalName: import_zod6.z.string(),
  targetAmount: MoneySchema2,
  savingsValue: MoneySchema2,
  currentMonth: MonthSchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  savingsPlaces: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), name: import_zod6.z.string(), balance: MoneySchema2 }).strict()),
  activeGoals: import_zod6.z.array(import_zod6.z.object({ id: import_zod6.z.string(), name: import_zod6.z.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var GoalCompletionContextPresentSchema = import_zod6.z.object({ profile: import_zod6.z.literal("present"), context: GoalCompletionContextSchema }).strict();
var GoalCompletionContextStateSchema = import_zod6.z.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCompletionContextPresentSchema]);
var GoalCompletionPreviewWireSchema = import_zod6.z.object({
  withdrawals: import_zod6.z.array(import_zod6.z.object({ placeId: import_zod6.z.string(), amount: import_zod6.z.string() }).strict()),
  allocations: import_zod6.z.array(GoalLifecycleAllocationEntrySchema)
}).strict();
var ConfirmGoalCompletionWireSchema = import_zod6.z.object({
  withdrawals: import_zod6.z.array(import_zod6.z.object({ placeId: import_zod6.z.string(), amount: import_zod6.z.string() }).strict()),
  allocations: import_zod6.z.array(GoalLifecycleAllocationEntrySchema),
  previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionPreviewSchema = import_zod6.z.object({
  proposal: import_zod6.z.object({
    goalId: import_zod6.z.string(),
    goalName: import_zod6.z.string(),
    targetAmount: MoneySchema2,
    withdrawals: import_zod6.z.array(import_zod6.z.object({ placeId: import_zod6.z.string(), placeName: import_zod6.z.string(), amount: MoneySchema2 }).strict()),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    pauseMonthlyCommitment: import_zod6.z.boolean(),
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionCompletedSchema = import_zod6.z.object({ status: import_zod6.z.literal("completed"), completedAt: import_zod6.z.iso.datetime() }).strict();
var GoalCompletionStaleSchema = import_zod6.z.object({ status: import_zod6.z.literal("stale"), preview: GoalCompletionPreviewSchema }).strict();
var GoalCompletionInvalidSchema = import_zod6.z.object({ status: import_zod6.z.literal("invalid"), message: import_zod6.z.string() }).strict();
var GoalCompletionConfirmationSchema = import_zod6.z.discriminatedUnion("status", [GoalCompletionCompletedSchema, GoalCompletionStaleSchema, GoalCompletionInvalidSchema]);
var GoalPlanQueryWireSchema = import_zod6.z.object({ goalId: import_zod6.z.string().uuid().optional(), action: GoalLifecycleActionSchema.optional() }).refine((query) => query.action === void 0 || query.goalId !== void 0, { message: "Falta el objetivo de la acci\xF3n." });
var GoalIdPathWireSchema = import_zod6.z.object({ id: import_zod6.z.string().uuid() }).strict();
var GoalPlanEditContextWireSchema = import_zod6.z.object({
  goalId: import_zod6.z.string().uuid(),
  status: import_zod6.z.enum(["active", "paused"]),
  draft: GoalCreationDraftSchema
}).strict();
var GoalPlanContextPresentSchema = import_zod6.z.object({
  profile: import_zod6.z.literal("present"),
  context: GoalCreationContextWireSchema,
  editContext: GoalPlanEditContextWireSchema.optional(),
  allocationContext: AllocationChangeContextSchema.optional(),
  lifecycleContext: GoalLifecycleContextSchema.optional()
}).strict();
var GoalPlanContextStateSchema = import_zod6.z.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalPlanContextPresentSchema]);
var GoalEditConfirmWireSchema = import_zod6.z.object({ draft: GoalCreationDraftSchema, previewToken: import_zod6.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalEditUpdatedSchema = import_zod6.z.object({ status: import_zod6.z.literal("updated") }).strict();
var GoalEditStaleSchema = import_zod6.z.object({ status: import_zod6.z.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalEditConfirmationSchema = import_zod6.z.discriminatedUnion("status", [GoalEditUpdatedSchema, GoalEditStaleSchema]);
var GoalsWorkspaceMissingSchema = import_zod6.z.object({ profile: import_zod6.z.literal("missing") }).strict();
var GoalsWorkspacePresentSchema = import_zod6.z.object({ profile: import_zod6.z.literal("present"), workspace: WorkspaceSchema }).strict();
var GoalsWorkspaceSchema = import_zod6.z.discriminatedUnion("profile", [GoalsWorkspaceMissingSchema, GoalsWorkspacePresentSchema]);

// src/contribution.schema.ts
var MonthSchema2 = import_zod7.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var PreviewTokenSchema = import_zod7.z.string().regex(/^[a-f0-9]{64}$/, "Token de vista previa inv\xE1lido.");
var ContributionIdSchema = import_zod7.z.string().uuid("ID de aporte inv\xE1lido.");
var CatchUpMonthSchema = import_zod7.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes de regularizaci\xF3n inv\xE1lido.");
var SavingsPlaceSelectionWireSchema = import_zod7.z.discriminatedUnion("kind", [
  import_zod7.z.object({ kind: import_zod7.z.literal("existing"), placeId: import_zod7.z.string().uuid("Eleg\xED un lugar v\xE1lido.") }).strict(),
  import_zod7.z.object({ kind: import_zod7.z.literal("new"), name: import_zod7.z.string().trim().min(1, "Escrib\xED un nombre para el lugar.").max(120) }).strict()
]);
var ContributionDraftWireBaseSchema = import_zod7.z.object({
  kind: import_zod7.z.enum(["saving", "investment"]).optional().default("saving"),
  currency: import_zod7.z.enum(["ARS", "USD"]),
  amount: import_zod7.z.string(),
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: import_zod7.z.string().nullish(),
  effectiveRate: import_zod7.z.string().nullish()
}).strict();
var SavingContributionDraftWireSchema = ContributionDraftWireBaseSchema.superRefine((data, ctx) => {
  if (data.kind === "saving" && !data.place) {
    ctx.addIssue({ code: "custom", message: "Eleg\xED un lugar para tu ahorro.", path: ["place"] });
  }
});
var ConfirmSavingContributionWireSchema = import_zod7.z.object({
  draft: SavingContributionDraftWireSchema,
  previewToken: PreviewTokenSchema,
  catchUpMonth: CatchUpMonthSchema.optional()
}).strict();
var UpdateSavingContributionWireSchema = import_zod7.z.object({
  draft: SavingContributionDraftWireSchema
}).strict();
var ContributionIdPathWireSchema = import_zod7.z.object({ id: ContributionIdSchema }).strict();
var EligibleGoalSchema = import_zod7.z.object({
  id: import_zod7.z.string(),
  name: import_zod7.z.string(),
  percentage: import_zod7.z.union([import_zod7.z.string(), import_zod7.z.number()])
}).strict();
var InvestmentCurrencyStateSchema = import_zod7.z.discriminatedUnion("status", [
  import_zod7.z.object({ status: import_zod7.z.literal("ready") }).strict(),
  import_zod7.z.object({ status: import_zod7.z.literal("incomplete"), reason: import_zod7.z.literal("missing_investment_position") }).strict()
]);
var SavingContributionContextSchema = import_zod7.z.object({
  currentMonth: MonthSchema2,
  eligibleGoals: import_zod7.z.array(EligibleGoalSchema),
  eligibleGoalsUsd: import_zod7.z.array(EligibleGoalSchema),
  eligibleInvestmentGoals: import_zod7.z.array(EligibleGoalSchema).optional(),
  eligibleInvestmentGoalsUsd: import_zod7.z.array(EligibleGoalSchema).optional(),
  monthlyTargetArs: MoneySchema2.nullish(),
  monthlyTargetUsd: MoneySchema2.nullish(),
  monthlyInvestmentTargetArs: MoneySchema2.nullish(),
  monthlyInvestmentTargetUsd: MoneySchema2.nullish(),
  places: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), name: import_zod7.z.string() }).strict()),
  investmentState: import_zod7.z.object({ ars: InvestmentCurrencyStateSchema, usd: InvestmentCurrencyStateSchema }).strict()
}).strict();
var SavingContributionContextMissingSchema = import_zod7.z.object({ profile: import_zod7.z.literal("missing") }).strict();
var SavingContributionContextPresentSchema = import_zod7.z.object({ profile: import_zod7.z.literal("present"), context: SavingContributionContextSchema }).strict();
var SavingContributionContextStateSchema = import_zod7.z.discriminatedUnion("profile", [
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema
]);
var SavingDraftResultSchema = import_zod7.z.object({
  kind: import_zod7.z.enum(["saving", "investment"]).optional(),
  currency: import_zod7.z.enum(["ARS", "USD"]),
  amount: MoneySchema2,
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: MoneySchema2.optional(),
  effectiveRate: import_zod7.z.string().optional()
}).strict();
var SavingAllocationPreviewSchema = import_zod7.z.object({
  goalId: import_zod7.z.string(),
  goalName: import_zod7.z.string(),
  percentage: import_zod7.z.string(),
  amount: MoneySchema2,
  progressBefore: import_zod7.z.string().optional(),
  progressAfter: import_zod7.z.string().optional(),
  projectionBefore: ProjectionSchema.optional(),
  projectionAfter: ProjectionSchema.optional()
}).strict();
var SavingContributionPreviewBodySchema = import_zod7.z.object({
  draft: SavingDraftResultSchema,
  allocations: import_zod7.z.array(SavingAllocationPreviewSchema)
}).strict();
var SavingContributionEditPreviewSchema = import_zod7.z.object({
  preview: SavingContributionPreviewBodySchema
}).strict();
var SavingContributionPreviewSchema = import_zod7.z.object({
  preview: SavingContributionPreviewBodySchema,
  previewToken: PreviewTokenSchema
}).strict();
var SavingContributionCreatedSchema = import_zod7.z.object({ status: import_zod7.z.literal("created"), contributionId: import_zod7.z.string().uuid() }).strict();
var SavingContributionStaleSchema = import_zod7.z.object({ status: import_zod7.z.literal("stale"), preview: SavingContributionPreviewSchema }).strict();
var SavingContributionConfirmationSchema = import_zod7.z.discriminatedUnion("status", [
  SavingContributionCreatedSchema,
  SavingContributionStaleSchema
]);
var SavingContributionUpdatedSchema = import_zod7.z.object({ status: import_zod7.z.literal("updated") }).strict();
var SavingContributionDeletedSchema = import_zod7.z.object({ status: import_zod7.z.literal("deleted") }).strict();

// src/finances.schema.ts
var import_zod8 = require("zod");
var IdSchema = import_zod8.z.uuid();
var MonthSchema3 = import_zod8.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var DateSchema2 = import_zod8.z.iso.date();
var SourceSchema = import_zod8.z.object({ id: IdSchema, name: import_zod8.z.string(), normalizedName: import_zod8.z.string() });
var IncomeSchema = import_zod8.z.object({
  id: IdSchema,
  sourceKind: import_zod8.z.string(),
  sourceId: IdSchema.nullable(),
  sourceName: import_zod8.z.string(),
  concept: import_zod8.z.string().nullable(),
  amount: import_zod8.z.string(),
  currency: import_zod8.z.enum(["ARS", "USD"]),
  recurring: import_zod8.z.boolean(),
  effectiveMonth: DateSchema2,
  arsEquivalent: import_zod8.z.string().nullable()
});
var ExpenseSchema = IncomeSchema.extend({ endMonth: DateSchema2.nullable() });
var MoneySchema3 = import_zod8.z.object({ amount: import_zod8.z.string(), currency: import_zod8.z.literal("ARS") });
var MovementSchema = import_zod8.z.discriminatedUnion("kind", [
  import_zod8.z.object({ kind: import_zod8.z.literal("contribution"), id: IdSchema, placeId: IdSchema, placeName: import_zod8.z.string(), amount: import_zod8.z.string(), currency: import_zod8.z.enum(["ARS", "USD"]), createdAt: import_zod8.z.iso.datetime() }),
  import_zod8.z.object({ kind: import_zod8.z.literal("completion"), id: IdSchema, goalId: IdSchema, goalName: import_zod8.z.string(), placeId: IdSchema, placeName: import_zod8.z.string(), amount: import_zod8.z.string(), currency: import_zod8.z.enum(["ARS", "USD"]), createdAt: import_zod8.z.iso.datetime() }),
  import_zod8.z.object({ kind: import_zod8.z.literal("transfer"), id: IdSchema, fromPlaceId: IdSchema, fromPlaceName: import_zod8.z.string(), toPlaceId: IdSchema, toPlaceName: import_zod8.z.string(), amount: import_zod8.z.string(), currency: import_zod8.z.enum(["ARS", "USD"]), createdAt: import_zod8.z.iso.datetime() })
]);
var FinancesWorkspaceSchema = import_zod8.z.object({
  goalDedicationPercentage: import_zod8.z.string(),
  month: MonthSchema3,
  summary: import_zod8.z.object({ income: MoneySchema3, expenses: MoneySchema3, balance: MoneySchema3, contribution: MoneySchema3 }),
  incomes: import_zod8.z.object({ sources: import_zod8.z.array(SourceSchema), incomes: import_zod8.z.array(IncomeSchema) }),
  expenses: import_zod8.z.object({ sources: import_zod8.z.array(SourceSchema), expenses: import_zod8.z.array(ExpenseSchema) }),
  savings: import_zod8.z.object({ places: import_zod8.z.array(import_zod8.z.object({ id: IdSchema, name: import_zod8.z.string(), balances: import_zod8.z.object({ ARS: import_zod8.z.string(), USD: import_zod8.z.string() }), hasMovements: import_zod8.z.boolean() })), movements: import_zod8.z.array(MovementSchema) })
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
var import_zod9 = require("zod");
var percentageSchema = import_zod9.z.string().refine((value) => {
  const normalized = value.replace(",", ".");
  return /^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(normalized) && Number(normalized) <= 100;
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var onboardingGoalSchema = GoalCreationDraftWireSchema.extend({
  name: import_zod9.z.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  allocations: import_zod9.z.array(
    import_zod9.z.object({ goalId: import_zod9.z.string().min(1), percentage: percentageSchema }).strict()
  )
});
var FinancialOnboardingSchema = import_zod9.z.object({
  goal: onboardingGoalSchema,
  incomes: import_zod9.z.array(IncomeDraftSchema).min(1, "Agreg\xE1 al menos un ingreso recurrente."),
  expenses: import_zod9.z.array(ExpenseDraftSchema).min(1, "Agreg\xE1 al menos un gasto recurrente.")
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
var FinancialOnboardingResponseSchema = import_zod9.z.object({ created: import_zod9.z.boolean() }).strict();

// src/home.schema.ts
var import_zod10 = require("zod");
var CurrencySchema2 = import_zod10.z.enum(["ARS", "USD"]);
var MonthSchema4 = import_zod10.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var MonthOrDateSchema = import_zod10.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/);
var HomeQuerySchema = import_zod10.z.object({
  currentMonth: MonthSchema4.optional()
}).strict();
var RoadmapIncomeSchema = import_zod10.z.object({
  id: import_zod10.z.string(),
  sourceKind: import_zod10.z.string(),
  sourceId: import_zod10.z.string().nullable(),
  sourceName: import_zod10.z.string(),
  concept: import_zod10.z.string().nullable(),
  amount: import_zod10.z.string(),
  currency: CurrencySchema2,
  recurring: import_zod10.z.boolean(),
  effectiveMonth: MonthOrDateSchema,
  arsEquivalent: import_zod10.z.string().nullable().optional()
}).strict();
var RoadmapExpenseSchema = RoadmapIncomeSchema.extend({
  endMonth: MonthOrDateSchema.nullable()
}).strict();
var RoadmapFinancesSchema = import_zod10.z.object({
  incomes: import_zod10.z.object({
    sources: import_zod10.z.array(import_zod10.z.object({
      id: import_zod10.z.string(),
      name: import_zod10.z.string(),
      normalizedName: import_zod10.z.string()
    }).strict()).optional(),
    incomes: import_zod10.z.array(RoadmapIncomeSchema)
  }).strict(),
  expenses: import_zod10.z.object({
    sources: import_zod10.z.array(import_zod10.z.object({
      id: import_zod10.z.string(),
      name: import_zod10.z.string(),
      normalizedName: import_zod10.z.string()
    }).strict()).optional(),
    expenses: import_zod10.z.array(RoadmapExpenseSchema)
  }).strict()
}).strict();
var RoadmapMonthSchema = import_zod10.z.object({
  month: MonthSchema4,
  objectives: import_zod10.z.array(GoalWorkspaceItemSchema),
  oneTimeExpenses: import_zod10.z.array(RoadmapExpenseSchema),
  recurringExpenses: import_zod10.z.array(RoadmapExpenseSchema),
  endingExpenses: import_zod10.z.array(RoadmapExpenseSchema),
  oneTimeIncomes: import_zod10.z.array(RoadmapIncomeSchema),
  recurringIncomes: import_zod10.z.array(RoadmapIncomeSchema),
  contributions: import_zod10.z.array(ContributionSummarySchema)
}).strict();
var RoadmapDataSchema = import_zod10.z.object({
  undatedObjectives: import_zod10.z.array(GoalWorkspaceItemSchema),
  futureMonths: import_zod10.z.array(RoadmapMonthSchema),
  currentMonth: RoadmapMonthSchema,
  historyMonths: import_zod10.z.array(RoadmapMonthSchema)
}).strict();
var HomeRoadmapMissingSchema = import_zod10.z.object({
  profile: import_zod10.z.literal("missing")
}).strict();
var HomeRoadmapPresentSchema = import_zod10.z.object({
  profile: import_zod10.z.literal("present").optional(),
  roadmap: RoadmapDataSchema,
  completionGoals: import_zod10.z.array(GoalWorkspaceItemSchema)
}).strict();
var HomeRoadmapResponseSchema = import_zod10.z.discriminatedUnion("profile", [
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema
]);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  deriveUsdPurchase,
  isExpenseIncludedInMonth,
  isIncomeIncludedInMonth
});
