# Graph Report - web  (2026-09-01)

## Corpus Check
- 316 files · ~353,734 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1430 nodes · 4142 edges · 129 communities (62 shown, 58 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.85)
- Token cost: 47,048 input · 1,937 output

## Community Hubs (Navigation)
- Database And Repositories
- Financial Input Forms
- Goal Workflow State
- Financial Dashboard Display
- Shared UI Primitives
- Goal Validation Schemas
- Goal Creation Editing
- Reports And Charts
- Contribution API
- Goal Lifecycle Completion
- Financial Planning Calculations
- Onboarding Uploads
- Admin Reporting
- Routing Bootstrap
- Contribution Action Sheets
- Home Financial Roadmap
- Allocation Change Workflow
- TypeScript Configuration
- Public Reports
- Goal Allocation Logic
- Onboarding Flow
- Goal Planning Workspace
- Onboarding Definitions
- Component Library Configuration
- Date Picker Controls
- Savings Contribution Planning
- Savings Place Repository
- Income Management
- Goal Impact UI
- Onboarding Upload UI
- Admin Results Backend
- App Route Loaders
- Savings Place Management
- Expense Management Backend
- Income Management Backend
- Goal Lifecycle UI
- Admin CSV Export
- Savings Contribution UI
- Goals Page States
- Root And Goals Routes
- Savings Transfers
- Development Dependencies
- Savings Places Overview
- Financial Workspace State
- Expense Validation Schemas
- Project Scripts
- Admin Result Details
- Financial Onboarding Completion
- Application Shell
- Goal Completion Schemas
- Finances Workspace
- Expense Management
- Runtime Dependencies
- Financial Summary Models
- Onboarding Repeated Items
- Onboarding Draft Persistence
- Financial Onboarding Editing
- Web App Manifest
- Admin Authentication
- Router Setup
- Marketing Landing Page
- Package Metadata
- Goal Creation Tests
- Sign In Page
- Vite Proxy Configuration
- Expense Source Picker
- Income Source Picker
- Site Shell
- API Placeholder Utilities
- Savings Movement Sheet
- AWS S3 Presigner Dependency
- Base UI Dependency
- Class Variance Authority Dependency
- Clerk Localizations Dependency
- Clerk TanStack Start Dependency
- Clsx Dependency
- Date Fns Dependency
- Design Documentation
- Norte Marketing PRD
- Drizzle ORM Dependency
- Geist Font Dependency
- JSDOM Dependency
- Lucide React Dependency
- Motion Dependency
- Nitro Dependency
- PG Dependency
- PostHog Node Dependency
- PostHog React Dependency
- React Dependency
- React Day Picker Dependency
- React DOM Dependency
- Recharts Dependency
- Shared Types Dependency
- Shadcn Dependency
- Sonner Dependency
- Tailwind Merge Dependency
- Tailwind CSS Dependency
- Tailwind Vite Dependency
- TanStack React Devtools Dependency
- TanStack React Form Dependency
- TanStack React Router Dependency
- TanStack Router Devtools Dependency
- TanStack React Start Dependency
- TW Animate CSS Dependency
- Zod Dependency
- Playwright Test Dependency
- Tailwind Typography Dependency
- TanStack Devtools Vite Dependency
- TanStack Router CLI Dependency
- Testing Library DOM Dependency
- Testing Library User Event Dependency
- Postgres Types Dependency
- React DOM Types Dependency
- TypeScript Dependency
- Vite Dependency
- Vite React Plugin Dependency
- Agent Architecture Guidelines
- PostHog Integration Report
- Product Strategy
- Project README

## God Nodes (most connected - your core abstractions)
1. `cn()` - 81 edges
2. `createMoney()` - 60 edges
3. `requireFinancialUser()` - 42 edges
4. `Money` - 39 edges
5. `Button()` - 33 edges
6. `formatMoney()` - 30 edges
7. `buildGoalsWorkspace()` - 27 edges
8. `parseMoneyInput()` - 27 edges
9. `GoalsWorkspaceSource` - 26 edges
10. `CurrencyCode` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Norte Design System` --references--> `Compass Visual Asset`  [INFERRED]
  DESIGN.md → public/images/compass.jpg
- `PRD: Section 4 - What is Norte` --references--> `Roadmap Preview Image`  [EXTRACTED]
  docs/seccion4.md → public/images/roadmap.webp
- `CalendarDayButton()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/calendar.tsx → src/lib/utils.ts
- `SelectGroup()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/select.tsx → src/lib/utils.ts
- `SelectLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/select.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (129 total, 58 thin omitted)

### Community 0 - "Database And Repositories"
Cohesion: 0.07
Nodes (63): db, pool, allocationPlanEntries, AllocationPlanEntry, AllocationPlanSnapshot, allocationPlanSnapshots, Expense, ExpenseSource (+55 more)

### Community 1 - "Financial Input Forms"
Cohesion: 0.10
Nodes (44): Field(), FieldDescription(), FieldError(), FieldLabel(), FieldSet(), fieldVariants, Input, InputProps (+36 more)

### Community 2 - "Goal Workflow State"
Cohesion: 0.09
Nodes (37): serializeAllocationChangeState(), GoalCreationState, parseGoalCreationSubmission(), serializeGoalEditState(), GoalsAppState, confirmAllocationChangeInRepository(), confirmGoalCreationInRepository(), confirmGoalEditInRepository() (+29 more)

### Community 3 - "Financial Dashboard Display"
Cohesion: 0.13
Nodes (23): FinancialSummaryCards(), FinancialSummaryCardsProps, summary, deleteSavingContribution, GoalWorkspaceItem, formatCalendarMonth(), formatCompactMoney(), formatDate() (+15 more)

### Community 4 - "Shared UI Primitives"
Cohesion: 0.11
Nodes (24): Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), FieldContent() (+16 more)

### Community 5 - "Goal Validation Schemas"
Cohesion: 0.11
Nodes (28): allocationChangeDraftSchema, ConfirmAllocationChangeInput, confirmAllocationChangeSchema, ConfirmGoalCreationInput, confirmGoalCreationSchema, ConfirmGoalEditInput, confirmGoalEditSchema, createObjectiveSchema() (+20 more)

### Community 6 - "Goal Creation Editing"
Cohesion: 0.13
Nodes (25): GoalCreationContext, GoalCreationPreviewResult, GoalEditContext, GoalCreationDraft, confirmGoalCreation, confirmGoalEdit, getGoalCreationContext, getGoalEditContext (+17 more)

### Community 7 - "Reports And Charts"
Cohesion: 0.08
Nodes (21): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+13 more)

### Community 8 - "Contribution API"
Cohesion: 0.09
Nodes (29): confirmContribution, deleteContribution, getContributionContext, previewContribution, updateContribution, catchUpMonthSchema, ConfirmContributionInput, confirmContributionSchema (+21 more)

### Community 9 - "Goal Lifecycle Completion"
Cohesion: 0.14
Nodes (23): AllocationChangeProposal, buildGoalCompletionContext(), buildGoalCompletionProposal(), canonicalAmount(), getCurrentAllocation(), getPendingAllocation(), GoalCompletionDraft, GoalCompletionPreviewResult (+15 more)

### Community 10 - "Financial Planning Calculations"
Cohesion: 0.21
Nodes (23): derivePreviousMonthShortfalls(), FixedExpenseSourceKind, getExpenseTotalArs(), getMonthlyBalanceArs(), isExpenseIncludedInMonth(), ONE_TIME_EXPENSE_SOURCES, RECURRING_EXPENSE_SOURCES, CompletionProjection (+15 more)

### Community 11 - "Onboarding Uploads"
Cohesion: 0.15
Nodes (22): saveDraftInput, createOnboardingUpload, getDraftInput, createOnboardingUploadServer(), deleteOnboardingUploadServer(), getOnboardingDraftServer(), saveOnboardingDraftServer(), posthogCapture (+14 more)

### Community 12 - "Admin Reporting"
Cohesion: 0.14
Nodes (23): getAdminCsvRow, getAdminResultFiles, getAdminSession, listAdminCsvRows, listAdminResults, loginAdmin, saveAdminReport, setAdminReportSent (+15 more)

### Community 13 - "Routing Bootstrap"
Cohesion: 0.08
Nodes (26): Route, AppFinancesIndexRoute, AppFinancesRouteRoute, AppFinancesRouteRouteChildren, AppFinancesRouteRouteWithChildren, AppGoalsIndexRoute, AppGoalsRouteRoute, AppGoalsRouteRouteChildren (+18 more)

### Community 14 - "Contribution Action Sheets"
Cohesion: 0.15
Nodes (19): FieldGroup(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle() (+11 more)

### Community 15 - "Home Financial Roadmap"
Cohesion: 0.13
Nodes (21): PreviousMonthShortfall, InitialHomeState, isIncomeIncludedInMonth(), ContributionSummary, GoalsWorkspace, addMonth(), buildRoadmap(), Expense (+13 more)

### Community 16 - "Allocation Change Workflow"
Cohesion: 0.18
Nodes (19): AllocationChangeContext, AllocationChangePreviewResult, AllocationChangeState, buildAllocationChangeProposal(), BuildAllocationChangeProposalInput, AllocationChangeDraft, calculatePercentageSum(), GoalCreationAllocationEntry (+11 more)

### Community 17 - "TypeScript Configuration"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, **/*.ts, **/*.tsx, vite/client, compilerOptions, allowImportingTsExtensions (+16 more)

### Community 18 - "Public Reports"
Cohesion: 0.18
Nodes (12): onboardingDrafts, Report, reportSchema, getPublicReport, markPublicReportCtaClicked, getPublicReportServer(), markPublicReportCtaClickedServer(), getDraft() (+4 more)

### Community 19 - "Goal Allocation Logic"
Cohesion: 0.16
Nodes (22): amountSchema, amountSchema, buildGoalCreationProposal(), getNextCalendarMonthStr(), GoalCreationBefore, GoalCreationProposal, buildCurrentGoalsPlanWorkspace(), GoalPriority (+14 more)

### Community 20 - "Onboarding Flow"
Cohesion: 0.16
Nodes (20): getActiveSteps(), getFirstIncompleteStep(), getInactiveAnswerIds(), getVisibleFields(), deviceIdSchema, getInvitedDeviceId(), deleteOnboardingUpload, getOnboardingDraft (+12 more)

### Community 21 - "Goal Planning Workspace"
Cohesion: 0.15
Nodes (19): PROJECTION_HORIZON_MONTHS, addMonthsToMonth(), buildGoalsWorkspace(), ContributionAllocationSummary, GOAL_STATUS_LABELS, GoalFundingRow, groupGoals(), isGoalCompletionEligible() (+11 more)

### Community 22 - "Onboarding Definitions"
Cohesion: 0.13
Nodes (21): dayOptions, definedAnswerIds, extraIncomeSchema, fixedExpenseExpiryFields, hasDetailedFixedExpense(), hasPositiveAmount(), hasPositiveOther(), hasPositiveRepeatedItem() (+13 more)

### Community 23 - "Component Library Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 24 - "Date Picker Controls"
Cohesion: 0.19
Nodes (14): MonthPickerInputProps, Button(), buttonVariants, Calendar(), CalendarDayButton(), ButtonVariant, Month, MonthCal() (+6 more)

### Community 25 - "Savings Contribution Planning"
Cohesion: 0.16
Nodes (20): buildContributionPreview(), BuildContributionPreviewInput, buildSavingPreview(), BuildSavingPreviewInput, deriveMonthlySavingTargets(), deriveUsdPurchase(), EligibleGoalSource, parseSavingDraft() (+12 more)

### Community 26 - "Savings Place Repository"
Cohesion: 0.20
Nodes (16): getSavingContributionContextServer(), requireFinancialUser(), normalizeSavingsPlaceName(), createSavingsPlaceInRepository(), deleteSavingsPlaceInRepository(), getSavingsPlacesWorkspaceState(), renameSavingsPlaceInRepository(), resolveSavingsPlaceWithExecutor() (+8 more)

### Community 27 - "Income Management"
Cohesion: 0.13
Nodes (16): completeFinancialOnboardingInputSchema, createIncome, deleteIncome, getIncomesWorkspace, updateIncome, conceptSchema, createIncomeSchema, customSourceSchema (+8 more)

### Community 28 - "Goal Impact UI"
Cohesion: 0.18
Nodes (14): Badge(), badgeVariants, AllocationImpactBefore, AllocationImpactComparison(), AllocationImpactComparisonProps, formatGoalProjection(), GoalImpactProps, GoalImpactTransition (+6 more)

### Community 29 - "Onboarding Upload UI"
Cohesion: 0.16
Nodes (14): OnboardingDraft, getFileValidationError(), advanceToCard(), initialAnswers, makeDraft(), posthogCapture, posthogCaptureException, posthogIdentify (+6 more)

### Community 30 - "Admin Results Backend"
Cohesion: 0.29
Nodes (15): getAdminResultDetailsServer(), getAdminResultFilesServer(), listAdminCsvRowsServer(), listAdminResultsServer(), saveAdminReportServer(), setAdminReportSentServer(), requireAdminSession(), csvHeaders (+7 more)

### Community 31 - "App Route Loaders"
Cohesion: 0.21
Nodes (9): getFinancesWorkspace, getGoalsWorkspace, HomeError(), HomeLoading(), Route, Route, loadHomeRoadmap(), Route (+1 more)

### Community 32 - "Savings Place Management"
Cohesion: 0.21
Nodes (13): createSavingsPlace, deleteSavingsPlace, getSavingsPlacesWorkspace, renameSavingsPlace, createSavingsPlaceSchema, deleteSavingsPlaceSchema, renameSavingsPlaceSchema, savingsPlaceSelectionSchema (+5 more)

### Community 33 - "Expense Management Backend"
Cohesion: 0.26
Nodes (14): expenses, expenseSources, createExpenseInRepository(), deleteExpenseInRepository(), expenseValues(), getExpensesWorkspaceState(), insertExpenseWithExecutor(), resolveSource() (+6 more)

### Community 34 - "Income Management Backend"
Cohesion: 0.26
Nodes (14): incomes, incomeSources, createIncomeInRepository(), deleteIncomeInRepository(), getIncomesWorkspaceState(), incomeValues(), insertIncomeWithExecutor(), resolveSource() (+6 more)

### Community 35 - "Goal Lifecycle UI"
Cohesion: 0.26
Nodes (14): rebalanceAllocationEntries(), BuildGoalLifecycleProposalInput, GoalLifecycleContext, GoalLifecyclePreviewResult, GoalLifecycle, confirmGoalLifecycle, getGoalLifecycleContext, previewGoalLifecycle (+6 more)

### Community 36 - "Admin CSV Export"
Cohesion: 0.17
Nodes (14): getAdminCsvRowServer(), cardHeaders, CompletedDraft, CsvRow, CsvValue, escapeCsvValue(), fixedOtherAmount(), fixedOtherValue() (+6 more)

### Community 37 - "Savings Contribution UI"
Cohesion: 0.22
Nodes (10): confirmSavingContribution, previewSavingContribution, updateSavingContribution, SavingContributionContext, SavingContributionSummary, formatDerivedMoney(), SavingContribution(), SavingContributionProps (+2 more)

### Community 38 - "Goals Page States"
Cohesion: 0.21
Nodes (9): GoalsEmpty(), GoalsEmptyProps, GoalsError(), GoalsErrorProps, GoalsLoading(), GoalsWorkspace(), makeFinancialSummary(), makeWorkspace() (+1 more)

### Community 39 - "Root And Goals Routes"
Cohesion: 0.15
Nodes (8): Route, emptyWorkspace, sampleFinancialSummary, sampleGoal, sampleWorkspace, Route, mocks, FileRoutesById

### Community 40 - "Savings Transfers"
Cohesion: 0.15
Nodes (11): transferSavings, SavingsPlaceSummary, SavingsPlaceSheetProps, SavingsTransferSheet(), SavingsTransferSheetProps, bank, cash, places (+3 more)

### Community 41 - "Development Dependencies"
Cohesion: 0.15
Nodes (13): drizzle-kit, devDependencies, drizzle-kit, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react, vitest (+5 more)

### Community 42 - "Savings Places Overview"
Cohesion: 0.22
Nodes (9): GoalCompletionWithdrawal, SavingContribution, SavingsPlaceTransfer, calculateSavingsPlacesWorkspace(), CurrencyCode, getSavingsPlaceEntries(), SavingsPlacesTab(), SavingsPlacesTabProps (+1 more)

### Community 43 - "Financial Workspace State"
Cohesion: 0.26
Nodes (12): ExpensesWorkspace, CompleteFinancialOnboardingInput, FinancesWorkspaceState, FinancialAppState, getFinancesWorkspaceServer(), getFinancialAppStateServer(), IncomesWorkspace, MonthlyFinancialPlan (+4 more)

### Community 44 - "Expense Validation Schemas"
Cohesion: 0.19
Nodes (11): conceptSchema, CreateExpenseInput, createExpenseSchema, customSourceSchema, DeleteExpenseInput, deleteExpenseSchema, expenseDraftSchema, fixedSourceSchema (+3 more)

### Community 45 - "Project Scripts"
Cohesion: 0.17
Nodes (12): scripts, build, check-types, db:generate, db:migrate, db:push, dev, generate-routes (+4 more)

### Community 46 - "Admin Result Details"
Cohesion: 0.30
Nodes (8): getAdminResultDetails, AdminResultDetailsPage(), AnswerValue(), formatValue(), isBlank(), numberFormatter, formatAdminDownloadLabel(), RepeatedItemField

### Community 47 - "Financial Onboarding Completion"
Cohesion: 0.22
Nodes (9): completeFinancialOnboarding, completeFinancialOnboardingServer(), handleSubmit(), addSalary(), mockInvalidate, mockNavigate, posthogCapture, reachExpenseStep() (+1 more)

### Community 48 - "Application Shell"
Cohesion: 0.25
Nodes (5): getFinancialAppState, AppShell(), Route, analytics, emptyRoadmap

### Community 49 - "Goal Completion Schemas"
Cohesion: 0.24
Nodes (9): ConfirmGoalCompletionInput, confirmGoalCompletionSchema, GoalCompletionPreviewInput, goalCompletionPreviewSchema, GoalCompletionRequestInput, goalCompletionRequestSchema, positiveAmountSchema, validPreview (+1 more)

### Community 50 - "Finances Workspace"
Cohesion: 0.31
Nodes (7): MonthPickerInput(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), sampleWorkspace

### Community 51 - "Expense Management"
Cohesion: 0.27
Nodes (7): createExpense, deleteExpense, updateExpense, month(), remove(), save(), posthogCapture

### Community 52 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (9): @aws-sdk/client-s3, bignumber.js, dependencies, @aws-sdk/client-s3, bignumber.js, @tanstack/react-router-ssr-query, @tanstack/router-plugin, @tanstack/react-router-ssr-query (+1 more)

### Community 53 - "Financial Summary Models"
Cohesion: 0.28
Nodes (9): FinancialSummaryCardsSummary, ExpenseMonthInput, IncomeMonthInput, MonthlyFinancialSummary, GoalCompletionContext, GoalCompletionSavingsPlace, GoalCompletionWithdrawalSummary, GoalsFinancialSummary (+1 more)

### Community 54 - "Onboarding Repeated Items"
Cohesion: 0.31
Nodes (8): ExtraIncome, getMonthlyDateOptions(), OnboardingField, formatNumber(), numberFormatter, OnboardingRepeatedItems(), parseNumber(), Props

### Community 55 - "Onboarding Draft Persistence"
Cohesion: 0.39
Nodes (7): filterAnswersForActiveSteps(), OnboardingAnswers, DRAFT_KEY, loadDraft(), LocalDraft, localDraftSchema, saveDraft()

### Community 56 - "Financial Onboarding Editing"
Cohesion: 0.22
Nodes (3): expenseSourceLabel(), FinancialOnboarding(), incomeSourceLabel()

### Community 57 - "Web App Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 58 - "Admin Authentication"
Cohesion: 0.36
Nodes (5): credentialsSchema, getAdminSessionServer(), hasValidAdminCredentials(), loginAdminServer(), useAdminSession()

### Community 59 - "Router Setup"
Cohesion: 0.33
Nodes (5): getRouter(), Register, @tanstack/react-router, mocks, routeTree

### Community 60 - "Marketing Landing Page"
Cohesion: 0.47
Nodes (3): NorteLandingPage(), services, Route

### Community 61 - "Package Metadata"
Cohesion: 0.40
Nodes (4): imports, name, private, type

## Knowledge Gaps
- **353 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+348 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 442 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `Date Picker Controls` to `Financial Input Forms`, `Financial Dashboard Display`, `Shared UI Primitives`, `Savings Contribution UI`, `Goal Creation Editing`, `Goal Lifecycle UI`, `Goals Page States`, `Reports And Charts`, `Savings Places Overview`, `Admin Reporting`, `Contribution Action Sheets`, `Home Financial Roadmap`, `Allocation Change Workflow`, `Finances Workspace`, `Onboarding Flow`, `Onboarding Repeated Items`, `Onboarding Upload UI`, `App Route Loaders`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `cn()` connect `Shared UI Primitives` to `Financial Input Forms`, `Reports And Charts`, `Contribution Action Sheets`, `Finances Workspace`, `Date Picker Controls`, `Goal Impact UI`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `createMoney()` connect `Financial Planning Calculations` to `Database And Repositories`, `Financial Input Forms`, `Goal Workflow State`, `Financial Dashboard Display`, `Savings Movement Sheet`, `Savings Transfers`, `Goal Lifecycle Completion`, `Savings Places Overview`, `Contribution Action Sheets`, `Allocation Change Workflow`, `Finances Workspace`, `Goal Allocation Logic`, `Goal Planning Workspace`, `Financial Onboarding Editing`, `Savings Contribution Planning`, `Date Picker Controls`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _353 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database And Repositories` be split into smaller, more focused modules?**
  _Cohesion score 0.06926406926406926 - nodes in this community are weakly interconnected._
- **Should `Financial Input Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.09526592635885447 - nodes in this community are weakly interconnected._
- **Should `Goal Workflow State` be split into smaller, more focused modules?**
  _Cohesion score 0.09358974358974359 - nodes in this community are weakly interconnected._