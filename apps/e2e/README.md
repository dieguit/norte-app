# @repo/e2e

Playwright happy-path tests for web `/app` flows.

1. `cp .env.test.example .env.test` and fill in the Clerk **dev** instance keys (email sign-in enabled).
2. `pnpm db:test:up` (from repo root)
3. From `apps/e2e`, run `pnpm e2e` (headless) or `pnpm e2e:ui`.

From the repo root, `pnpm e2e` also starts the test database.

The `@repo/web` devDependency records the seed/build dependency for Turbo, even though seeds import web internals by relative path.

Tests marked `test.fail` document known product bugs and must be un-marked when the bug is fixed.

The suite builds web, serves it on port 3100, migrates `norte_test`, and truncates it before every test. It never runs against another database. App-internal access lives only in `tests/seed.ts` and `tests/global-setup.ts`; when the API owns the DB, only those change.
