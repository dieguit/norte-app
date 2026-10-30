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
  BENEFIT_CAP_PERIODS: () => BENEFIT_CAP_PERIODS,
  BENEFIT_CATEGORIES: () => BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS: () => BENEFIT_CATEGORY_LABELS,
  BENEFIT_KINDS: () => BENEFIT_KINDS,
  BENEFIT_LIFECYCLE: () => BENEFIT_LIFECYCLE,
  BenefitCapSchema: () => BenefitCapSchema,
  BenefitCatalogResponseSchema: () => BenefitCatalogResponseSchema,
  BenefitCategorySchema: () => BenefitCategorySchema,
  BenefitMatchSchema: () => BenefitMatchSchema,
  BenefitPreferencesSchema: () => BenefitPreferencesSchema,
  BenefitProfileFactsSchema: () => BenefitProfileFactsSchema,
  BenefitRulesSchema: () => BenefitRulesSchema,
  CAP_PERIODS: () => CAP_PERIODS,
  CAP_SCOPES: () => CAP_SCOPES,
  CARD_NETWORKS: () => CARD_NETWORKS,
  CARD_TYPES: () => CARD_TYPES,
  CardNetworkSchema: () => CardNetworkSchema,
  CardSelectorSchema: () => CardSelectorSchema,
  ConfirmAllocationChangeWireSchema: () => ConfirmAllocationChangeWireSchema,
  ConfirmGoalCompletionWireSchema: () => ConfirmGoalCompletionWireSchema,
  ConfirmGoalCreationWireSchema: () => ConfirmGoalCreationWireSchema,
  ConfirmGoalLifecycleWireSchema: () => ConfirmGoalLifecycleWireSchema,
  ConfirmSavingContributionWireSchema: () => ConfirmSavingContributionWireSchema,
  ContributionDraftWireBaseSchema: () => ContributionDraftWireBaseSchema,
  ContributionIdPathWireSchema: () => ContributionIdPathWireSchema,
  ContributionSummarySchema: () => ContributionSummarySchema,
  CreatePlaceholderItemSchema: () => CreatePlaceholderItemSchema,
  CreateSavingsPlaceSchema: () => CreateSavingsPlaceSchema,
  DeletePlaceholderItemResponseSchema: () => DeletePlaceholderItemResponseSchema,
  ExpenseDraftSchema: () => ExpenseDraftSchema,
  ExpenseMutationResponseSchema: () => ExpenseMutationResponseSchema,
  FIXED_EXPENSE_SOURCES: () => FIXED_EXPENSE_SOURCES,
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
  INSTRUMENT_TYPES: () => INSTRUMENT_TYPES,
  IncomeDraftSchema: () => IncomeDraftSchema,
  IncomeMutationResponseSchema: () => IncomeMutationResponseSchema,
  InitialHomeStateSchema: () => InitialHomeStateSchema,
  InstrumentFactsSchema: () => InstrumentFactsSchema,
  MEMBERSHIP_USAGES: () => MEMBERSHIP_USAGES,
  NOTIFICATION_TYPES: () => NOTIFICATION_TYPES,
  NotificationSettingSchema: () => NotificationSettingSchema,
  NotificationSettingsResponseSchema: () => NotificationSettingsResponseSchema,
  NotificationTimeSchema: () => NotificationTimeSchema,
  NotificationTypeSchema: () => NotificationTypeSchema,
  OFFER_TYPES: () => OFFER_TYPES,
  ONE_TIME_EXPENSE_SOURCES: () => ONE_TIME_EXPENSE_SOURCES,
  PROVIDER_FACT_KEYS: () => PROVIDER_FACT_KEYS,
  PROVIDER_KINDS: () => PROVIDER_KINDS,
  PlaceholderItemListSchema: () => PlaceholderItemListSchema,
  PlaceholderItemSchema: () => PlaceholderItemSchema,
  PlaceholderStatusSchema: () => PlaceholderStatusSchema,
  ProfileResponseSchema: () => ProfileResponseSchema,
  ProviderFactsSchema: () => ProviderFactsSchema,
  RECURRING_EXPENSE_SOURCES: () => RECURRING_EXPENSE_SOURCES,
  REQUIREMENT_MAX_DEPTH: () => REQUIREMENT_MAX_DEPTH,
  REQUIREMENT_MAX_NODES: () => REQUIREMENT_MAX_NODES,
  RenameSavingsPlaceSchema: () => RenameSavingsPlaceSchema,
  RequirementSchema: () => RequirementSchema,
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
  TRI_STATE: () => TRI_STATE,
  UpdateBenefitPreferencesSchema: () => UpdateBenefitPreferencesSchema,
  UpdateNotificationSettingSchema: () => UpdateNotificationSettingSchema,
  UpdatePlaceholderItemSchema: () => UpdatePlaceholderItemSchema,
  UpdateSavingContributionWireSchema: () => UpdateSavingContributionWireSchema,
  allocationEntrySchema: () => allocationEntrySchema,
  confirmGoalCreationSchema: () => confirmGoalCreationSchema,
  confirmGoalEditSchema: () => confirmGoalEditSchema,
  createObjectiveSchema: () => createObjectiveSchema,
  deriveUsdPurchase: () => deriveUsdPurchase,
  goalCreationDraftSchema: () => goalCreationDraftSchema,
  goalEditRequestSchema: () => goalEditRequestSchema,
  goalImpactSchema: () => goalImpactSchema,
  goalPlanSchema: () => goalPlanSchema,
  goalPrioritySchema: () => goalPrioritySchema,
  goalStrategySchema: () => goalStrategySchema,
  goalTypeSchema: () => goalTypeSchema,
  investmentAvailabilitySchema: () => investmentAvailabilitySchema,
  isExpenseIncludedInMonth: () => isExpenseIncludedInMonth,
  isIncomeIncludedInMonth: () => isIncomeIncludedInMonth,
  parseGoalCreationSubmission: () => parseGoalCreationSubmission,
  previewGoalEditSchema: () => previewGoalEditSchema
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
var import_zod4 = require("zod");

// src/finance-entry.schema.ts
var import_zod3 = require("zod");
var amountSchema = import_zod3.z.string().refine((amount) => {
  const clean = amount.replace(/[$]|US[$]|USD|ARS|\s/gi, "").trim();
  if (!clean) return false;
  const normalized = clean.includes(",") && clean.includes(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.includes(",") ? clean.replace(",", ".") : clean.includes(".") && (clean.split(".").length > 2 || clean.split(".")[1].length === 3) ? clean.replace(/\./g, "") : clean;
  return Number.isFinite(Number(normalized)) && Number(normalized) > 0;
}, "Ingres\xE1 un monto mayor a cero.");
var conceptSchema = import_zod3.z.string().trim().max(120, "M\xE1ximo 120 caracteres.").nullish().transform((value) => value || null);
var customSourceSchemas = [
  import_zod3.z.object({ kind: import_zod3.z.literal("custom"), sourceId: import_zod3.z.string().uuid() }),
  import_zod3.z.object({
    kind: import_zod3.z.literal("custom"),
    name: import_zod3.z.string().trim().min(1, "Ingres\xE1 una categor\xEDa.").max(120, "M\xE1ximo 120 caracteres.")
  })
];
var entryResponseFields = {
  id: import_zod3.z.string().uuid(),
  sourceKind: import_zod3.z.string(),
  sourceId: import_zod3.z.string().uuid().nullable(),
  concept: import_zod3.z.string().nullable(),
  amount: import_zod3.z.string(),
  currency: import_zod3.z.enum(["ARS", "USD"]),
  recurring: import_zod3.z.boolean()
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
var sourceSchema = import_zod4.z.union(
  [
    import_zod4.z.object({
      kind: import_zod4.z.enum(
        Object.keys(FIXED_INCOME_SOURCES)
      )
    }),
    ...customSourceSchemas
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var IncomeDraftSchema = import_zod4.z.object({
  concept: conceptSchema,
  source: sourceSchema,
  amount: amountSchema,
  currency: import_zod4.z.enum(["ARS", "USD"]),
  recurring: import_zod4.z.boolean(),
  effectiveMonth: import_zod4.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingres\xE1 un mes v\xE1lido.")
});
var IncomeMutationResponseSchema = import_zod4.z.object({
  ...entryResponseFields,
  userId: import_zod4.z.string(),
  effectiveMonth: import_zod4.z.string(),
  createdAt: import_zod4.z.iso.datetime(),
  updatedAt: import_zod4.z.iso.datetime()
});

// src/expense.schema.ts
var import_zod5 = require("zod");
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
var sourceSchema2 = import_zod5.z.union(
  [
    import_zod5.z.object({ kind: import_zod5.z.enum(fixedExpenseSources) }),
    ...customSourceSchemas
  ],
  { error: "Seleccion\xE1 una categor\xEDa." }
);
var ExpenseDraftSchema = import_zod5.z.object({
  concept: conceptSchema,
  source: sourceSchema2,
  amount: amountSchema,
  currency: import_zod5.z.enum(["ARS", "USD"]),
  recurring: import_zod5.z.boolean()
});
var ExpenseMutationResponseSchema = import_zod5.z.object({
  ...entryResponseFields,
  effectiveMonth: import_zod5.z.iso.date(),
  endMonth: import_zod5.z.iso.date().nullable()
});

// src/savings-place.schema.ts
var import_zod6 = require("zod");
var SavingsPlaceNameSchema = import_zod6.z.string().trim().min(1).max(120);
var CreateSavingsPlaceSchema = import_zod6.z.object({ name: SavingsPlaceNameSchema });
var RenameSavingsPlaceSchema = import_zod6.z.object({ name: SavingsPlaceNameSchema });
var SavingsPlaceIdParamsSchema = import_zod6.z.object({ id: import_zod6.z.string().uuid() });
var SavingsTransferSchema = import_zod6.z.object({
  fromPlaceId: import_zod6.z.string().uuid(),
  toPlaceId: import_zod6.z.string().uuid(),
  currency: import_zod6.z.enum(["ARS", "USD"]),
  amount: import_zod6.z.string().min(1)
}).refine((value) => value.fromPlaceId !== value.toPlaceId, { message: "El origen y el destino deben ser distintos." });
var SavingsPlaceMutationResponseSchema = import_zod6.z.object({ placeId: import_zod6.z.string().uuid() });
var SavingsTransferResponseSchema = import_zod6.z.object({ transferId: import_zod6.z.string().uuid() });

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
var import_zod8 = require("zod");

// src/goals.schema.ts
var import_zod7 = require("zod");
var CurrencySchema = import_zod7.z.enum(["ARS", "USD"]);
var MoneySchema2 = import_zod7.z.object({ amount: import_zod7.z.string(), currency: CurrencySchema }).strict();
var DateSchema = import_zod7.z.iso.date();
var MonthSchema = import_zod7.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var ContributionSummarySchema = import_zod7.z.object({
  id: import_zod7.z.string(),
  kind: import_zod7.z.enum(["saving", "investment"]),
  userId: import_zod7.z.string().optional(),
  amount: import_zod7.z.string(),
  currency: CurrencySchema,
  placeId: import_zod7.z.string().optional(),
  placeName: import_zod7.z.string().optional(),
  arsSpent: import_zod7.z.string().nullable().optional(),
  effectiveRate: import_zod7.z.string().nullable().optional(),
  createdAt: import_zod7.z.iso.datetime(),
  allocations: import_zod7.z.array(import_zod7.z.object({ goalId: import_zod7.z.string(), goalName: import_zod7.z.string(), amount: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict())
}).strict();
var ContributionSchema = ContributionSummarySchema;
var ProjectionSchema = import_zod7.z.discriminatedUnion("status", [
  import_zod7.z.object({ status: import_zod7.z.literal("available"), completionMonth: MonthSchema }).strict(),
  ...["target_unavailable", "no_future_allocation", "commitment_absent", "plan_paused", "investment_assumption_unavailable", "outside_horizon"].map((status) => import_zod7.z.object({ status: import_zod7.z.literal(status) }).strict())
]);
var GoalWorkspaceItemSchema = import_zod7.z.object({
  id: import_zod7.z.string(),
  name: import_zod7.z.string(),
  type: import_zod7.z.string(),
  currency: CurrencySchema,
  priority: import_zod7.z.enum(["high", "medium", "low"]),
  strategy: import_zod7.z.enum(["save", "invest"]),
  status: import_zod7.z.enum(["active", "paused", "completed"]),
  createdAt: import_zod7.z.iso.datetime(),
  desiredDate: DateSchema.optional(),
  completedAt: import_zod7.z.iso.datetime().optional(),
  targetAmount: MoneySchema2.optional(),
  savingsValue: MoneySchema2,
  investmentValue: MoneySchema2,
  actualValue: MoneySchema2,
  progressPercentage: import_zod7.z.string().optional(),
  funding: import_zod7.z.array(import_zod7.z.object({ percentage: import_zod7.z.string(), monthlyContribution: MoneySchema2.optional(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), effectiveMonth: DateSchema }).strict()),
  projection: ProjectionSchema,
  desiredDateDeltaMonths: import_zod7.z.number().optional(),
  annualReturnRate: import_zod7.z.string().optional(),
  availability: import_zod7.z.enum(["available_now", "available_from", "long_term"]).optional(),
  availableFrom: DateSchema.optional(),
  usesPlanningRate: import_zod7.z.boolean(),
  completionEligible: import_zod7.z.boolean(),
  completionWithdrawals: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), placeId: import_zod7.z.string(), placeName: import_zod7.z.string(), amount: MoneySchema2, createdAt: import_zod7.z.iso.datetime() }).strict()).optional(),
  contributions: import_zod7.z.array(ContributionSchema).optional(),
  savingContributions: import_zod7.z.array(ContributionSchema).optional()
}).strict();
var GoalSchema = GoalWorkspaceItemSchema;
var FinancialSummarySchema = import_zod7.z.object({ month: MonthSchema, income: MoneySchema2, expenses: MoneySchema2, balance: MoneySchema2, dedicationPercentage: import_zod7.z.string(), contribution: MoneySchema2 }).strict();
var WorkspaceSchema = import_zod7.z.object({ financialSummary: FinancialSummarySchema, groups: import_zod7.z.array(import_zod7.z.object({ status: import_zod7.z.enum(["active", "paused", "completed"]), goals: import_zod7.z.array(GoalSchema) }).strict()) }).strict();
var GoalCreationDraftSchema = import_zod7.z.object({
  type: import_zod7.z.enum(["emergency_fund", "purchase", "retirement", "other"]),
  name: import_zod7.z.string(),
  targetAmount: import_zod7.z.string(),
  currency: CurrencySchema,
  desiredMonth: import_zod7.z.string(),
  priority: import_zod7.z.enum(["high", "medium", "low"]),
  strategy: import_zod7.z.enum(["save", "invest"]),
  annualReturnRate: import_zod7.z.string(),
  availability: import_zod7.z.enum(["available_now", "available_from", "long_term"]),
  availableFromMonth: import_zod7.z.string(),
  allocations: import_zod7.z.array(import_zod7.z.object({ goalId: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict())
}).strict();
var GoalProjectionSchema = ProjectionSchema;
var AllocationEntrySchema = import_zod7.z.object({ goalId: import_zod7.z.string(), goalName: import_zod7.z.string(), percentage: import_zod7.z.string(), allocatedBaseAmount: MoneySchema2.optional(), allocatedDestinationAmount: MoneySchema2.optional(), pending: import_zod7.z.boolean() }).strict();
var ProposalSourceSchema = import_zod7.z.object({
  profile: import_zod7.z.object({ userId: import_zod7.z.string(), baseCurrency: CurrencySchema, expensesKnowledge: import_zod7.z.string(), plannedMonthlyContribution: import_zod7.z.string().nullable().optional(), goalDedicationPercentage: import_zod7.z.string().optional(), onboardingCompleted: import_zod7.z.boolean() }).strict().nullable().optional(),
  goals: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), userId: import_zod7.z.string().nullable().optional(), name: import_zod7.z.string(), type: import_zod7.z.string(), targetAmount: import_zod7.z.string().nullable().optional(), currency: CurrencySchema, priority: import_zod7.z.enum(["high", "medium", "low"]), strategy: import_zod7.z.enum(["save", "invest"]), status: import_zod7.z.enum(["active", "paused", "completed"]), desiredDate: import_zod7.z.string().nullable().optional(), completedAt: import_zod7.z.string().nullable().optional(), emergencyFundMonths: import_zod7.z.number().nullable().optional(), createdAt: import_zod7.z.string() }).strict()),
  savingsPositions: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), goalId: import_zod7.z.string(), amount: import_zod7.z.string(), currency: CurrencySchema, location: import_zod7.z.string().nullable().optional() }).strict()),
  investmentPositions: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), goalId: import_zod7.z.string(), currentValue: import_zod7.z.string(), currency: CurrencySchema, annualReturnRate: import_zod7.z.string().nullable().optional(), availability: import_zod7.z.enum(["available_now", "available_from", "long_term"]).nullable().optional(), availableFrom: import_zod7.z.string().nullable().optional() }).strict()),
  snapshots: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), userId: import_zod7.z.string().nullable().optional(), effectiveMonth: import_zod7.z.string() }).strict()),
  allocations: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), snapshotId: import_zod7.z.string(), goalId: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict()),
  contributions: import_zod7.z.array(ContributionSchema).optional(),
  savingContributions: import_zod7.z.array(ContributionSchema).optional(),
  incomes: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), sourceKind: import_zod7.z.string(), sourceId: import_zod7.z.string().nullable(), sourceName: import_zod7.z.string().nullable(), concept: import_zod7.z.string().nullable(), amount: import_zod7.z.string(), currency: CurrencySchema, recurring: import_zod7.z.boolean(), effectiveMonth: import_zod7.z.string() }).strict()).optional(),
  expenses: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), sourceKind: import_zod7.z.string(), sourceId: import_zod7.z.string().nullable(), sourceName: import_zod7.z.string().nullable(), concept: import_zod7.z.string().nullable(), amount: import_zod7.z.string(), currency: CurrencySchema, recurring: import_zod7.z.boolean(), effectiveMonth: import_zod7.z.string(), endMonth: import_zod7.z.string().nullable() }).strict()).optional(),
  completionWithdrawals: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), goalId: import_zod7.z.string(), placeId: import_zod7.z.string(), placeName: import_zod7.z.string(), amount: import_zod7.z.string(), currency: CurrencySchema, createdAt: import_zod7.z.string() }).strict()).optional()
}).strict();
var GoalCreationProposalSchema = import_zod7.z.object({
  normalizedGoal: import_zod7.z.object({ name: import_zod7.z.string(), type: import_zod7.z.enum(["emergency_fund", "purchase", "retirement", "other"]), targetAmount: MoneySchema2.optional(), currency: CurrencySchema, priority: import_zod7.z.enum(["high", "medium", "low"]), strategy: import_zod7.z.enum(["save", "invest"]), desiredDate: DateSchema.optional(), emergencyFundMonths: import_zod7.z.number().optional() }).strict(),
  investment: import_zod7.z.object({ annualReturnRate: import_zod7.z.string(), availability: import_zod7.z.enum(["available_now", "available_from", "long_term"]), availableFrom: DateSchema.optional() }).strict().optional(),
  allocation: import_zod7.z.object({ monthlyContribution: MoneySchema2.optional(), effectiveMonth: import_zod7.z.string(), entries: import_zod7.z.array(AllocationEntrySchema), totalPercentage: import_zod7.z.string() }).strict(),
  impacts: import_zod7.z.array(import_zod7.z.object({ goalId: import_zod7.z.string(), goalName: import_zod7.z.string(), before: import_zod7.z.discriminatedUnion("status", [import_zod7.z.object({ status: import_zod7.z.literal("not_created") }).strict(), import_zod7.z.object({ status: import_zod7.z.literal("existing"), projection: GoalProjectionSchema, allocatedMonthlyAmounts: import_zod7.z.array(MoneySchema2) }).strict()]), after: GoalProjectionSchema }).strict()),
  proposedSource: ProposalSourceSchema
}).strict();
var GoalCreationDraftWireSchema = GoalCreationDraftSchema;
var ConfirmGoalCreationWireSchema = import_zod7.z.object({ draft: GoalCreationDraftSchema, previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationContextWireSchema = import_zod7.z.object({ currentMonth: MonthSchema, expensesKnowledge: import_zod7.z.enum(["known", "unknown"]), hasEmergencyFund: import_zod7.z.boolean(), plannedMonthlyContribution: MoneySchema2.optional(), currentAllocation: import_zod7.z.object({ effectiveMonth: import_zod7.z.string(), entries: import_zod7.z.array(import_zod7.z.object({ goalId: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict()) }).strict().optional() }).strict();
var GoalCreationContextMissingSchema = import_zod7.z.object({ profile: import_zod7.z.literal("missing") }).strict();
var GoalCreationContextPresentSchema = import_zod7.z.object({ profile: import_zod7.z.literal("present"), context: GoalCreationContextWireSchema }).strict();
var GoalCreationContextStateSchema = import_zod7.z.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCreationContextPresentSchema]);
var GoalCreationPreviewSchema = import_zod7.z.object({ proposal: GoalCreationProposalSchema, previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalCreationCreatedSchema = import_zod7.z.object({ status: import_zod7.z.literal("created"), goalId: import_zod7.z.string() }).strict();
var GoalCreationStaleSchema = import_zod7.z.object({ status: import_zod7.z.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalCreationConfirmationSchema = import_zod7.z.discriminatedUnion("status", [GoalCreationCreatedSchema, GoalCreationStaleSchema]);
var AllocationChangeDraftWireSchema = import_zod7.z.object({
  dedicationPercentage: import_zod7.z.number().int().min(0).max(100),
  allocations: import_zod7.z.array(import_zod7.z.object({ goalId: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict()).min(1)
}).strict();
var ConfirmAllocationChangeWireSchema = import_zod7.z.object({ draft: AllocationChangeDraftWireSchema, previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var AllocationSchema = GoalCreationProposalSchema.shape.allocation;
var ImpactsSchema = GoalCreationProposalSchema.shape.impacts;
var AllocationChangePreviewSchema = import_zod7.z.object({
  proposal: import_zod7.z.object({
    dedicationPercentage: import_zod7.z.number().int().min(0).max(100),
    allocation: AllocationSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var AllocationChangeUpdatedSchema = import_zod7.z.object({ status: import_zod7.z.literal("updated") }).strict();
var AllocationChangeStaleSchema = import_zod7.z.object({ status: import_zod7.z.literal("stale"), preview: AllocationChangePreviewSchema }).strict();
var AllocationChangeConfirmationSchema = import_zod7.z.discriminatedUnion("status", [AllocationChangeUpdatedSchema, AllocationChangeStaleSchema]);
var AllocationSnapshotSchema = import_zod7.z.object({ effectiveMonth: import_zod7.z.string(), entries: import_zod7.z.array(import_zod7.z.object({ goalId: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict()) }).strict();
var AllocationChangeContextSchema = import_zod7.z.object({
  currentMonth: MonthSchema,
  financialSummary: FinancialSummarySchema,
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), name: import_zod7.z.string(), currency: CurrencySchema, projection: ProjectionSchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
}).strict();
var AllocationChangeContextStateSchema = import_zod7.z.discriminatedUnion("profile", [
  GoalCreationContextMissingSchema,
  import_zod7.z.object({ profile: import_zod7.z.literal("present"), context: AllocationChangeContextSchema }).strict()
]);
var GoalLifecycleActionSchema = import_zod7.z.enum(["pause", "resume"]);
var GoalLifecycleAllocationEntrySchema = import_zod7.z.object({ goalId: import_zod7.z.string(), percentage: import_zod7.z.string() }).strict();
var allocationContextFields = {
  plannedMonthlyContribution: MoneySchema2.optional(),
  activeGoals: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), name: import_zod7.z.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(),
  pendingAllocation: AllocationSnapshotSchema.optional()
};
var GoalLifecycleContextSchema = import_zod7.z.object({
  goalId: import_zod7.z.string(),
  lifecycle: GoalLifecycleActionSchema,
  goalName: import_zod7.z.string(),
  goalCurrency: CurrencySchema,
  currentMonth: MonthSchema,
  ...allocationContextFields
}).strict();
var GoalLifecyclePreviewWireSchema = import_zod7.z.object({ lifecycle: GoalLifecycleActionSchema, allocations: import_zod7.z.array(GoalLifecycleAllocationEntrySchema).optional() }).strict();
var ConfirmGoalLifecycleWireSchema = import_zod7.z.object({
  lifecycle: GoalLifecycleActionSchema,
  allocations: import_zod7.z.array(GoalLifecycleAllocationEntrySchema),
  previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalStatusSchema = import_zod7.z.enum(["active", "paused", "completed"]);
var GoalLifecyclePreviewSchema = import_zod7.z.object({
  proposal: import_zod7.z.object({
    lifecycle: GoalLifecycleActionSchema,
    goalId: import_zod7.z.string(),
    nextStatus: GoalStatusSchema,
    transition: import_zod7.z.object({ goalId: import_zod7.z.string(), status: GoalStatusSchema }).strict(),
    pauseMonthlyCommitment: import_zod7.z.boolean(),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalLifecycleUpdatedSchema = import_zod7.z.object({ status: import_zod7.z.literal("updated") }).strict();
var GoalLifecycleStaleSchema = import_zod7.z.object({ status: import_zod7.z.literal("stale"), preview: GoalLifecyclePreviewSchema }).strict();
var GoalLifecycleConfirmationSchema = import_zod7.z.discriminatedUnion("status", [GoalLifecycleUpdatedSchema, GoalLifecycleStaleSchema]);
var GoalCompletionContextSchema = import_zod7.z.object({
  goalId: import_zod7.z.string(),
  goalName: import_zod7.z.string(),
  targetAmount: MoneySchema2,
  savingsValue: MoneySchema2,
  currentMonth: MonthSchema,
  savingsPlaces: import_zod7.z.array(import_zod7.z.object({ id: import_zod7.z.string(), name: import_zod7.z.string(), balance: MoneySchema2 }).strict()),
  ...allocationContextFields
}).strict();
var GoalCompletionContextPresentSchema = import_zod7.z.object({ profile: import_zod7.z.literal("present"), context: GoalCompletionContextSchema }).strict();
var GoalCompletionContextStateSchema = import_zod7.z.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalCompletionContextPresentSchema]);
var GoalCompletionPreviewWireSchema = import_zod7.z.object({
  withdrawals: import_zod7.z.array(import_zod7.z.object({ placeId: import_zod7.z.string(), amount: import_zod7.z.string() }).strict()),
  allocations: import_zod7.z.array(GoalLifecycleAllocationEntrySchema)
}).strict();
var ConfirmGoalCompletionWireSchema = import_zod7.z.object({
  withdrawals: import_zod7.z.array(import_zod7.z.object({ placeId: import_zod7.z.string(), amount: import_zod7.z.string() }).strict()),
  allocations: import_zod7.z.array(GoalLifecycleAllocationEntrySchema),
  previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionPreviewSchema = import_zod7.z.object({
  proposal: import_zod7.z.object({
    goalId: import_zod7.z.string(),
    goalName: import_zod7.z.string(),
    targetAmount: MoneySchema2,
    withdrawals: import_zod7.z.array(import_zod7.z.object({ placeId: import_zod7.z.string(), placeName: import_zod7.z.string(), amount: MoneySchema2 }).strict()),
    allocation: AllocationSchema,
    persistedAllocation: AllocationSnapshotSchema,
    pauseMonthlyCommitment: import_zod7.z.boolean(),
    impacts: ImpactsSchema,
    proposedSource: ProposalSourceSchema
  }).strict(),
  previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/)
}).strict();
var GoalCompletionCompletedSchema = import_zod7.z.object({ status: import_zod7.z.literal("completed"), completedAt: import_zod7.z.iso.datetime() }).strict();
var GoalCompletionStaleSchema = import_zod7.z.object({ status: import_zod7.z.literal("stale"), preview: GoalCompletionPreviewSchema }).strict();
var GoalCompletionInvalidSchema = import_zod7.z.object({ status: import_zod7.z.literal("invalid"), message: import_zod7.z.string() }).strict();
var GoalCompletionConfirmationSchema = import_zod7.z.discriminatedUnion("status", [GoalCompletionCompletedSchema, GoalCompletionStaleSchema, GoalCompletionInvalidSchema]);
var GoalPlanQueryWireSchema = import_zod7.z.object({ goalId: import_zod7.z.string().uuid().optional(), action: GoalLifecycleActionSchema.optional() }).refine((query) => query.action === void 0 || query.goalId !== void 0, { message: "Falta el objetivo de la acci\xF3n." });
var GoalIdPathWireSchema = import_zod7.z.object({ id: import_zod7.z.string().uuid() }).strict();
var GoalPlanEditContextWireSchema = import_zod7.z.object({
  goalId: import_zod7.z.string().uuid(),
  status: import_zod7.z.enum(["active", "paused"]),
  draft: GoalCreationDraftSchema
}).strict();
var GoalPlanContextPresentSchema = import_zod7.z.object({
  profile: import_zod7.z.literal("present"),
  context: GoalCreationContextWireSchema,
  editContext: GoalPlanEditContextWireSchema.optional(),
  allocationContext: AllocationChangeContextSchema.optional(),
  lifecycleContext: GoalLifecycleContextSchema.optional()
}).strict();
var GoalPlanContextStateSchema = import_zod7.z.discriminatedUnion("profile", [GoalCreationContextMissingSchema, GoalPlanContextPresentSchema]);
var GoalEditConfirmWireSchema = import_zod7.z.object({ draft: GoalCreationDraftSchema, previewToken: import_zod7.z.string().regex(/^[a-f0-9]{64}$/) }).strict();
var GoalEditUpdatedSchema = import_zod7.z.object({ status: import_zod7.z.literal("updated") }).strict();
var GoalEditStaleSchema = import_zod7.z.object({ status: import_zod7.z.literal("stale"), preview: GoalCreationPreviewSchema }).strict();
var GoalEditConfirmationSchema = import_zod7.z.discriminatedUnion("status", [GoalEditUpdatedSchema, GoalEditStaleSchema]);
var GoalsWorkspaceMissingSchema = import_zod7.z.object({ profile: import_zod7.z.literal("missing") }).strict();
var GoalsWorkspacePresentSchema = import_zod7.z.object({ profile: import_zod7.z.literal("present"), workspace: WorkspaceSchema }).strict();
var GoalsWorkspaceSchema = import_zod7.z.discriminatedUnion("profile", [GoalsWorkspaceMissingSchema, GoalsWorkspacePresentSchema]);

// src/contribution.schema.ts
var MonthSchema2 = import_zod8.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var PreviewTokenSchema = import_zod8.z.string().regex(/^[a-f0-9]{64}$/, "Token de vista previa inv\xE1lido.");
var ContributionIdSchema = import_zod8.z.string().uuid("ID de aporte inv\xE1lido.");
var CatchUpMonthSchema = import_zod8.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes de regularizaci\xF3n inv\xE1lido.");
var SavingsPlaceSelectionWireSchema = import_zod8.z.discriminatedUnion("kind", [
  import_zod8.z.object({ kind: import_zod8.z.literal("existing"), placeId: import_zod8.z.string().uuid("Eleg\xED un lugar v\xE1lido.") }).strict(),
  import_zod8.z.object({ kind: import_zod8.z.literal("new"), name: import_zod8.z.string().trim().min(1, "Escrib\xED un nombre para el lugar.").max(120) }).strict()
]);
var ContributionDraftWireBaseSchema = import_zod8.z.object({
  kind: import_zod8.z.enum(["saving", "investment"]).optional().default("saving"),
  currency: import_zod8.z.enum(["ARS", "USD"]),
  amount: import_zod8.z.string(),
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: import_zod8.z.string().nullish(),
  effectiveRate: import_zod8.z.string().nullish()
}).strict();
var SavingContributionDraftWireSchema = ContributionDraftWireBaseSchema.superRefine((data, ctx) => {
  if (data.kind === "saving" && !data.place) {
    ctx.addIssue({ code: "custom", message: "Eleg\xED un lugar para tu ahorro.", path: ["place"] });
  }
});
var ConfirmSavingContributionWireSchema = import_zod8.z.object({
  draft: SavingContributionDraftWireSchema,
  previewToken: PreviewTokenSchema,
  catchUpMonth: CatchUpMonthSchema.optional()
}).strict();
var UpdateSavingContributionWireSchema = import_zod8.z.object({
  draft: SavingContributionDraftWireSchema
}).strict();
var ContributionIdPathWireSchema = import_zod8.z.object({ id: ContributionIdSchema }).strict();
var EligibleGoalSchema = import_zod8.z.object({
  id: import_zod8.z.string(),
  name: import_zod8.z.string(),
  percentage: import_zod8.z.union([import_zod8.z.string(), import_zod8.z.number()])
}).strict();
var InvestmentCurrencyStateSchema = import_zod8.z.discriminatedUnion("status", [
  import_zod8.z.object({ status: import_zod8.z.literal("ready") }).strict(),
  import_zod8.z.object({ status: import_zod8.z.literal("incomplete"), reason: import_zod8.z.literal("missing_investment_position") }).strict()
]);
var SavingContributionContextSchema = import_zod8.z.object({
  currentMonth: MonthSchema2,
  eligibleGoals: import_zod8.z.array(EligibleGoalSchema),
  eligibleGoalsUsd: import_zod8.z.array(EligibleGoalSchema),
  eligibleInvestmentGoals: import_zod8.z.array(EligibleGoalSchema).optional(),
  eligibleInvestmentGoalsUsd: import_zod8.z.array(EligibleGoalSchema).optional(),
  monthlyTargetArs: MoneySchema2.nullish(),
  monthlyTargetUsd: MoneySchema2.nullish(),
  monthlyInvestmentTargetArs: MoneySchema2.nullish(),
  monthlyInvestmentTargetUsd: MoneySchema2.nullish(),
  places: import_zod8.z.array(import_zod8.z.object({ id: import_zod8.z.string(), name: import_zod8.z.string() }).strict()),
  investmentState: import_zod8.z.object({ ars: InvestmentCurrencyStateSchema, usd: InvestmentCurrencyStateSchema }).strict()
}).strict();
var SavingContributionContextMissingSchema = import_zod8.z.object({ profile: import_zod8.z.literal("missing") }).strict();
var SavingContributionContextPresentSchema = import_zod8.z.object({ profile: import_zod8.z.literal("present"), context: SavingContributionContextSchema }).strict();
var SavingContributionContextStateSchema = import_zod8.z.discriminatedUnion("profile", [
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema
]);
var SavingDraftResultSchema = import_zod8.z.object({
  kind: import_zod8.z.enum(["saving", "investment"]).optional(),
  currency: import_zod8.z.enum(["ARS", "USD"]),
  amount: MoneySchema2,
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: MoneySchema2.optional(),
  effectiveRate: import_zod8.z.string().optional()
}).strict();
var SavingAllocationPreviewSchema = import_zod8.z.object({
  goalId: import_zod8.z.string(),
  goalName: import_zod8.z.string(),
  percentage: import_zod8.z.string(),
  amount: MoneySchema2,
  progressBefore: import_zod8.z.string().optional(),
  progressAfter: import_zod8.z.string().optional(),
  projectionBefore: ProjectionSchema.optional(),
  projectionAfter: ProjectionSchema.optional()
}).strict();
var SavingContributionPreviewBodySchema = import_zod8.z.object({
  draft: SavingDraftResultSchema,
  allocations: import_zod8.z.array(SavingAllocationPreviewSchema)
}).strict();
var SavingContributionEditPreviewSchema = import_zod8.z.object({
  preview: SavingContributionPreviewBodySchema
}).strict();
var SavingContributionPreviewSchema = import_zod8.z.object({
  preview: SavingContributionPreviewBodySchema,
  previewToken: PreviewTokenSchema
}).strict();
var SavingContributionCreatedSchema = import_zod8.z.object({ status: import_zod8.z.literal("created"), contributionId: import_zod8.z.string().uuid() }).strict();
var SavingContributionStaleSchema = import_zod8.z.object({ status: import_zod8.z.literal("stale"), preview: SavingContributionPreviewSchema }).strict();
var SavingContributionConfirmationSchema = import_zod8.z.discriminatedUnion("status", [
  SavingContributionCreatedSchema,
  SavingContributionStaleSchema
]);
var SavingContributionUpdatedSchema = import_zod8.z.object({ status: import_zod8.z.literal("updated") }).strict();
var SavingContributionDeletedSchema = import_zod8.z.object({ status: import_zod8.z.literal("deleted") }).strict();

// src/finances.schema.ts
var import_zod9 = require("zod");
var IdSchema = import_zod9.z.uuid();
var MonthSchema3 = import_zod9.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var DateSchema2 = import_zod9.z.iso.date();
var SourceSchema = import_zod9.z.object({ id: IdSchema, name: import_zod9.z.string(), normalizedName: import_zod9.z.string() });
var IncomeSchema = import_zod9.z.object({
  id: IdSchema,
  sourceKind: import_zod9.z.string(),
  sourceId: IdSchema.nullable(),
  sourceName: import_zod9.z.string(),
  concept: import_zod9.z.string().nullable(),
  amount: import_zod9.z.string(),
  currency: import_zod9.z.enum(["ARS", "USD"]),
  recurring: import_zod9.z.boolean(),
  effectiveMonth: DateSchema2,
  arsEquivalent: import_zod9.z.string().nullable(),
  createdAt: import_zod9.z.iso.datetime()
});
var ExpenseSchema = IncomeSchema.extend({ endMonth: DateSchema2.nullable() });
var MoneySchema3 = import_zod9.z.object({ amount: import_zod9.z.string(), currency: import_zod9.z.literal("ARS") });
var MovementSchema = import_zod9.z.discriminatedUnion("kind", [
  import_zod9.z.object({ kind: import_zod9.z.literal("contribution"), id: IdSchema, placeId: IdSchema, placeName: import_zod9.z.string(), amount: import_zod9.z.string(), currency: import_zod9.z.enum(["ARS", "USD"]), createdAt: import_zod9.z.iso.datetime() }),
  import_zod9.z.object({ kind: import_zod9.z.literal("completion"), id: IdSchema, goalId: IdSchema, goalName: import_zod9.z.string(), placeId: IdSchema, placeName: import_zod9.z.string(), amount: import_zod9.z.string(), currency: import_zod9.z.enum(["ARS", "USD"]), createdAt: import_zod9.z.iso.datetime() }),
  import_zod9.z.object({ kind: import_zod9.z.literal("transfer"), id: IdSchema, fromPlaceId: IdSchema, fromPlaceName: import_zod9.z.string(), toPlaceId: IdSchema, toPlaceName: import_zod9.z.string(), amount: import_zod9.z.string(), currency: import_zod9.z.enum(["ARS", "USD"]), createdAt: import_zod9.z.iso.datetime() })
]);
var FinancesWorkspaceSchema = import_zod9.z.object({
  goalDedicationPercentage: import_zod9.z.string(),
  month: MonthSchema3,
  summary: import_zod9.z.object({ income: MoneySchema3, expenses: MoneySchema3, balance: MoneySchema3, contribution: MoneySchema3 }),
  incomes: import_zod9.z.object({ sources: import_zod9.z.array(SourceSchema), incomes: import_zod9.z.array(IncomeSchema) }),
  expenses: import_zod9.z.object({ sources: import_zod9.z.array(SourceSchema), expenses: import_zod9.z.array(ExpenseSchema) }),
  savings: import_zod9.z.object({ places: import_zod9.z.array(import_zod9.z.object({ id: IdSchema, name: import_zod9.z.string(), balances: import_zod9.z.object({ ARS: import_zod9.z.string(), USD: import_zod9.z.string() }), hasMovements: import_zod9.z.boolean() })), movements: import_zod9.z.array(MovementSchema) })
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
var import_zod10 = require("zod");
var percentageSchema = import_zod10.z.string().refine((value) => {
  const normalized = value.replace(",", ".");
  return /^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(normalized) && Number(normalized) <= 100;
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var onboardingGoalSchema = GoalCreationDraftWireSchema.extend({
  name: import_zod10.z.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  allocations: import_zod10.z.array(
    import_zod10.z.object({ goalId: import_zod10.z.string().min(1), percentage: percentageSchema }).strict()
  )
});
var FinancialOnboardingSchema = import_zod10.z.object({
  goal: onboardingGoalSchema,
  incomes: import_zod10.z.array(IncomeDraftSchema).min(1, "Agreg\xE1 al menos un ingreso recurrente."),
  expenses: import_zod10.z.array(ExpenseDraftSchema).min(1, "Agreg\xE1 al menos un gasto recurrente.")
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
var FinancialOnboardingResponseSchema = import_zod10.z.object({ created: import_zod10.z.boolean() }).strict();

// src/home.schema.ts
var import_zod11 = require("zod");
var CurrencySchema2 = import_zod11.z.enum(["ARS", "USD"]);
var MonthSchema4 = import_zod11.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
var MonthOrDateSchema = import_zod11.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/);
var HomeQuerySchema = import_zod11.z.object({
  currentMonth: MonthSchema4.optional()
}).strict();
var RoadmapIncomeSchema = import_zod11.z.object({
  id: import_zod11.z.string(),
  sourceKind: import_zod11.z.string(),
  sourceId: import_zod11.z.string().nullable(),
  sourceName: import_zod11.z.string(),
  concept: import_zod11.z.string().nullable(),
  amount: import_zod11.z.string(),
  currency: CurrencySchema2,
  recurring: import_zod11.z.boolean(),
  effectiveMonth: MonthOrDateSchema,
  arsEquivalent: import_zod11.z.string().nullable().optional()
}).strict();
var RoadmapExpenseSchema = RoadmapIncomeSchema.extend({
  endMonth: MonthOrDateSchema.nullable()
}).strict();
var RoadmapFinancesSchema = import_zod11.z.object({
  incomes: import_zod11.z.object({
    sources: import_zod11.z.array(import_zod11.z.object({
      id: import_zod11.z.string(),
      name: import_zod11.z.string(),
      normalizedName: import_zod11.z.string()
    }).strict()).optional(),
    incomes: import_zod11.z.array(RoadmapIncomeSchema)
  }).strict(),
  expenses: import_zod11.z.object({
    sources: import_zod11.z.array(import_zod11.z.object({
      id: import_zod11.z.string(),
      name: import_zod11.z.string(),
      normalizedName: import_zod11.z.string()
    }).strict()).optional(),
    expenses: import_zod11.z.array(RoadmapExpenseSchema)
  }).strict()
}).strict();
var RoadmapMonthSchema = import_zod11.z.object({
  month: MonthSchema4,
  objectives: import_zod11.z.array(GoalWorkspaceItemSchema),
  oneTimeExpenses: import_zod11.z.array(RoadmapExpenseSchema),
  recurringExpenses: import_zod11.z.array(RoadmapExpenseSchema),
  endingExpenses: import_zod11.z.array(RoadmapExpenseSchema),
  oneTimeIncomes: import_zod11.z.array(RoadmapIncomeSchema),
  recurringIncomes: import_zod11.z.array(RoadmapIncomeSchema),
  contributions: import_zod11.z.array(ContributionSummarySchema)
}).strict();
var RoadmapDataSchema = import_zod11.z.object({
  undatedObjectives: import_zod11.z.array(GoalWorkspaceItemSchema),
  futureMonths: import_zod11.z.array(RoadmapMonthSchema),
  currentMonth: RoadmapMonthSchema,
  historyMonths: import_zod11.z.array(RoadmapMonthSchema)
}).strict();
var HomeRoadmapMissingSchema = import_zod11.z.object({
  profile: import_zod11.z.literal("missing")
}).strict();
var HomeRoadmapPresentSchema = import_zod11.z.object({
  profile: import_zod11.z.literal("present").optional(),
  roadmap: RoadmapDataSchema,
  completionGoals: import_zod11.z.array(GoalWorkspaceItemSchema)
}).strict();
var HomeRoadmapResponseSchema = import_zod11.z.discriminatedUnion("profile", [
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema
]);

// src/goal-creation.schema.ts
var import_finance_utils = require("@repo/finance-utils");
var import_bignumber2 = __toESM(require("bignumber.js"), 1);
var import_zod12 = require("zod");
var goalTypeSchema = import_zod12.z.enum(["emergency_fund", "purchase", "retirement", "other"]);
var goalPrioritySchema = import_zod12.z.enum(["high", "medium", "low"]);
var goalStrategySchema = import_zod12.z.enum(["save", "invest"]);
var investmentAvailabilitySchema = import_zod12.z.enum(["available_now", "available_from", "long_term"]);
var percentageSchema2 = import_zod12.z.string().refine((value) => {
  try {
    const amount = new import_bignumber2.default(value.replace(",", "."));
    const decimals = amount.decimalPlaces();
    return amount.isFinite() && amount.gte(0) && amount.lte(100) && decimals !== null && decimals <= 2;
  } catch {
    return false;
  }
}, "Ingres\xE1 un porcentaje entre 0% y 100%, con hasta dos decimales.");
var allocationEntrySchema = import_zod12.z.object({
  goalId: import_zod12.z.string().min(1),
  percentage: percentageSchema2
});
var goalCreationDraftSchema = import_zod12.z.object({
  type: goalTypeSchema,
  name: import_zod12.z.string().trim().min(1, "Ingres\xE1 un nombre.").max(120, "Us\xE1 hasta 120 caracteres."),
  targetAmount: import_zod12.z.string(),
  currency: import_zod12.z.enum(["ARS", "USD"]),
  desiredMonth: import_zod12.z.string(),
  priority: goalPrioritySchema,
  strategy: goalStrategySchema,
  annualReturnRate: import_zod12.z.string(),
  availability: investmentAvailabilitySchema,
  availableFromMonth: import_zod12.z.string(),
  allocations: import_zod12.z.array(allocationEntrySchema)
});
function isValidAnnualReturnRate(value) {
  try {
    const rate = new import_bignumber2.default(value.replace(",", "."));
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
      const target = (0, import_finance_utils.parseMoneyInput)(draft.targetAmount, draft.currency);
      if (!target || new import_bignumber2.default(target.amount).lte(0)) context.addIssue({ code: "custom", path: ["targetAmount"], message: "Ingres\xE1 un monto objetivo mayor a cero." });
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
var goalImpactSchema = import_zod12.z.object({
  allocations: import_zod12.z.array(allocationEntrySchema).min(1)
}).superRefine((data, context) => {
  let total = new import_bignumber2.default(0);
  for (const entry of data.allocations) {
    try {
      const entryBn = new import_bignumber2.default(entry.percentage.replace(",", "."));
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
var confirmGoalCreationSchema = import_zod12.z.object({
  draft: goalCreationDraftSchema,
  previewToken: import_zod12.z.string().regex(/^[a-f0-9]{64}$/)
}).superRefine(refineDraftAllocations);
var goalEditRequestSchema = import_zod12.z.object({
  goalId: import_zod12.z.string().uuid()
});
var previewGoalEditSchema = import_zod12.z.object({
  goalId: import_zod12.z.string().uuid(),
  draft: goalCreationDraftSchema
});
var confirmGoalEditSchema = import_zod12.z.object({
  goalId: import_zod12.z.string().uuid(),
  draft: goalCreationDraftSchema,
  previewToken: import_zod12.z.string().regex(/^[a-f0-9]{64}$/)
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
var import_zod13 = require("zod");
var NOTIFICATION_TYPES = [
  "day_close_checkin",
  "savings_digest"
];
var NotificationTypeSchema = import_zod13.z.enum(NOTIFICATION_TYPES);
var NotificationTimeSchema = import_zod13.z.string().regex(
  /^([01]\d|2[0-3]):(00|30)$/,
  "Eleg\xED un horario en punto o y media (ej. 21:00 o 21:30)."
);
var NotificationSettingSchema = import_zod13.z.object({
  type: NotificationTypeSchema,
  enabled: import_zod13.z.boolean(),
  frequency: import_zod13.z.literal("daily"),
  time: NotificationTimeSchema
});
var NotificationSettingsResponseSchema = import_zod13.z.object({
  settings: import_zod13.z.array(NotificationSettingSchema)
});
var UpdateNotificationSettingSchema = import_zod13.z.object({
  enabled: import_zod13.z.boolean().optional(),
  time: NotificationTimeSchema.optional()
}).refine((v) => v.enabled !== void 0 || v.time !== void 0, {
  message: "Indic\xE1 si activar/desactivar o el horario."
});

// src/benefits.schema.ts
var import_zod14 = require("zod");
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
var BenefitCategorySchema = import_zod14.z.enum(BENEFIT_CATEGORIES);
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
var CardNetworkSchema = import_zod14.z.enum(CARD_NETWORKS);
var CARD_TYPES = ["credit", "debit", "prepaid"];
var MEMBERSHIP_USAGES = [
  "wallet_access",
  "account_access",
  "subscription",
  "loyalty"
];
var slug = import_zod14.z.string().min(1).max(80);
var slugList = import_zod14.z.array(slug).min(1).max(50);
var CardSelectorSchema = import_zod14.z.object({
  instrumentSlugs: slugList.optional(),
  issuerProviderSlugs: slugList.optional(),
  excludedIssuerProviderSlugs: slugList.optional(),
  network: CardNetworkSchema.optional(),
  types: import_zod14.z.array(import_zod14.z.enum(CARD_TYPES)).min(1).optional(),
  productLevels: slugList.optional(),
  segments: slugList.optional(),
  issuerCountries: import_zod14.z.array(import_zod14.z.string().length(2)).min(1).optional()
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
var RequirementNodeSchema = import_zod14.z.lazy(
  () => import_zod14.z.union([
    import_zod14.z.object({ allOf: import_zod14.z.array(RequirementNodeSchema).min(1) }).strict(),
    import_zod14.z.object({ anyOf: import_zod14.z.array(RequirementNodeSchema).min(1) }).strict(),
    import_zod14.z.object({ card: CardSelectorSchema }).strict(),
    import_zod14.z.object({ membership: import_zod14.z.object({ instrumentSlug: slug }).strict() }).strict(),
    import_zod14.z.object({
      providerFact: import_zod14.z.object({
        providerSlug: slug,
        key: import_zod14.z.enum(PROVIDER_FACT_KEYS),
        values: import_zod14.z.array(import_zod14.z.union([import_zod14.z.string().min(1), import_zod14.z.boolean()])).min(1)
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
var isoDay = import_zod14.z.iso.date();
var InstrumentFactsSchema = import_zod14.z.object({
  segment: slug.optional(),
  productLevel: slug.optional(),
  issuerCountry: import_zod14.z.string().length(2).optional(),
  membershipStatus: import_zod14.z.enum(["active", "inactive", "unknown"]).optional(),
  membershipValidUntil: isoDay.optional()
}).strict();
var ProviderFactsSchema = import_zod14.z.object({
  salaryAccount: import_zod14.z.boolean().optional(),
  plan: slug.optional(),
  loyaltyLevel: slug.optional()
}).strict();
var BenefitProfileFactsSchema = import_zod14.z.object({
  instrumentFacts: import_zod14.z.record(slug, InstrumentFactsSchema).default({}),
  providerFacts: import_zod14.z.record(slug, ProviderFactsSchema).default({})
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
var BenefitCapSchema = import_zod14.z.object({
  amountMinor: import_zod14.z.number().int().positive().nullable(),
  // null = cap exists, amount unknown
  period: import_zod14.z.enum(CAP_PERIODS),
  scope: import_zod14.z.enum(CAP_SCOPES).nullable(),
  sharedCapGroupId: slug.optional()
}).strict();
var BenefitRulesSchema = import_zod14.z.object({
  eligibility: RequirementSchema,
  eligibilityCompleteness: import_zod14.z.enum(["complete", "incomplete"]),
  unresolved: import_zod14.z.array(import_zod14.z.string().min(1)).default([]),
  offer: import_zod14.z.discriminatedUnion("type", [
    import_zod14.z.object({
      type: import_zod14.z.literal("discount"),
      percentageBps: import_zod14.z.number().int().min(1).max(1e4)
    }),
    import_zod14.z.object({
      type: import_zod14.z.literal("cashback"),
      percentageBps: import_zod14.z.number().int().min(1).max(1e4)
    }),
    import_zod14.z.object({
      type: import_zod14.z.literal("installments"),
      installments: import_zod14.z.number().int().min(2).max(60)
    }),
    import_zod14.z.object({ type: import_zod14.z.literal("points"), description: import_zod14.z.string().min(1) }),
    import_zod14.z.object({ type: import_zod14.z.literal("other"), description: import_zod14.z.string().min(1) })
  ]),
  currency: import_zod14.z.literal("ARS"),
  // null = unknown minimum; 0 = no minimum.
  minimumSpendMinor: import_zod14.z.number().int().nonnegative().nullable(),
  capState: import_zod14.z.enum(["known", "none", "unknown"]),
  caps: import_zod14.z.array(BenefitCapSchema).max(5),
  validity: import_zod14.z.object({
    from: isoDay.nullable(),
    // inclusive, America/Argentina/Buenos_Aires
    to: isoDay.nullable(),
    // inclusive; null = unknown end, NOT unlimited
    weekdays: import_zod14.z.array(import_zod14.z.number().int().min(0).max(6)).min(1).nullable(),
    // 0=Sunday; null = every weekday
    monthDays: import_zod14.z.array(import_zod14.z.number().int().min(1).max(31)).min(1).nullable()
    // null = every day of month
  }).strict(),
  channels: import_zod14.z.object({
    allowed: import_zod14.z.array(slug).default([]),
    excluded: import_zod14.z.array(slug).default([])
  }).strict(),
  requiredActions: import_zod14.z.array(import_zod14.z.string().min(1)).default([]),
  stackable: import_zod14.z.enum(TRI_STATE),
  // ongoing = fixed membership perk; the digest only surfaces it on category match or right after declaring it.
  recurrence: import_zod14.z.enum(["campaign", "ongoing"])
}).strict().superRefine((r, ctx) => {
  if (r.capState === "known" && !r.caps.length)
    ctx.addIssue({ code: "custom", message: "capState known requiere caps" });
  if (r.capState === "none" && r.caps.length)
    ctx.addIssue({ code: "custom", message: "capState none sin caps" });
  if (r.validity.from && r.validity.to && r.validity.from > r.validity.to)
    ctx.addIssue({ code: "custom", message: "vigencia invertida" });
});
var BenefitMatchSchema = import_zod14.z.object({
  benefitId: import_zod14.z.string(),
  eligibility: import_zod14.z.enum(["eligible", "ineligible", "needs_information"]),
  availability: import_zod14.z.enum(["available", "upcoming", "unavailable", "unknown"]),
  nextDate: isoDay.nullable(),
  stale: import_zod14.z.boolean(),
  // Allowed channels are alternatives, not cumulative required actions.
  channels: import_zod14.z.object({
    allowed: import_zod14.z.array(import_zod14.z.string()),
    excluded: import_zod14.z.array(import_zod14.z.string())
  }),
  matchedInstrumentSlugs: import_zod14.z.array(import_zod14.z.string()),
  missingFacts: import_zod14.z.array(import_zod14.z.string()),
  reasons: import_zod14.z.array(import_zod14.z.string()),
  requiredActions: import_zod14.z.array(import_zod14.z.string()),
  estimatedSavingMinor: import_zod14.z.number().int().nonnegative().nullable(),
  estimateAssumptions: import_zod14.z.array(import_zod14.z.string())
});
var BenefitCatalogResponseSchema = import_zod14.z.object({
  providers: import_zod14.z.array(
    import_zod14.z.object({
      slug: import_zod14.z.string(),
      name: import_zod14.z.string(),
      kind: import_zod14.z.enum(PROVIDER_KINDS),
      coverage: import_zod14.z.enum(["active", "partial", "pending"]),
      instruments: import_zod14.z.array(
        import_zod14.z.object({
          slug: import_zod14.z.string(),
          label: import_zod14.z.string(),
          network: import_zod14.z.enum(CARD_NETWORKS).nullable(),
          type: import_zod14.z.enum(INSTRUMENT_TYPES),
          tier: import_zod14.z.string().nullable(),
          issuerProviderSlug: import_zod14.z.string().nullable(),
          segment: import_zod14.z.string().nullable(),
          productLevel: import_zod14.z.string().nullable(),
          usage: import_zod14.z.enum(MEMBERSHIP_USAGES).nullable()
        })
      )
    })
  ),
  categories: import_zod14.z.array(
    import_zod14.z.object({ slug: BenefitCategorySchema, label: import_zod14.z.string() })
  )
});
var UpdateBenefitPreferencesSchema = import_zod14.z.object({
  instrumentFacts: BenefitProfileFactsSchema.shape.instrumentFacts.removeDefault().optional(),
  providerFacts: BenefitProfileFactsSchema.shape.providerFacts.removeDefault().optional(),
  instrumentSlugs: import_zod14.z.array(import_zod14.z.string().min(1)).min(1, "Eleg\xED al menos una tarjeta, cuenta o membres\xEDa.").max(100),
  categories: import_zod14.z.array(BenefitCategorySchema).min(1, "Eleg\xED al menos una categor\xEDa.")
});
var BenefitPreferencesSchema = import_zod14.z.object({
  ...BenefitProfileFactsSchema.shape,
  instrumentSlugs: import_zod14.z.array(import_zod14.z.string()),
  categories: import_zod14.z.array(BenefitCategorySchema),
  enabled: import_zod14.z.boolean()
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
