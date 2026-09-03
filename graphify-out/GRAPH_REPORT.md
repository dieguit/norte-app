# Graph Report - app  (2026-09-01)

## Corpus Check
- 410 files · ~439,102 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2412 nodes · 5273 edges · 227 communities (129 shown, 87 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2f6898f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- goals.server.ts
- goal-lifecycle.ts
- placeholder.controller.ts
- goals.repository.server.ts
- ExpenseSheet.tsx
- savings-places.functions.ts
- goal-creation.schema.ts
- goals.functions.ts
- GoalCompletion.tsx
- routeTree.gen.ts
- goals/route.tsx
- formatMoney
- seccion4.md
- FinancialOnboarding
- scripts
- app/index.tsx
- Agent skills
- NORTE-PRD-development-spec.md
- SavingsPlacesTab.tsx
- FinancialOnboarding.tsx
- cn
- preguntas.md
- admin-page.tsx
- financial.server.ts
- onboarding.server.ts
- createMoney
- WhatsappConnectionService
- goals.ts
- FinancesWorkspace.tsx
- compilerOptions
- financial.functions.ts
- compilerOptions
- shared-types/package.json
- tasks
- button.tsx
- db/schema.ts
- UsersService
- components.json
- Design System: Norte
- admin.functions.ts
- savings-places.repository.server.ts
- compilerOptions
- goal-creation.ts
- onboarding-page.tsx
- expenses.schema.ts
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
- goals.functions.test.ts
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
- roadmap.ts
- Money
- definition.ts
- Decimal-Safe Money Arithmetic
- NestJS Drizzle
- NestJS Testing
- NestJS Zod
- api/README.md
- Columnas del CSV administrativo
- informe-page.test.tsx
- dependencies
- admin-result-details-page.tsx
- goals/route.test.tsx
- Home and Financial Onboarding Critique
- exclude
- File structure
- Admin Result Detail Design
- Gastos post-cierre en archivo y cuotas mes a mes
- Gastos: adicionales dinámicos
- manifest.json
- SavingsTransferSheet.test.tsx
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
- goal-lifecycle.schema.ts
- goal-completion.ts
- FinancialOnboarding.test.tsx
- money.ts
- onboarding-repeated-items.tsx
- admin/auth.server.ts
- __root.tsx
- invitation.ts
- SavingsPlacePicker

## God Nodes (most connected - your core abstractions)
1. `cn()` - 81 edges
2. `createMoney()` - 60 edges
3. `requireFinancialUser()` - 42 edges
4. `Money` - 34 edges
5. `Button()` - 33 edges
6. `formatMoney()` - 32 edges
7. `parseMoneyInput()` - 29 edges
8. `buildGoalsWorkspace()` - 27 edges
9. `GoalsWorkspaceSource` - 25 edges
10. `compilerOptions` - 23 edges

## Surprising Connections (you probably didn't know these)
- `IncomeMonthInput` --references--> `Money`  [EXTRACTED]
  apps/web/src/features/financial/incomes.ts → apps/web/src/lib/money.ts
- `ExpenseMonthInput` --references--> `Money`  [EXTRACTED]
  apps/web/src/features/financial/expenses.ts → apps/web/src/lib/money.ts
- `BuildSavingPreviewInput` --references--> `GoalsWorkspaceSource`  [EXTRACTED]
  apps/web/src/features/contributions/saving-contribution.ts → apps/web/src/features/goals/goals.ts
- `SheetFooter()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/sheet.tsx → apps/web/src/lib/utils.ts
- `SheetOverlay()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/sheet.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (227 total, 87 thin omitted)

### Community 0 - "goals.server.ts"
Cohesion: 0.10
Nodes (34): requireFinancialUser(), serializeAllocationChangeState(), ConfirmGoalCreationInput, ConfirmGoalEditInput, GoalEditRequestInput, PreviewGoalEditInput, serializeGoalEditState(), GoalsAppState (+26 more)

### Community 1 - "goal-lifecycle.ts"
Cohesion: 0.18
Nodes (19): Badge(), badgeVariants, GoalCreationImpact, BuildGoalLifecycleProposalInput, getNextCalendarMonthStr(), GoalLifecycleContext, GoalLifecyclePreviewResult, GoalLifecycleProposal (+11 more)

### Community 2 - "placeholder.controller.ts"
Cohesion: 0.11
Nodes (22): CreatePlaceholderDto, DeletePlaceholderResponseDto, PlaceholderListResponseDto, PlaceholderResponseDto, UpdatePlaceholderDto, PlaceholderController, ApiOperation, ApiResponse (+14 more)

### Community 3 - "goals.repository.server.ts"
Cohesion: 0.23
Nodes (21): AllocationPlanEntry, AllocationPlanSnapshot, Expense, FinancialGoal, FinancialProfile, GoalInvestmentPosition, GoalSavingsPosition, Income (+13 more)

### Community 4 - "ExpenseSheet.tsx"
Cohesion: 0.11
Nodes (35): MonthPickerInput(), Field(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), FieldSet(), fieldVariants (+27 more)

### Community 5 - "savings-places.functions.ts"
Cohesion: 0.21
Nodes (13): createSavingsPlace, deleteSavingsPlace, getSavingsPlacesWorkspace, renameSavingsPlace, createSavingsPlaceSchema, deleteSavingsPlaceSchema, renameSavingsPlaceSchema, savingsPlaceSelectionSchema (+5 more)

### Community 6 - "goal-creation.schema.ts"
Cohesion: 0.21
Nodes (15): confirmGoalCreationSchema, confirmGoalEditSchema, createObjectiveSchema(), goalCreationDraftSchema, goalEditRequestSchema, goalImpactSchema, goalPlanSchema, goalPrioritySchema (+7 more)

### Community 7 - "goals.functions.ts"
Cohesion: 0.13
Nodes (28): GoalCreationContext, GoalCreationPreviewResult, GoalEditContext, GoalCreationDraft, confirmGoalCreation, confirmGoalEdit, getGoalCreationContext, getGoalEditContext (+20 more)

### Community 8 - "GoalCompletion.tsx"
Cohesion: 0.17
Nodes (23): AllocationChangeContext, calculatePercentageSum(), GoalCreationAllocation, GoalCreationAllocationEntry, rebalanceAllocationEntries(), recalculateAllocationAmounts(), canonical(), GoalCompletion() (+15 more)

### Community 9 - "routeTree.gen.ts"
Cohesion: 0.07
Nodes (31): getRouter(), Register, @tanstack/react-router, mocks, Route, AppFinancesIndexRoute, AppFinancesRouteRoute, AppFinancesRouteRouteChildren (+23 more)

### Community 10 - "goals/route.tsx"
Cohesion: 0.21
Nodes (9): GoalsEmpty(), GoalsEmptyProps, GoalsError(), GoalsErrorProps, GoalsLoading(), GoalsWorkspace(), makeFinancialSummary(), makeWorkspace() (+1 more)

### Community 11 - "formatMoney"
Cohesion: 0.12
Nodes (25): FinancialSummaryCards(), FinancialSummaryCardsProps, summary, FIXED_INCOME_SOURCES, ContributionSummary, GoalWorkspaceItem, RoadmapMonth, formatCalendarMonth() (+17 more)

### Community 12 - "seccion4.md"
Cohesion: 0.05
Nodes (37): Bloque 1 — Roadmap vivo, Bloque 2 — Decisiones y WhatsApp, Cierre comercial, Confirmación post-click, Copy completo propuesto, Copy final en bloque listo para implementar, Criterio de aceptación, CTA button (+29 more)

### Community 13 - "FinancialOnboarding"
Cohesion: 0.20
Nodes (4): expenseSourceLabel(), FinancialOnboarding(), handleSubmit(), incomeSourceLabel()

### Community 14 - "scripts"
Cohesion: 0.05
Nodes (37): author, description, devDependencies, turbo, typescript, turbo, typescript, keywords (+29 more)

### Community 15 - "app/index.tsx"
Cohesion: 0.18
Nodes (11): getFinancesWorkspace, getGoalsWorkspace, addMonth(), buildRoadmap(), HomeError(), HomeLoading(), Route, Route (+3 more)

### Community 16 - "Agent skills"
Cohesion: 0.33
Nodes (5): Agent skills, Domain docs, Git behavior, Issue tracker, Triage labels

### Community 18 - "SavingsPlacesTab.tsx"
Cohesion: 0.29
Nodes (6): SavingsMovement, SavingsMovementsSheet(), SavingsMovementsSheetProps, movements, SavingsPlacesTab(), workspace

### Community 19 - "FinancialOnboarding.tsx"
Cohesion: 0.18
Nodes (10): FIXED_EXPENSE_SOURCES, OnboardingExpense, OnboardingIncome, OnboardingStep, STEP_LABELS, defaultDraft(), ExpenseSheet(), defaultDraft() (+2 more)

### Community 20 - "cn"
Cohesion: 0.08
Nodes (27): Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), FieldContent() (+19 more)

### Community 21 - "preguntas.md"
Cohesion: 0.06
Nodes (33): **Bloque 0 — Calibrador**, **Bloque 1 — Ingresos**, **Bloque 2 — Egresos (montos mensuales)**, **Bloque 3 — Tarjetas**, **Cierre**, **Contrato de datos — Excel de salida**, **Mapeo pregunta → informe**, **Notas de implementación** (+25 more)

### Community 22 - "admin-page.tsx"
Cohesion: 0.15
Nodes (17): getAdminResultFiles, listAdminCsvRows, listAdminResults, loginAdmin, AdminPage(), closeReportEditor(), fetchResults(), handleDownloadAllCsv() (+9 more)

### Community 23 - "financial.server.ts"
Cohesion: 0.23
Nodes (13): ExpensesWorkspace, CompleteFinancialOnboardingInput, FinancesWorkspaceState, FinancialAppState, getFinancesWorkspaceServer(), getFinancialAppStateServer(), IncomesWorkspace, MonthlyFinancialPlan (+5 more)

### Community 24 - "onboarding.server.ts"
Cohesion: 0.14
Nodes (25): saveDraftInput, createOnboardingUpload, deleteOnboardingUpload, getDraftInput, getOnboardingDraft, saveOnboardingDraft, createOnboardingUploadServer(), deleteOnboardingUploadServer() (+17 more)

### Community 25 - "createMoney"
Cohesion: 0.15
Nodes (29): derivePreviousMonthShortfalls(), ExpenseMonthInput, FixedExpenseSourceKind, getExpenseTotalArs(), getMonthlyBalanceArs(), isExpenseIncludedInMonth(), ONE_TIME_EXPENSE_SOURCES, RECURRING_EXPENSE_SOURCES (+21 more)

### Community 26 - "WhatsappConnectionService"
Cohesion: 0.14
Nodes (5): Injectable, WhatsappConnectionService, ReplySocket, Injectable, WhatsappMessageService

### Community 27 - "goals.ts"
Cohesion: 0.14
Nodes (16): PROJECTION_HORIZON_MONTHS, addMonthsToMonth(), ContributionAllocationSummary, GOAL_STATUS_LABELS, GoalFundingRow, groupGoals(), PRIORITY_ORDER, projectGoalCompletion() (+8 more)

### Community 28 - "FinancesWorkspace.tsx"
Cohesion: 0.12
Nodes (22): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+14 more)

### Community 29 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+17 more)

### Community 30 - "financial.functions.ts"
Cohesion: 0.08
Nodes (30): createExpenseSchema, deleteExpenseSchema, expenseDraftSchema, updateExpenseSchema, deleteExpenseServer(), completeFinancialOnboarding, completeFinancialOnboardingInputSchema, createExpense (+22 more)

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
Cohesion: 0.13
Nodes (21): MonthPickerInputProps, Button(), buttonVariants, Calendar(), CalendarDayButton(), ButtonVariant, Month, MonthCal() (+13 more)

### Community 35 - "db/schema.ts"
Cohesion: 0.05
Nodes (79): allocationPlanEntries, allocationPlanSnapshots, expenses, ExpenseSource, financialGoals, financialProfiles, goalInvestmentPositions, goalSavingsPositions (+71 more)

### Community 36 - "UsersService"
Cohesion: 0.12
Nodes (21): ApiOperation, ApiResponse, ApiTags, Body, Controller, Get, Param, Post (+13 more)

### Community 37 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 38 - "Design System: Norte"
Cohesion: 0.09
Nodes (21): Buttons, Cards / Containers, Chips, Colors, Components, Design System: Norte, Do:, Do's and Don'ts (+13 more)

### Community 39 - "admin.functions.ts"
Cohesion: 0.25
Nodes (19): getAdminCsvRow, getAdminSession, saveAdminReport, setAdminReportSent, getAdminCsvRowServer(), getAdminResultDetailsServer(), getAdminResultFilesServer(), listAdminCsvRowsServer() (+11 more)

### Community 40 - "savings-places.repository.server.ts"
Cohesion: 0.14
Nodes (20): db, pool, SavingContribution, SavingsPlaceTransfer, calculateSavingsPlacesWorkspace(), CurrencyCode, getSavingsPlaceEntries(), normalizeSavingsPlaceName() (+12 more)

### Community 41 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations, lib, module (+13 more)

### Community 42 - "goal-creation.ts"
Cohesion: 0.12
Nodes (20): amountSchema, amountSchema, AllocationChangeProposal, AllocationChangeState, buildAllocationChangeProposal(), buildGoalCreationProposal(), getNextCalendarMonthStr(), GoalCreationBefore (+12 more)

### Community 43 - "onboarding-page.tsx"
Cohesion: 0.19
Nodes (22): filterAnswersForActiveSteps(), getActiveSteps(), getFirstIncompleteStep(), getInactiveAnswerIds(), getVisibleFields(), OnboardingAnswers, onboardingAnswerSchema, DRAFT_KEY (+14 more)

### Community 44 - "expenses.schema.ts"
Cohesion: 0.17
Nodes (20): expenseSources, createExpenseInRepository(), deleteExpenseInRepository(), expenseValues(), getExpensesWorkspaceState(), insertExpenseWithExecutor(), resolveSource(), mockTx (+12 more)

### Community 45 - "onboarding/repository.server.ts"
Cohesion: 0.19
Nodes (11): Report, reportSchema, getPublicReport, markPublicReportCtaClicked, getPublicReportServer(), markPublicReportCtaClickedServer(), getDraft(), markDraftCtaClicked() (+3 more)

### Community 46 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, check-types, db:generate, db:migrate, db:studio, dev, format (+10 more)

### Community 47 - "incomes.repository.server.ts"
Cohesion: 0.25
Nodes (15): incomeSources, createIncomeInRepository(), deleteIncomeInRepository(), getIncomesWorkspaceState(), incomeValues(), insertIncomeWithExecutor(), resolveSource(), mockTx (+7 more)

### Community 48 - "onboarding-page.test.tsx"
Cohesion: 0.17
Nodes (13): getFileValidationError(), advanceToCard(), initialAnswers, makeDraft(), posthogCapture, posthogCaptureException, posthogIdentify, renderDailyExpenses() (+5 more)

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

### Community 57 - "goals.functions.test.ts"
Cohesion: 0.11
Nodes (21): AllocationChangePreviewResult, BuildAllocationChangeProposalInput, AllocationChangeDraft, allocationChangeDraftSchema, ConfirmAllocationChangeInput, confirmAllocationChangeSchema, serializeGoalCreationState(), serializeGoalLifecycleState() (+13 more)

### Community 58 - "csv.ts"
Cohesion: 0.16
Nodes (16): downloadCsv(), handleDownloadRowCsv(), cardHeaders, CompletedDraft, csvHeaders, CsvRow, CsvValue, escapeCsvValue() (+8 more)

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

### Community 70 - "roadmap.ts"
Cohesion: 0.17
Nodes (12): getFinancialAppState, Expense, Income, RoadmapData, formatMonthName(), AppShell(), emptyRoadmap, Home() (+4 more)

### Community 71 - "Money"
Cohesion: 0.36
Nodes (9): FinancialSummaryCardsSummary, PreviousMonthShortfall, SavingAllocationPreview, SavingDraft, InitialHomeState, MonthlyFinancialSummary, GoalsFinancialSummary, CurrencyCode (+1 more)

### Community 72 - "definition.ts"
Cohesion: 0.14
Nodes (20): dayOptions, definedAnswerIds, extraIncomeSchema, fixedExpenseExpiryFields, hasDetailedFixedExpense(), hasPositiveAmount(), hasPositiveOther(), hasPositiveRepeatedItem() (+12 more)

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

### Community 79 - "informe-page.test.tsx"
Cohesion: 0.14
Nodes (5): formatMillions(), InformePage(), posthogCapture, posthogIdentify, TestIntersectionObserver

### Community 80 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @aws-sdk/client-s3, @base-ui/react, shadcn, @tanstack/react-form, @aws-sdk/client-s3, @base-ui/react, shadcn (+1 more)

### Community 81 - "admin-result-details-page.tsx"
Cohesion: 0.30
Nodes (8): getAdminResultDetails, AdminResultDetailsPage(), AnswerValue(), formatValue(), isBlank(), numberFormatter, formatAdminDownloadLabel(), RepeatedItemField

### Community 82 - "goals/route.test.tsx"
Cohesion: 0.15
Nodes (9): GoalsWorkspace, finances, goals, GoalsWorkspaceProps, Route, emptyWorkspace, sampleFinancialSummary, sampleGoal (+1 more)

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

### Community 90 - "SavingsTransferSheet.test.tsx"
Cohesion: 0.20
Nodes (8): transferSavings, SavingsTransferSheet(), bank, cash, places, routerInvalidate, TransferSheet, TransferSheetProps

### Community 91 - "SavingContribution.tsx"
Cohesion: 0.14
Nodes (24): ContributionKind, confirmContribution, confirmSavingContribution, deleteContribution, getContributionContext, getSavingContributionContext, previewContribution, previewSavingContribution (+16 more)

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

### Community 218 - "goal-lifecycle.schema.ts"
Cohesion: 0.27
Nodes (8): allocationEntrySchema, ConfirmGoalLifecycleInput, confirmGoalLifecycleSchema, GoalLifecyclePreviewInput, goalLifecyclePreviewSchema, GoalLifecycleRequestInput, goalLifecycleRequestSchema, goalLifecycleSchema

### Community 219 - "goal-completion.ts"
Cohesion: 0.11
Nodes (24): buildGoalCompletionContext(), buildGoalCompletionProposal(), canonicalAmount(), GoalCompletionContext, GoalCompletionDraft, GoalCompletionPreviewResult, GoalCompletionProposal, GoalCompletionSavingsPlace (+16 more)

### Community 220 - "FinancialOnboarding.test.tsx"
Cohesion: 0.32
Nodes (6): addSalary(), mockInvalidate, mockNavigate, posthogCapture, reachExpenseStep(), reachIncomeStep()

### Community 221 - "money.ts"
Cohesion: 0.35
Nodes (9): addMoney(), AllocatedMoney, AllocationTarget, assertSameCurrency(), compareMoney(), integerFormatter, isZeroMoney(), multiplyMoneyByFactor() (+1 more)

### Community 222 - "onboarding-repeated-items.tsx"
Cohesion: 0.31
Nodes (8): ExtraIncome, getMonthlyDateOptions(), OnboardingField, formatNumber(), numberFormatter, OnboardingRepeatedItems(), parseNumber(), Props

### Community 223 - "admin/auth.server.ts"
Cohesion: 0.43
Nodes (5): credentialsSchema, getAdminSessionServer(), hasValidAdminCredentials(), loginAdminServer(), useAdminSession()

### Community 224 - "__root.tsx"
Cohesion: 0.28
Nodes (4): Route, Route, mocks, FileRoutesById

## Knowledge Gaps
- **925 isolated node(s):** `goal`, `roadmap`, `AllocationChangeContextState`, `GoalCreationContextState`, `GoalEditContextState` (+920 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1099 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **87 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `button.tsx` to `goal-lifecycle.ts`, `ExpenseSheet.tsx`, `roadmap.ts`, `goals.functions.ts`, `GoalCompletion.tsx`, `goals/route.tsx`, `formatMoney`, `onboarding-page.tsx`, `app/index.tsx`, `onboarding-page.test.tsx`, `SavingsPlacesTab.tsx`, `FinancialOnboarding.tsx`, `cn`, `admin-page.tsx`, `SavingContribution.tsx`, `FinancesWorkspace.tsx`, `onboarding-repeated-items.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `goal-lifecycle.ts`, `button.tsx`, `ExpenseSheet.tsx`, `FinancesWorkspace.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `createMoney()` connect `createMoney` to `goals.server.ts`, `goal-lifecycle.ts`, `button.tsx`, `db/schema.ts`, `ExpenseSheet.tsx`, `GoalCompletion.tsx`, `goals.ts`, `goal-creation.ts`, `formatMoney`, `FinancialOnboarding`, `SavingsPlacesTab.tsx`, `FinancialOnboarding.tsx`, `SavingsTransferSheet.test.tsx`, `goal-completion.ts`, `FinancesWorkspace.tsx`, `money.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `goal`, `roadmap`, `AllocationChangeContextState` to the rest of the system?**
  _925 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `goals.server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0990990990990991 - nodes in this community are weakly interconnected._
- **Should `placeholder.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10897435897435898 - nodes in this community are weakly interconnected._
- **Should `ExpenseSheet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11252268602540835 - nodes in this community are weakly interconnected._