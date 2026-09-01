# Graph Report - app  (2026-09-01)

## Corpus Check
- 404 files · ~397,511 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2414 nodes · 5282 edges · 220 communities (124 shown, 85 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18261d54`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- goals.repository.server.ts
- goal-lifecycle.ts
- placeholder.controller.ts
- db/schema.ts
- IncomeSheet.tsx
- savings-places.functions.ts
- goals.functions.ts
- GoalCreation.tsx
- goal-creation.ts
- routeTree.gen.ts
- goals/route.tsx
- formatMoney
- seccion4.md
- FinancialOnboarding.tsx
- scripts
- app/index.tsx
- Agent skills
- NORTE-PRD-development-spec.md
- SavingsTransferSheet.tsx
- ExpenseSheet.tsx
- cn
- preguntas.md
- admin.functions.ts
- incomes.ts
- onboarding.server.ts
- createMoney
- WhatsappConnectionService
- goals.ts
- informe-page.tsx
- compilerOptions
- financial.functions.ts
- compilerOptions
- shared-types/package.json
- tasks
- button.tsx
- saving-contribution.ts
- UsersService
- components.json
- Design System: Norte
- admin.server.ts
- requireFinancialUser
- compilerOptions
- Money
- definition.ts
- expenses.repository.server.ts
- onboarding/repository.server.ts
- scripts
- incomes.repository.server.ts
- onboarding-page.test.tsx
- Home and Financial Roadmap
- app.module.ts
- Onboarding And Initial Plan
- Plan Deviations and Recommendations
- dependencies
- DatabaseShutdownService
- WhatsappAuthStoreService
- Building For Production
- saving-contribution.functions.ts
- csv.ts
- placeholder.schema.ts
- Contributions and Investments
- Foundations and Financial Model
- Goals and Allocation MVP
- users.service.ts
- devDependencies
- Income, Expenses, and Cash Flow
- NestJS Core
- NestJS Security
- scripts
- Product
- app/route.test.tsx
- financial.ts
- IncomeSheet.test.tsx
- Decimal-Safe Money Arithmetic
- NestJS Drizzle
- NestJS Testing
- NestJS Zod
- api/README.md
- Columnas del CSV administrativo
- router.tsx
- dependencies
- goals/route.test.tsx
- Home and Financial Onboarding Critique
- exclude
- File structure
- Admin Result Detail Design
- Gastos post-cierre en archivo y cuotas mes a mes
- Gastos: adicionales dinámicos
- manifest.json
- SavingContribution.tsx
- Domain rules
- Norte Landing Page Migration Design
- Onboarding Questionnaire Design
- api/AGENTS.md
- api/package.json
- devDependencies
- Caratula de clasificacion de gastos
- Total directo y conceptos de gastos
- Compras necesarias dinámicas
- Informe Section 4 Layout & Styling Spec
- PostHog post-wizard report
- Issue tracker: GitHub
- NORTE Product Requirements Document
- Domain rules
- nest-cli.json
- File Structure
- Gastos Adicionales Dinamicos Implementation Plan
- Gastos post-cierre visibles al elegir archivo
- Design Details
- App Subtle Grid Surface Design
- Onboarding Mobile First-Step Design
- NorteLandingPage.tsx
- TanStack Start Folder Structure
- GitHub Issue Operations
- AppService
- Total directo y conceptos de gastos Implementation Plan
- File structure
- Global Constraints
- Gastos post-cierre visibles al elegir archivo Implementation Plan
- Global Constraints
- web/package.json
- sign-in.$.tsx
- web/AGENTS.md
- vite.config.ts
- SiteShell.tsx
- api.ts
- drizzle-orm
- @nestjs/config
- @nestjs/core
- @nestjs/platform-express
- nestjs-zod
- pg
- qrcode-terminal
- @whiskeysockets/baileys
- drizzle-kit
- eslint
- eslint-config-prettier
- @eslint/eslintrc
- eslint-plugin-prettier
- globals
- @nestjs/cli
- @nestjs/schematics
- @nestjs/testing
- prettier
- supertest
- @swc/core
- ts-node
- tsconfig-paths
- @types/express
- @types/node
- @types/pg
- @types/qrcode-terminal
- @types/supertest
- typescript
- typescript-eslint
- unplugin-swc
- vitest
- @vitest/coverage-v8
- placeholder.entity.ts
- @aws-sdk/s3-request-presigner
- bignumber.js
- class-variance-authority
- @clerk/localizations
- @clerk/tanstack-react-start
- clsx
- date-fns
- drizzle-orm
- @fontsource-variable/geist
- lucide-react
- motion
- nitro
- pg
- posthog-node
- @posthog/react
- react
- react-day-picker
- react-dom
- recharts
- @repo/shared-types
- sonner
- tailwind-merge
- tailwindcss
- @tailwindcss/vite
- @tanstack/react-devtools
- @tanstack/react-router
- @tanstack/react-router-devtools
- @tanstack/react-router-ssr-query
- @tanstack/react-start
- @tanstack/router-plugin
- tw-animate-css
- zod
- jsdom
- @playwright/test
- @tailwindcss/typography
- @tanstack/devtools-vite
- @tanstack/router-cli
- @testing-library/dom
- @types/node
- @types/react-dom
- typescript
- vite
- @vitejs/plugin-react
- vitest
- domain.md
- triage-labels.md
- goal-completion.ts
- FinancialOnboarding.test.tsx
- money.ts
- __root.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 81 edges
2. `createMoney()` - 60 edges
3. `requireFinancialUser()` - 42 edges
4. `Money` - 34 edges
5. `Button()` - 34 edges
6. `formatMoney()` - 32 edges
7. `parseMoneyInput()` - 29 edges
8. `buildGoalsWorkspace()` - 27 edges
9. `GoalsWorkspaceSource` - 25 edges
10. `compilerOptions` - 23 edges

## Surprising Connections (you probably didn't know these)
- `ExpenseMonthInput` --references--> `Money`  [EXTRACTED]
  apps/web/src/features/financial/expenses.ts → apps/web/src/lib/money.ts
- `IncomeMonthInput` --references--> `Money`  [EXTRACTED]
  apps/web/src/features/financial/incomes.ts → apps/web/src/lib/money.ts
- `BuildSavingPreviewInput` --references--> `GoalsWorkspaceSource`  [EXTRACTED]
  apps/web/src/features/contributions/saving-contribution.ts → apps/web/src/features/goals/goals.ts
- `CalendarDayButton()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/calendar.tsx → apps/web/src/lib/utils.ts
- `PopoverDescription()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/popover.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (220 total, 85 thin omitted)

### Community 0 - "goals.repository.server.ts"
Cohesion: 0.11
Nodes (54): getNextCalendarMonth(), buildAllocationChangeProposal(), buildGoalCreationProposal(), GoalCreationState, serializeGoalCreationState(), serializeGoalEditState(), GoalLifecycleState, serializeGoalLifecycleState() (+46 more)

### Community 1 - "goal-lifecycle.ts"
Cohesion: 0.20
Nodes (17): Badge(), badgeVariants, GoalCreationImpact, BuildGoalLifecycleProposalInput, GoalLifecycleContext, GoalLifecyclePreviewResult, GoalLifecycleProposal, GoalLifecycle (+9 more)

### Community 2 - "placeholder.controller.ts"
Cohesion: 0.11
Nodes (22): CreatePlaceholderDto, DeletePlaceholderResponseDto, PlaceholderListResponseDto, PlaceholderResponseDto, UpdatePlaceholderDto, PlaceholderController, ApiOperation, ApiResponse (+14 more)

### Community 3 - "db/schema.ts"
Cohesion: 0.10
Nodes (33): db, pool, allocationPlanEntries, AllocationPlanEntry, AllocationPlanSnapshot, allocationPlanSnapshots, Expense, expenses (+25 more)

### Community 4 - "IncomeSheet.tsx"
Cohesion: 0.10
Nodes (27): MonthPickerInput(), Field(), FieldDescription(), FieldError(), FieldLabel(), fieldVariants, Input, InputProps (+19 more)

### Community 5 - "savings-places.functions.ts"
Cohesion: 0.11
Nodes (20): createSavingsPlace, deleteSavingsPlace, getSavingsPlacesWorkspace, renameSavingsPlace, createSavingsPlaceSchema, deleteSavingsPlaceSchema, renameSavingsPlaceSchema, SavingsPlaceSelection (+12 more)

### Community 6 - "goals.functions.ts"
Cohesion: 0.08
Nodes (37): allocationChangeDraftSchema, ConfirmAllocationChangeInput, confirmAllocationChangeSchema, allocationEntrySchema, ConfirmGoalCreationInput, confirmGoalCreationSchema, ConfirmGoalEditInput, confirmGoalEditSchema (+29 more)

### Community 7 - "GoalCreation.tsx"
Cohesion: 0.13
Nodes (25): GoalCreationContext, GoalCreationPreviewResult, GoalEditContext, GoalCreationDraft, confirmGoalCreation, confirmGoalEdit, getGoalEditContext, previewGoalCreation (+17 more)

### Community 8 - "goal-creation.ts"
Cohesion: 0.14
Nodes (25): Slider(), calculatePercentageSum(), getNextCalendarMonthStr(), GoalCreationAllocation, GoalCreationAllocationEntry, GoalCreationBefore, GoalCreationProposal, PENDING_GOAL_ID (+17 more)

### Community 9 - "routeTree.gen.ts"
Cohesion: 0.08
Nodes (26): Route, AppFinancesIndexRoute, AppFinancesRouteRoute, AppFinancesRouteRouteChildren, AppFinancesRouteRouteWithChildren, AppGoalsIndexRoute, AppGoalsRouteRoute, AppGoalsRouteRouteChildren (+18 more)

### Community 10 - "goals/route.tsx"
Cohesion: 0.21
Nodes (9): GoalsEmpty(), GoalsEmptyProps, GoalsError(), GoalsErrorProps, GoalsLoading(), GoalsWorkspace(), makeFinancialSummary(), makeWorkspace() (+1 more)

### Community 11 - "formatMoney"
Cohesion: 0.12
Nodes (26): FinancialSummaryCards(), FinancialSummaryCardsProps, FinancialSummaryCardsSummary, summary, getPreviousCalendarMonth(), MonthlyFinancialSummary, GoalsWorkspace, GoalWorkspaceItem (+18 more)

### Community 12 - "seccion4.md"
Cohesion: 0.05
Nodes (37): Bloque 1 — Roadmap vivo, Bloque 2 — Decisiones y WhatsApp, Cierre comercial, Confirmación post-click, Copy completo propuesto, Copy final en bloque listo para implementar, Criterio de aceptación, CTA button (+29 more)

### Community 13 - "FinancialOnboarding.tsx"
Cohesion: 0.14
Nodes (7): expenseSourceLabel(), FinancialOnboarding(), incomeSourceLabel(), OnboardingExpense, OnboardingIncome, OnboardingStep, STEP_LABELS

### Community 14 - "scripts"
Cohesion: 0.05
Nodes (37): author, description, devDependencies, turbo, typescript, turbo, typescript, keywords (+29 more)

### Community 15 - "app/index.tsx"
Cohesion: 0.26
Nodes (9): getFinancesWorkspace, getGoalsWorkspace, HomeError(), HomeLoading(), Route, Route, loadHomeRoadmap(), Route (+1 more)

### Community 16 - "Agent skills"
Cohesion: 0.33
Nodes (5): Agent skills, Domain docs, Git behavior, Issue tracker, Triage labels

### Community 18 - "SavingsTransferSheet.tsx"
Cohesion: 0.15
Nodes (18): FieldGroup(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetOverlay(), SheetTitle(), transferSavings (+10 more)

### Community 19 - "ExpenseSheet.tsx"
Cohesion: 0.23
Nodes (12): createExpense, deleteExpense, updateExpense, parseMoneyInput(), month(), defaultDraft(), ExpenseFormDraft, ExpenseRow (+4 more)

### Community 20 - "cn"
Cohesion: 0.12
Nodes (22): Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), FieldContent() (+14 more)

### Community 21 - "preguntas.md"
Cohesion: 0.06
Nodes (33): **Bloque 0 — Calibrador**, **Bloque 1 — Ingresos**, **Bloque 2 — Egresos (montos mensuales)**, **Bloque 3 — Tarjetas**, **Cierre**, **Contrato de datos — Excel de salida**, **Mapeo pregunta → informe**, **Notas de implementación** (+25 more)

### Community 22 - "admin.functions.ts"
Cohesion: 0.10
Nodes (33): getAdminCsvRow, getAdminResultDetails, getAdminResultFiles, getAdminSession, listAdminCsvRows, listAdminResults, saveAdminReport, setAdminReportSent (+25 more)

### Community 23 - "incomes.ts"
Cohesion: 0.11
Nodes (25): ExpensesWorkspace, FinancesWorkspaceState, FIXED_INCOME_SOURCES, FixedIncomeSourceKind, IncomeMonthInput, IncomesWorkspace, isIncomeIncludedInMonth(), ONE_TIME_INCOME_SOURCES (+17 more)

### Community 24 - "onboarding.server.ts"
Cohesion: 0.13
Nodes (27): saveDraftInput, createOnboardingUpload, deleteOnboardingUpload, getDraftInput, getOnboardingDraft, saveOnboardingDraft, createOnboardingUploadServer(), deleteOnboardingUploadServer() (+19 more)

### Community 25 - "createMoney"
Cohesion: 0.19
Nodes (21): ExpenseMonthInput, FIXED_EXPENSE_SOURCES, FixedExpenseSourceKind, getExpenseTotalArs(), getMonthlyBalanceArs(), isExpenseIncludedInMonth(), ONE_TIME_EXPENSE_SOURCES, RECURRING_EXPENSE_SOURCES (+13 more)

### Community 26 - "WhatsappConnectionService"
Cohesion: 0.14
Nodes (5): Injectable, WhatsappConnectionService, ReplySocket, Injectable, WhatsappMessageService

### Community 27 - "goals.ts"
Cohesion: 0.14
Nodes (17): convertCommitmentToDestination(), addMonthsToMonth(), ContributionAllocationSummary, GOAL_STATUS_LABELS, GoalFundingRow, GoalsAppState, groupGoals(), PRIORITY_ORDER (+9 more)

### Community 28 - "informe-page.tsx"
Cohesion: 0.07
Nodes (26): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+18 more)

### Community 29 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+17 more)

### Community 30 - "financial.functions.ts"
Cohesion: 0.09
Nodes (27): amountSchema, conceptSchema, CreateExpenseInput, createExpenseSchema, customSourceSchema, DeleteExpenseInput, deleteExpenseSchema, expenseDraftSchema (+19 more)

### Community 31 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+16 more)

### Community 32 - "shared-types/package.json"
Cohesion: 0.08
Nodes (24): dependencies, zod, devDependencies, tsup, @types/node, vitest, exports, @types/node (+16 more)

### Community 33 - "tasks"
Cohesion: 0.09
Nodes (24): ^build, .env*, ^lint, .output/**, $TURBO_DEFAULT$, .vinxi/**, dependsOn, inputs (+16 more)

### Community 34 - "button.tsx"
Cohesion: 0.16
Nodes (17): MonthPickerInputProps, Button(), buttonVariants, Calendar(), CalendarDayButton(), ButtonVariant, Month, MonthCal() (+9 more)

### Community 35 - "saving-contribution.ts"
Cohesion: 0.11
Nodes (40): buildContributionPreview(), BuildContributionPreviewInput, buildSavingPreview(), BuildSavingPreviewInput, deriveMonthlyContributionTargets(), deriveMonthlySavingTargets(), derivePreviousMonthShortfalls(), deriveUsdPurchase() (+32 more)

### Community 36 - "UsersService"
Cohesion: 0.12
Nodes (21): ApiOperation, ApiResponse, ApiTags, Body, Controller, Get, Param, Post (+13 more)

### Community 37 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 38 - "Design System: Norte"
Cohesion: 0.09
Nodes (21): Buttons, Cards / Containers, Chips, Colors, Components, Design System: Norte, Do:, Do's and Don'ts (+13 more)

### Community 39 - "admin.server.ts"
Cohesion: 0.20
Nodes (17): loginAdmin, listAdminCsvRowsServer(), listAdminResultsServer(), saveAdminReportServer(), setAdminReportSentServer(), credentialsSchema, getAdminSessionServer(), hasValidAdminCredentials() (+9 more)

### Community 40 - "requireFinancialUser"
Cohesion: 0.13
Nodes (25): SavingContribution, SavingsPlaceTransfer, getSavingContributionContextServer(), requireFinancialUser(), completeFinancialOnboardingServer(), FinancialAppState, getFinancesWorkspaceServer(), getFinancialAppStateServer() (+17 more)

### Community 41 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations, lib, module (+13 more)

### Community 42 - "Money"
Cohesion: 0.16
Nodes (19): SavingAllocationPreview, SavingDraft, AllocationChangeContext, AllocationChangePreviewResult, AllocationChangeProposal, AllocationChangeState, BuildAllocationChangeProposalInput, AllocationChangeDraft (+11 more)

### Community 43 - "definition.ts"
Cohesion: 0.07
Nodes (54): dayOptions, definedAnswerIds, ExtraIncome, extraIncomeSchema, filterAnswersForActiveSteps(), fixedExpenseExpiryFields, getActiveSteps(), getFirstIncompleteStep() (+46 more)

### Community 44 - "expenses.repository.server.ts"
Cohesion: 0.24
Nodes (15): expenseSources, createExpenseInRepository(), deleteExpenseInRepository(), expenseValues(), getExpensesWorkspaceState(), insertExpenseWithExecutor(), resolveSource(), mockTx (+7 more)

### Community 45 - "onboarding/repository.server.ts"
Cohesion: 0.18
Nodes (12): onboardingDrafts, Report, reportSchema, getPublicReport, markPublicReportCtaClicked, getPublicReportServer(), markPublicReportCtaClickedServer(), getDraft() (+4 more)

### Community 46 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, check-types, db:generate, db:migrate, db:studio, dev, format (+10 more)

### Community 47 - "incomes.repository.server.ts"
Cohesion: 0.27
Nodes (14): incomeSources, createIncomeInRepository(), deleteIncomeInRepository(), getIncomesWorkspaceState(), incomeValues(), insertIncomeWithExecutor(), resolveSource(), mockTx (+6 more)

### Community 48 - "onboarding-page.test.tsx"
Cohesion: 0.20
Nodes (11): OnboardingDraft, advanceToCard(), initialAnswers, makeDraft(), posthogCapture, posthogCaptureException, posthogIdentify, renderDailyExpenses() (+3 more)

### Community 49 - "Home and Financial Roadmap"
Cohesion: 0.12
Nodes (17): Acceptance criteria, Dependencies, Domain rules, Financial roadmap, Home, Home and Financial Roadmap, Home layout, Non-goals (+9 more)

### Community 50 - "app.module.ts"
Cohesion: 0.15
Nodes (12): AppModule, Module, Env, envSchema, validateEnv(), DatabaseModule, Module, Module (+4 more)

### Community 51 - "Onboarding And Initial Plan"
Cohesion: 0.12
Nodes (15): Acceptance Criteria, Dependencies, New-user Home, Non-goals, Onboarding, Onboarding And Initial Plan, Purpose, Rules (+7 more)

### Community 52 - "Plan Deviations and Recommendations"
Cohesion: 0.12
Nodes (16): Acceptance criteria, Apply and return, Deferred threshold decision, Dependencies, Deterministic recommendations, Domain rules, Month-close deviation, Month-close entry (+8 more)

### Community 53 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, dotenv, @nestjs/common, @nestjs/swagger, reflect-metadata, @repo/shared-types, rxjs, zod (+7 more)

### Community 55 - "WhatsappAuthStoreService"
Cohesion: 0.16
Nodes (4): TestableWhatsappAuthStoreService, Inject, Injectable, WhatsappAuthStoreService

### Community 56 - "Building For Production"
Cohesion: 0.13
Nodes (14): Adding A Route, Adding Links, API Routes, Building For Production, Data Fetching, Demo files, Getting Started, Learn More (+6 more)

### Community 57 - "saving-contribution.functions.ts"
Cohesion: 0.09
Nodes (24): confirmContribution, deleteContribution, deleteSavingContribution, getContributionContext, previewContribution, updateContribution, catchUpMonthSchema, ConfirmContributionInput (+16 more)

### Community 58 - "csv.ts"
Cohesion: 0.18
Nodes (14): cardHeaders, CompletedDraft, csvHeaders, CsvRow, CsvValue, escapeCsvValue(), fixedOtherAmount(), fixedOtherValue() (+6 more)

### Community 59 - "placeholder.schema.ts"
Cohesion: 0.27
Nodes (12): CreatePlaceholderItem, CreatePlaceholderItemSchema, DeletePlaceholderItemResponse, DeletePlaceholderItemResponseSchema, PlaceholderItem, PlaceholderItemList, PlaceholderItemListSchema, PlaceholderItemSchema (+4 more)

### Community 60 - "Contributions and Investments"
Cohesion: 0.14
Nodes (14): Acceptance criteria, Contributions and Investments, Dependencies, Domain rules, Investment detail and value update, Non-goals, Purpose, Record ARS investment (+6 more)

### Community 61 - "Foundations and Financial Model"
Cohesion: 0.14
Nodes (14): Acceptance criteria, Authentication and persistence boundary, Calculation boundaries, Data/privacy/performance, Dependencies, Domain rules, FinancialProfile, Foundations and Financial Model (+6 more)

### Community 62 - "Goals and Allocation MVP"
Cohesion: 0.14
Nodes (14): Acceptance criteria, Allocation editor, Completed-goal redistribution, Create goal, Dependencies, Goal detail/edit, Goals and Allocation MVP, Goals listing: `/app/goals` (+6 more)

### Community 63 - "users.service.ts"
Cohesion: 0.17
Nodes (13): DATABASE_CONNECTION, DATABASE_POOL, DBS, databaseProviders, Database, Schema, NewUser, User (+5 more)

### Community 64 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/pg, @types/react, drizzle-kit (+5 more)

### Community 65 - "Income, Expenses, and Cash Flow"
Cohesion: 0.15
Nodes (13): Acceptance criteria, Add expense, Add income, Dependencies, Edit or delete, Finances page: `/app/finances`, Income, Expenses, and Cash Flow, Margin warning (+5 more)

### Community 66 - "NestJS Core"
Cohesion: 0.17
Nodes (11): Architecture, Configuration And Lifecycle, Controllers And Services, Core Rules, Dependency Injection, Error Handling, Modules And Providers, NestJS Core (+3 more)

### Community 67 - "NestJS Security"
Cohesion: 0.17
Nodes (11): Authentication And Authorization, Dependencies And Defaults, Error Responses, Input Boundaries, JWT Guidance, When JWT Exists, Logging, NestJS Security, Output Safety (+3 more)

### Community 68 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, check-types, db:generate, db:migrate, db:push, dev, generate-routes (+4 more)

### Community 69 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 70 - "app/route.test.tsx"
Cohesion: 0.22
Nodes (6): getFinancialAppState, AppShell(), emptyRoadmap, Route, analytics, emptyRoadmap

### Community 71 - "financial.ts"
Cohesion: 0.27
Nodes (8): PreviousMonthShortfall, CompletionProjection, FundingMethod, InitialHomeState, projectCompletionMonth(), PROJECTION_HORIZON_MONTHS, RoadmapData, HomeProps

### Community 72 - "IncomeSheet.test.tsx"
Cohesion: 0.24
Nodes (8): createIncome, deleteIncome, updateIncome, defaultDraft(), IncomeSheet(), remove(), save(), posthogCapture

### Community 73 - "Decimal-Safe Money Arithmetic"
Cohesion: 0.17
Nodes (11): API and Rounding Details, `big.js`, `bignumber.js`, Bundle and Runtime Considerations, `decimal.js`, Decimal-Safe Money Arithmetic, Options Compared, Primary Sources (+3 more)

### Community 74 - "NestJS Drizzle"
Cohesion: 0.18
Nodes (10): Migrations, Nest Integration, NestJS Drizzle, Overview, Queries, Query Placement, Schema, Testing (+2 more)

### Community 75 - "NestJS Testing"
Cohesion: 0.18
Nodes (10): Database Tests, E2E Tests, NestJS Testing, Overview, Test Choice, Test Setup Utilities, TestingModule, Unit Tests (+2 more)

### Community 76 - "NestJS Zod"
Cohesion: 0.18
Nodes (10): App Setup, Avoid, Config Validation, Controllers, DTOs, NestJS Zod, OpenAPI, Overview (+2 more)

### Community 77 - "api/README.md"
Cohesion: 0.18
Nodes (10): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+2 more)

### Community 78 - "Columnas del CSV administrativo"
Cohesion: 0.20
Nodes (9): Celdas vacías y sanitización, Columnas del CSV administrativo, Compras y tarjetas, Gastos cotidianos y gustitos, Gastos fijos, Ingresos, Ingresos extra, Metadatos y contacto (+1 more)

### Community 79 - "router.tsx"
Cohesion: 0.33
Nodes (5): getRouter(), Register, @tanstack/react-router, mocks, routeTree

### Community 80 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @aws-sdk/client-s3, @base-ui/react, shadcn, @tanstack/react-form, @aws-sdk/client-s3, @base-ui/react, shadcn (+1 more)

### Community 82 - "goals/route.test.tsx"
Cohesion: 0.25
Nodes (5): Route, emptyWorkspace, sampleFinancialSummary, sampleGoal, sampleWorkspace

### Community 83 - "Home and Financial Onboarding Critique"
Cohesion: 0.22
Nodes (8): Design Health Score, Design Specificity Verdict, Home and Financial Onboarding Critique, Minor Observations, Persona Red Flags, Priority Issues, Questions to Consider, What's Working

### Community 84 - "exclude"
Cohesion: 0.25
Nodes (7): exclude, extends, dist, node_modules, **/*spec.ts, test, ./tsconfig.json

### Community 85 - "File structure"
Cohesion: 0.25
Nodes (7): Admin Result Detail Implementation Plan, File structure, Self-review, Task 1: Return one authenticated result with its upload URLs, Task 2: Build and test the definition-driven result details page, Task 3: Add the protected route and navigation from expanded rows, Task 4: Run the full relevant regression suite

### Community 86 - "Admin Result Detail Design"
Cohesion: 0.25
Nodes (7): Admin List Change, Admin Result Detail Design, Data, Goal, Page, Route And Access, Verification

### Community 87 - "Gastos post-cierre en archivo y cuotas mes a mes"
Cohesion: 0.25
Nodes (7): Alcance, Datos y validación, Gastos post-cierre en archivo y cuotas mes a mes, Implementación, Objetivo, Pruebas, Visibilidad

### Community 88 - "Gastos: adicionales dinámicos"
Cohesion: 0.25
Nodes (7): CSV, Decisiones de gustitos, Gastos: adicionales dinámicos, Interfaz y datos, Objetivo, Pruebas, Validación

### Community 89 - "manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 91 - "SavingContribution.tsx"
Cohesion: 0.17
Nodes (19): SheetHeader(), ContributionKind, confirmSavingContribution, getSavingContributionContext, previewSavingContribution, updateSavingContribution, SavingContributionContext, SavingContributionSummary (+11 more)

### Community 92 - "Domain rules"
Cohesion: 0.25
Nodes (8): Allocation history, Allocation invariant, Domain rules, Emergency fund, Goal model, Impact preview, Lifecycle, Planned contribution

### Community 93 - "Norte Landing Page Migration Design"
Cohesion: 0.25
Nodes (7): Architecture, Behavior And Accessibility, Error Handling, Norte Landing Page Migration Design, Scope, Styling And Assets, Verification

### Community 94 - "Onboarding Questionnaire Design"
Cohesion: 0.25
Nodes (7): Fields And Validation, Non-Goals, Onboarding Questionnaire Design, Persistence And Errors, Scope, Step Definition And Flow, Testing

### Community 95 - "api/AGENTS.md"
Cohesion: 0.29
Nodes (5): Avoid By Default, Commands, Default Code Shape, Non-Negotiables, Read The Relevant Skill

### Community 96 - "api/package.json"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 97 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @eslint/js, source-map-support, ts-loader, @eslint/js, source-map-support, ts-loader

### Community 98 - "Caratula de clasificacion de gastos"
Cohesion: 0.29
Nodes (6): Alcance, Caratula de clasificacion de gastos, Comportamiento, Contenido, Implementacion y pruebas, Objetivo

### Community 99 - "Total directo y conceptos de gastos"
Cohesion: 0.29
Nodes (6): Alcance, Comportamiento, Implementación y cobertura, Recortes de gustitos, Total directo y conceptos de gastos, Validación

### Community 100 - "Compras necesarias dinámicas"
Cohesion: 0.29
Nodes (6): Compras necesarias dinámicas, CSV, Interfaz y datos, Objetivo, Pruebas, Validación

### Community 101 - "Informe Section 4 Layout & Styling Spec"
Cohesion: 0.29
Nodes (6): 1. Component Layout (`src/components/informe-page.tsx`), 2. Card Styling & Typography, 3. Component Test (`src/components/informe-page.test.tsx`), Informe Section 4 Layout & Styling Spec, Left Column (`1.2fr`), Right Column (`0.8fr`)

### Community 102 - "PostHog post-wizard report"
Cohesion: 0.29
Nodes (6): Agent skill, Events instrumented, Files changed, Next steps, PostHog post-wizard report, Verify before merging

### Community 103 - "Issue tracker: GitHub"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 104 - "NORTE Product Requirements Document"
Cohesion: 0.29
Nodes (7): Deferred product decisions, NORTE Product Requirements Document, Planning workflow, Product intent, Product principles, Shared boundaries, Specification suite

### Community 105 - "Domain rules"
Cohesion: 0.29
Nodes (7): Categories, Domain rules, Editing and deletion, Installments, Monthly cash flow, Records and money, Recurrence

### Community 106 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 107 - "File Structure"
Cohesion: 0.33
Nodes (5): File Structure, Gastos Separator Implementation Plan, Task 1: Define and verify the expense-classification step, Task 2: Verify rendered navigation through the card, Task 3: Run the web verification suite

### Community 108 - "Gastos Adicionales Dinamicos Implementation Plan"
Cohesion: 0.33
Nodes (5): Gastos Adicionales Dinamicos Implementation Plan, Task 1: Define Dynamic Additional Expenses, Task 2: Render Both Collections And Dynamic P13 Labels, Task 3: Export Semantic CSV Slots, Task 4: Run Web Verification

### Community 109 - "Gastos post-cierre visibles al elegir archivo"
Cohesion: 0.33
Nodes (5): Comportamiento, Gastos post-cierre visibles al elegir archivo, Implementación, Objetivo, Pruebas

### Community 110 - "Design Details"
Cohesion: 0.33
Nodes (5): 1. Status Column Chips, 2. Expanded Row Structure, 3. Report Link Text Visibility & Window Targeting, Admin Page UI Refinements Design, Design Details

### Community 111 - "App Subtle Grid Surface Design"
Cohesion: 0.33
Nodes (5): App Subtle Grid Surface Design, Exclusions, Goal, Scope, Verification

### Community 112 - "Onboarding Mobile First-Step Design"
Cohesion: 0.33
Nodes (5): Goal, Layout Requirement, Onboarding Mobile First-Step Design, Scope, Verification

### Community 113 - "NorteLandingPage.tsx"
Cohesion: 0.47
Nodes (3): NorteLandingPage(), services, Route

### Community 114 - "TanStack Start Folder Structure"
Cohesion: 0.33
Nodes (5): Key Findings, Primary Sources, Recommendation, Suggested Shape, TanStack Start Folder Structure

### Community 115 - "GitHub Issue Operations"
Cohesion: 0.33
Nodes (5): Assign and block, Create and label, GitHub Issue Operations, Read, Verify

### Community 116 - "AppService"
Cohesion: 0.29
Nodes (5): AppController, Controller, Get, AppService, Injectable

### Community 117 - "Total directo y conceptos de gastos Implementation Plan"
Cohesion: 0.40
Nodes (4): Task 1: Specify and implement the expense modes in the onboarding definition, Task 2: Render declared discretionary-other names in reduction decisions, Task 3: Export the new answers in the admin CSV contract, Total directo y conceptos de gastos Implementation Plan

### Community 118 - "File structure"
Cohesion: 0.40
Nodes (4): File structure, Gastos post-cierre en archivo y cuotas mes a mes Implementation Plan, Task 1: Habilitar la Capa 2 en la definición de tarjeta, Task 2: Cubrir la revelación posterior al upload en la interfaz

### Community 119 - "Global Constraints"
Cohesion: 0.40
Nodes (4): Compras necesarias dinámicas Implementation Plan, Global Constraints, Task 1: Define and Validate Dynamic Purchases, Task 2: Export Five Fixed Purchase Slots

### Community 120 - "Gastos post-cierre visibles al elegir archivo Implementation Plan"
Cohesion: 0.40
Nodes (4): File Structure, Gastos post-cierre visibles al elegir archivo Implementation Plan, Global Constraints, Task 1: Mostrar inmediatamente los datos post-cierre

### Community 121 - "Global Constraints"
Cohesion: 0.40
Nodes (4): Admin Page UI Refinements Implementation Plan, Global Constraints, Task 1: Update Status Column Chips & Expanded Row Layout, Task 2: Add Visible Link Text and New Window Target for Reports

### Community 122 - "web/package.json"
Cohesion: 0.40
Nodes (4): imports, name, private, type

### Community 124 - "web/AGENTS.md"
Cohesion: 0.33
Nodes (5): Architecture, Behavior, Fallow local gate, Fallow task map, Git usage

### Community 219 - "goal-completion.ts"
Cohesion: 0.08
Nodes (27): PLANNING_ARS_PER_USD, buildGoalCompletionContext(), buildGoalCompletionProposal(), canonicalAmount(), GoalCompletionContext, GoalCompletionDraft, GoalCompletionPreviewResult, GoalCompletionProposal (+19 more)

### Community 220 - "FinancialOnboarding.test.tsx"
Cohesion: 0.32
Nodes (6): addSalary(), mockInvalidate, mockNavigate, posthogCapture, reachExpenseStep(), reachIncomeStep()

### Community 221 - "money.ts"
Cohesion: 0.35
Nodes (9): addMoney(), AllocatedMoney, AllocationTarget, assertSameCurrency(), compareMoney(), integerFormatter, isZeroMoney(), multiplyMoneyByFactor() (+1 more)

### Community 224 - "__root.tsx"
Cohesion: 0.28
Nodes (4): Route, Route, mocks, FileRoutesById

## Knowledge Gaps
- **925 isolated node(s):** `Behavior`, `Git usage`, `Fallow local gate`, `Fallow task map`, `GoalsEmptyProps` (+920 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1100 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **85 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `button.tsx` to `goal-lifecycle.ts`, `IncomeSheet.tsx`, `GoalCreation.tsx`, `goal-creation.ts`, `goals/route.tsx`, `formatMoney`, `definition.ts`, `FinancialOnboarding.tsx`, `app/index.tsx`, `SavingsTransferSheet.tsx`, `ExpenseSheet.tsx`, `cn`, `admin.functions.ts`, `createMoney`, `SavingContribution.tsx`, `informe-page.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `goal-lifecycle.ts`, `button.tsx`, `IncomeSheet.tsx`, `goal-creation.ts`, `SavingsTransferSheet.tsx`, `SavingContribution.tsx`, `informe-page.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `createMoney()` connect `createMoney` to `goals.repository.server.ts`, `goal-lifecycle.ts`, `button.tsx`, `db/schema.ts`, `saving-contribution.ts`, `financial.ts`, `goal-creation.ts`, `formatMoney`, `FinancialOnboarding.tsx`, `goal-completion.ts`, `SavingsTransferSheet.tsx`, `ExpenseSheet.tsx`, `incomes.ts`, `saving-contribution.functions.ts`, `goals.ts`, `money.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `Behavior`, `Git usage`, `Fallow local gate` to the rest of the system?**
  _925 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `goals.repository.server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10735060814383923 - nodes in this community are weakly interconnected._
- **Should `placeholder.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10897435897435898 - nodes in this community are weakly interconnected._
- **Should `db/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._