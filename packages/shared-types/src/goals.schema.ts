import { z } from 'zod';

const CurrencySchema = z.enum(['ARS', 'USD']);
export const MoneySchema = z.object({ amount: z.string(), currency: CurrencySchema }).strict();
const DateSchema = z.iso.date();
const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const ContributionSummarySchema = z.object({
  id: z.string(), kind: z.enum(['saving', 'investment']), userId: z.string().optional(), amount: z.string(), currency: CurrencySchema,
  placeId: z.string().optional(), placeName: z.string().optional(), arsSpent: z.string().nullable().optional(), effectiveRate: z.string().nullable().optional(),
  createdAt: z.iso.datetime(), allocations: z.array(z.object({ goalId: z.string(), goalName: z.string(), amount: z.string(), percentage: z.string() }).strict()),
}).strict();
const ContributionSchema = ContributionSummarySchema;
export const ProjectionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('available'), completionMonth: MonthSchema }).strict(),
  ...(['target_unavailable', 'no_future_allocation', 'commitment_absent', 'plan_paused', 'investment_assumption_unavailable', 'outside_horizon'] as const).map((status) => z.object({ status: z.literal(status) }).strict()),
]);
export const GoalWorkspaceItemSchema = z.object({
  id: z.string(), name: z.string(), type: z.string(), currency: CurrencySchema, priority: z.enum(['high', 'medium', 'low']), strategy: z.enum(['save', 'invest']), status: z.enum(['active', 'paused', 'completed']),
  createdAt: z.iso.datetime(), desiredDate: DateSchema.optional(), completedAt: z.iso.datetime().optional(), targetAmount: MoneySchema.optional(), savingsValue: MoneySchema, investmentValue: MoneySchema, actualValue: MoneySchema,
  progressPercentage: z.string().optional(), funding: z.array(z.object({ percentage: z.string(), monthlyContribution: MoneySchema.optional(), allocatedBaseAmount: MoneySchema.optional(), allocatedDestinationAmount: MoneySchema.optional(), effectiveMonth: DateSchema }).strict()),
  projection: ProjectionSchema, desiredDateDeltaMonths: z.number().optional(), annualReturnRate: z.string().optional(), availability: z.enum(['available_now', 'available_from', 'long_term']).optional(), availableFrom: DateSchema.optional(), usesPlanningRate: z.boolean(), completionEligible: z.boolean(),
  completionWithdrawals: z.array(z.object({ id: z.string(), placeId: z.string(), placeName: z.string(), amount: MoneySchema, createdAt: z.iso.datetime() }).strict()).optional(), contributions: z.array(ContributionSchema).optional(), savingContributions: z.array(ContributionSchema).optional(),
}).strict();
const GoalSchema = GoalWorkspaceItemSchema;
const FinancialSummarySchema = z.object({ month: MonthSchema, income: MoneySchema, expenses: MoneySchema, balance: MoneySchema, dedicationPercentage: z.string(), contribution: MoneySchema }).strict();
const WorkspaceSchema = z.object({ financialSummary: FinancialSummarySchema, groups: z.array(z.object({ status: z.enum(['active', 'paused', 'completed']), goals: z.array(GoalSchema) }).strict()) }).strict();

const GoalCreationDraftSchema = z.object({
  type: z.enum(['emergency_fund', 'purchase', 'retirement', 'other']), name: z.string(), targetAmount: z.string(),
  currency: CurrencySchema, desiredMonth: z.string(), priority: z.enum(['high', 'medium', 'low']), strategy: z.enum(['save', 'invest']),
  annualReturnRate: z.string(), availability: z.enum(['available_now', 'available_from', 'long_term']), availableFromMonth: z.string(),
  allocations: z.array(z.object({ goalId: z.string(), percentage: z.string() }).strict()),
}).strict();
const GoalProjectionSchema = ProjectionSchema;
const AllocationEntrySchema = z.object({ goalId: z.string(), goalName: z.string(), percentage: z.string(), allocatedBaseAmount: MoneySchema.optional(), allocatedDestinationAmount: MoneySchema.optional(), pending: z.boolean() }).strict();
const ProposalSourceSchema = z.object({
  profile: z.object({ userId: z.string(), baseCurrency: CurrencySchema, expensesKnowledge: z.string(), plannedMonthlyContribution: z.string().nullable().optional(), goalDedicationPercentage: z.string().optional(), onboardingCompleted: z.boolean() }).strict().nullable().optional(),
  goals: z.array(z.object({ id: z.string(), userId: z.string().nullable().optional(), name: z.string(), type: z.string(), targetAmount: z.string().nullable().optional(), currency: CurrencySchema, priority: z.enum(['high', 'medium', 'low']), strategy: z.enum(['save', 'invest']), status: z.enum(['active', 'paused', 'completed']), desiredDate: z.string().nullable().optional(), completedAt: z.string().nullable().optional(), emergencyFundMonths: z.number().nullable().optional(), createdAt: z.string() }).strict()),
  savingsPositions: z.array(z.object({ id: z.string(), goalId: z.string(), amount: z.string(), currency: CurrencySchema, location: z.string().nullable().optional() }).strict()),
  investmentPositions: z.array(z.object({ id: z.string(), goalId: z.string(), currentValue: z.string(), currency: CurrencySchema, annualReturnRate: z.string().nullable().optional(), availability: z.enum(['available_now', 'available_from', 'long_term']).nullable().optional(), availableFrom: z.string().nullable().optional() }).strict()),
  snapshots: z.array(z.object({ id: z.string(), userId: z.string().nullable().optional(), effectiveMonth: z.string() }).strict()),
  allocations: z.array(z.object({ id: z.string(), snapshotId: z.string(), goalId: z.string(), percentage: z.string() }).strict()),
  contributions: z.array(ContributionSchema).optional(), savingContributions: z.array(ContributionSchema).optional(),
  incomes: z.array(z.object({ id: z.string(), sourceKind: z.string(), sourceId: z.string().nullable(), sourceName: z.string().nullable(), concept: z.string().nullable(), amount: z.string(), currency: CurrencySchema, recurring: z.boolean(), effectiveMonth: z.string() }).strict()).optional(),
  expenses: z.array(z.object({ id: z.string(), sourceKind: z.string(), sourceId: z.string().nullable(), sourceName: z.string().nullable(), concept: z.string().nullable(), amount: z.string(), currency: CurrencySchema, recurring: z.boolean(), effectiveMonth: z.string(), endMonth: z.string().nullable() }).strict()).optional(),
  completionWithdrawals: z.array(z.object({ id: z.string(), goalId: z.string(), placeId: z.string(), placeName: z.string(), amount: z.string(), currency: CurrencySchema, createdAt: z.string() }).strict()).optional(),
}).strict();
const GoalCreationProposalSchema = z.object({
  normalizedGoal: z.object({ name: z.string(), type: z.enum(['emergency_fund', 'purchase', 'retirement', 'other']), targetAmount: MoneySchema.optional(), currency: CurrencySchema, priority: z.enum(['high', 'medium', 'low']), strategy: z.enum(['save', 'invest']), desiredDate: DateSchema.optional(), emergencyFundMonths: z.number().optional() }).strict(),
  investment: z.object({ annualReturnRate: z.string(), availability: z.enum(['available_now', 'available_from', 'long_term']), availableFrom: DateSchema.optional() }).strict().optional(),
  allocation: z.object({ monthlyContribution: MoneySchema.optional(), effectiveMonth: z.string(), entries: z.array(AllocationEntrySchema), totalPercentage: z.string() }).strict(),
  impacts: z.array(z.object({ goalId: z.string(), goalName: z.string(), before: z.discriminatedUnion('status', [z.object({ status: z.literal('not_created') }).strict(), z.object({ status: z.literal('existing'), projection: GoalProjectionSchema, allocatedMonthlyAmounts: z.array(MoneySchema) }).strict()]), after: GoalProjectionSchema }).strict()),
  proposedSource: ProposalSourceSchema,
}).strict();
export const GoalCreationDraftWireSchema = GoalCreationDraftSchema;
export const ConfirmGoalCreationWireSchema = z.object({ draft: GoalCreationDraftSchema, previewToken: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const GoalCreationContextWireSchema = z.object({ currentMonth: MonthSchema, expensesKnowledge: z.enum(['known', 'unknown']), hasEmergencyFund: z.boolean(), plannedMonthlyContribution: MoneySchema.optional(), currentAllocation: z.object({ effectiveMonth: z.string(), entries: z.array(z.object({ goalId: z.string(), percentage: z.string() }).strict()) }).strict().optional() }).strict();
export const GoalCreationContextMissingSchema = z.object({ profile: z.literal('missing') }).strict();
export const GoalCreationContextPresentSchema = z.object({ profile: z.literal('present'), context: GoalCreationContextWireSchema }).strict();
export const GoalCreationContextStateSchema = z.discriminatedUnion('profile', [GoalCreationContextMissingSchema, GoalCreationContextPresentSchema]);
export const GoalCreationPreviewSchema = z.object({ proposal: GoalCreationProposalSchema, previewToken: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const GoalCreationCreatedSchema = z.object({ status: z.literal('created'), goalId: z.string() }).strict();
export const GoalCreationStaleSchema = z.object({ status: z.literal('stale'), preview: GoalCreationPreviewSchema }).strict();
export const GoalCreationConfirmationSchema = z.discriminatedUnion('status', [GoalCreationCreatedSchema, GoalCreationStaleSchema]);

export const AllocationChangeDraftWireSchema = z.object({
  dedicationPercentage: z.number().int().min(0).max(100),
  allocations: z.array(z.object({ goalId: z.string(), percentage: z.string() }).strict()).min(1),
}).strict();
export const ConfirmAllocationChangeWireSchema = z.object({ draft: AllocationChangeDraftWireSchema, previewToken: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const AllocationSchema = GoalCreationProposalSchema.shape.allocation;
const ImpactsSchema = GoalCreationProposalSchema.shape.impacts;
export const AllocationChangePreviewSchema = z.object({
  proposal: z.object({
    dedicationPercentage: z.number().int().min(0).max(100), allocation: AllocationSchema,
    impacts: ImpactsSchema, proposedSource: ProposalSourceSchema,
  }).strict(),
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const AllocationChangeUpdatedSchema = z.object({ status: z.literal('updated') }).strict();
export const AllocationChangeStaleSchema = z.object({ status: z.literal('stale'), preview: AllocationChangePreviewSchema }).strict();
export const AllocationChangeConfirmationSchema = z.discriminatedUnion('status', [AllocationChangeUpdatedSchema, AllocationChangeStaleSchema]);
const AllocationSnapshotSchema = z.object({ effectiveMonth: z.string(), entries: z.array(z.object({ goalId: z.string(), percentage: z.string() }).strict()) }).strict();
export const AllocationChangeContextSchema = z.object({
  currentMonth: MonthSchema, financialSummary: FinancialSummarySchema, plannedMonthlyContribution: MoneySchema.optional(),
  activeGoals: z.array(z.object({ id: z.string(), name: z.string(), currency: CurrencySchema, projection: ProjectionSchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(), pendingAllocation: AllocationSnapshotSchema.optional(),
}).strict();
export const AllocationChangeContextStateSchema = z.discriminatedUnion('profile', [
  GoalCreationContextMissingSchema,
  z.object({ profile: z.literal('present'), context: AllocationChangeContextSchema }).strict(),
]);

export const GoalLifecycleActionSchema = z.enum(['pause', 'resume']);
const GoalLifecycleAllocationEntrySchema = z.object({ goalId: z.string(), percentage: z.string() }).strict();
export const GoalLifecycleContextSchema = z.object({
  goalId: z.string(), lifecycle: GoalLifecycleActionSchema, goalName: z.string(), goalCurrency: CurrencySchema, currentMonth: MonthSchema,
  plannedMonthlyContribution: MoneySchema.optional(),
  activeGoals: z.array(z.object({ id: z.string(), name: z.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(), pendingAllocation: AllocationSnapshotSchema.optional(),
}).strict();
export const GoalLifecyclePreviewWireSchema = z.object({ lifecycle: GoalLifecycleActionSchema, allocations: z.array(GoalLifecycleAllocationEntrySchema).optional() }).strict();
export const ConfirmGoalLifecycleWireSchema = z.object({
  lifecycle: GoalLifecycleActionSchema, allocations: z.array(GoalLifecycleAllocationEntrySchema), previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const GoalStatusSchema = z.enum(['active', 'paused', 'completed']);
export const GoalLifecyclePreviewSchema = z.object({
  proposal: z.object({
    lifecycle: GoalLifecycleActionSchema, goalId: z.string(), nextStatus: GoalStatusSchema,
    transition: z.object({ goalId: z.string(), status: GoalStatusSchema }).strict(), pauseMonthlyCommitment: z.boolean(),
    allocation: AllocationSchema, persistedAllocation: AllocationSnapshotSchema, impacts: ImpactsSchema, proposedSource: ProposalSourceSchema,
  }).strict(),
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const GoalLifecycleUpdatedSchema = z.object({ status: z.literal('updated') }).strict();
export const GoalLifecycleStaleSchema = z.object({ status: z.literal('stale'), preview: GoalLifecyclePreviewSchema }).strict();
export const GoalLifecycleConfirmationSchema = z.discriminatedUnion('status', [GoalLifecycleUpdatedSchema, GoalLifecycleStaleSchema]);

export const GoalCompletionContextSchema = z.object({
  goalId: z.string(), goalName: z.string(), targetAmount: MoneySchema, savingsValue: MoneySchema, currentMonth: MonthSchema,
  plannedMonthlyContribution: MoneySchema.optional(),
  savingsPlaces: z.array(z.object({ id: z.string(), name: z.string(), balance: MoneySchema }).strict()),
  activeGoals: z.array(z.object({ id: z.string(), name: z.string(), currency: CurrencySchema }).strict()),
  currentAllocation: AllocationSnapshotSchema.optional(), pendingAllocation: AllocationSnapshotSchema.optional(),
}).strict();
export const GoalCompletionContextPresentSchema = z.object({ profile: z.literal('present'), context: GoalCompletionContextSchema }).strict();
export const GoalCompletionContextStateSchema = z.discriminatedUnion('profile', [GoalCreationContextMissingSchema, GoalCompletionContextPresentSchema]);
export const GoalCompletionPreviewWireSchema = z.object({
  withdrawals: z.array(z.object({ placeId: z.string(), amount: z.string() }).strict()),
  allocations: z.array(GoalLifecycleAllocationEntrySchema),
}).strict();
export const ConfirmGoalCompletionWireSchema = z.object({
  withdrawals: z.array(z.object({ placeId: z.string(), amount: z.string() }).strict()),
  allocations: z.array(GoalLifecycleAllocationEntrySchema),
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const GoalCompletionPreviewSchema = z.object({
  proposal: z.object({
    goalId: z.string(), goalName: z.string(), targetAmount: MoneySchema,
    withdrawals: z.array(z.object({ placeId: z.string(), placeName: z.string(), amount: MoneySchema }).strict()),
    allocation: AllocationSchema, persistedAllocation: AllocationSnapshotSchema, pauseMonthlyCommitment: z.boolean(),
    impacts: ImpactsSchema, proposedSource: ProposalSourceSchema,
  }).strict(),
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const GoalCompletionCompletedSchema = z.object({ status: z.literal('completed'), completedAt: z.iso.datetime() }).strict();
export const GoalCompletionStaleSchema = z.object({ status: z.literal('stale'), preview: GoalCompletionPreviewSchema }).strict();
export const GoalCompletionInvalidSchema = z.object({ status: z.literal('invalid'), message: z.string() }).strict();
export const GoalCompletionConfirmationSchema = z.discriminatedUnion('status', [GoalCompletionCompletedSchema, GoalCompletionStaleSchema, GoalCompletionInvalidSchema]);

export const GoalPlanQueryWireSchema = z.object({ goalId: z.string().uuid().optional(), action: GoalLifecycleActionSchema.optional() })
  .refine((query) => query.action === undefined || query.goalId !== undefined, { message: 'Falta el objetivo de la acción.' });
export const GoalIdPathWireSchema = z.object({ id: z.string().uuid() }).strict();
export const GoalPlanEditContextWireSchema = z.object({
  goalId: z.string().uuid(), status: z.enum(['active', 'paused']), draft: GoalCreationDraftSchema,
}).strict();
export const GoalPlanContextPresentSchema = z.object({
  profile: z.literal('present'), context: GoalCreationContextWireSchema,
  editContext: GoalPlanEditContextWireSchema.optional(), allocationContext: AllocationChangeContextSchema.optional(), lifecycleContext: GoalLifecycleContextSchema.optional(),
}).strict();
export const GoalPlanContextStateSchema = z.discriminatedUnion('profile', [GoalCreationContextMissingSchema, GoalPlanContextPresentSchema]);
export const GoalEditConfirmWireSchema = z.object({ draft: GoalCreationDraftSchema, previewToken: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const GoalEditUpdatedSchema = z.object({ status: z.literal('updated') }).strict();
export const GoalEditStaleSchema = z.object({ status: z.literal('stale'), preview: GoalCreationPreviewSchema }).strict();
export const GoalEditConfirmationSchema = z.discriminatedUnion('status', [GoalEditUpdatedSchema, GoalEditStaleSchema]);

export const GoalsWorkspaceMissingSchema = z.object({ profile: z.literal('missing') }).strict();
export const GoalsWorkspacePresentSchema = z.object({ profile: z.literal('present'), workspace: WorkspaceSchema }).strict();
export const GoalsWorkspaceSchema = z.discriminatedUnion('profile', [GoalsWorkspaceMissingSchema, GoalsWorkspacePresentSchema]);
export type GoalsWorkspace = z.infer<typeof GoalsWorkspaceSchema>;
export type GoalsWorkspaceData = z.infer<typeof WorkspaceSchema>;
export type GoalWorkspaceItem = GoalsWorkspaceData['groups'][number]['goals'][number];
export type GoalStatus = GoalWorkspaceItem['status'];
export type GoalCreationDraftWire = z.infer<typeof GoalCreationDraftWireSchema>;
export type GoalCreationContextState = z.infer<typeof GoalCreationContextStateSchema>;
export type GoalCreationPreview = z.infer<typeof GoalCreationPreviewSchema>;
export type GoalCreationConfirmation = z.infer<typeof GoalCreationConfirmationSchema>;
export type AllocationChangeDraftWire = z.infer<typeof AllocationChangeDraftWireSchema>;
export type AllocationChangeContext = z.infer<typeof AllocationChangeContextSchema>;
export type AllocationChangeContextState = z.infer<typeof AllocationChangeContextStateSchema>;
export type AllocationChangePreview = z.infer<typeof AllocationChangePreviewSchema>;
export type AllocationChangeConfirmation = z.infer<typeof AllocationChangeConfirmationSchema>;
export type GoalLifecycleContext = z.infer<typeof GoalLifecycleContextSchema>;
export type GoalLifecyclePreview = z.infer<typeof GoalLifecyclePreviewSchema>;
export type GoalLifecycleConfirmation = z.infer<typeof GoalLifecycleConfirmationSchema>;
export type GoalCompletionContext = z.infer<typeof GoalCompletionContextSchema>;
export type GoalCompletionContextState = z.infer<typeof GoalCompletionContextStateSchema>;
export type GoalCompletionPreview = z.infer<typeof GoalCompletionPreviewSchema>;
export type GoalCompletionConfirmation = z.infer<typeof GoalCompletionConfirmationSchema>;
export type GoalPriority = GoalWorkspaceItem['priority'];
export type ContributionSummary = z.infer<typeof ContributionSummarySchema>;
export type SavingContributionSummary = ContributionSummary;
export type GoalsFinancialSummary = GoalsWorkspaceData['financialSummary'];
export type GoalStrategy = GoalWorkspaceItem['strategy'];
export type GoalProjection = GoalWorkspaceItem['projection'];
export type GoalFundingRow = GoalWorkspaceItem['funding'][number];
export type ContributionAllocationSummary = ContributionSummary['allocations'][number];
export type ContributionKind = ContributionSummary['kind'];
export type InvestmentAvailability = NonNullable<GoalWorkspaceItem['availability']>;
export type GoalCompletionWithdrawalSummary = NonNullable<GoalWorkspaceItem['completionWithdrawals']>[number];
export type GoalsAppState = GoalsWorkspace;
export type GoalCreationContext = z.infer<typeof GoalCreationContextWireSchema>;
export type GoalCreationPreviewResult = GoalCreationPreview;
export type GoalLifecyclePreviewResult = GoalLifecyclePreview;
export type AllocationChangePreviewResult = AllocationChangePreview;
export type GoalCompletionPreviewResult = GoalCompletionPreview;
