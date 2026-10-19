# @repo/e2e

Playwright happy-path tests for web `/app` flows.

1. `cp .env.test.example .env.test` and fill in the Clerk **dev** instance keys (email sign-in enabled).
2. `pnpm db:test:up` (from repo root)
3. `pnpm e2e` (headless) or `pnpm e2e:ui`

Tests marked `test.fail` document known product bugs and must be un-marked when the bug is fixed.

The suite builds web, serves it on port 3100, migrates `norte_test`, and truncates it before every test. It never runs against another database. App-internal access lives only in `tests/seed.ts` and `tests/global-setup.ts`; when the API owns the DB, only those change.
