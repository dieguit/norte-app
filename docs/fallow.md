# Fallow

Fallow currently scopes analysis to `apps/web` only. The pre-commit hook audits
all current `apps/web` changes, not just staged changes, so unstaged Web
findings can block a commit.

## Setup

```sh
pnpm install
git config core.hooksPath .githooks
```

From the repository root, run:

```sh
pnpm --dir apps/web fallow
pnpm --dir apps/web fallow dead-code
pnpm --dir apps/web fallow dupes
pnpm --dir apps/web fallow health
pnpm --dir apps/web fallow:audit
```

The audit gate is `new-only`: inherited findings are reported, but only
findings introduced by the current changes block the audit. Full scans remain
required during cleanup and final verification.

Each clone must activate the hook path once. Use `git commit --no-verify` to
bypass the local hook when necessary. There is no CI integration yet, so these
are the only configured enforcement until CI is added.

## Duplication policy

`src/db/schema.ts` is excluded narrowly because repeated `createdAt`,
`updatedAt`, indexes, and checks are declarative Drizzle table definitions. The
table-specific columns and constraints must remain beside each table so schema
changes stay visible and migration output remains explicit.

Inline `code-duplication` suppressions document the remaining intentional
similarity where the same shape serves different domain contracts: sheet
context loading, financial source resolution, goal preview workflows, admin
CSV field mapping, and proposal-specific workspace assembly.

The audit base is resolved from the current branch's upstream merge-base when
available, then `origin/main`, then `main`. Missing bases and audit/config
errors fail closed.

## Current exception

Three retained public error `code` class members remain intentionally:

- `src/features/goals/goal-completion.repository.server.ts: StaleGoalCompletionPreviewError.code`
- `src/features/goals/goal-completion.repository.server.ts: GoalCompletionStateInvalidError.code`
- `src/features/goals/goals.repository.server.ts: StaleGoalCreationPreviewError.code`

Fallow 3.21.0 symbol impact reports unsupported class-property syntax, and
contract tests assert these members.
