# @repo/e2e

Playwright happy-path tests for web `/app` flows.

## Setup

Requires Docker Compose and Playwright browsers (`pnpm --filter @repo/e2e exec playwright install --with-deps chromium`).

Copy `.env.test.example` to `.env.test` and set Clerk **development** keys, issuer and test user email. Email sign-in must be enabled. Live keys are rejected.

## Run

```sh
pnpm e2e                      # starts the stack if needed, runs tests, stops what it started
pnpm e2e -g "income"          # any Playwright args
pnpm e2e:ui                   # Playwright UI
```

For fast reruns, keep the stack up: `pnpm e2e:up` (rebuilds only what changed), run tests as often as needed, then `pnpm e2e:down`. Service logs: `docker compose logs api-e2e web-e2e`.

Stack (profile `e2e` in `docker-compose.yml`): `postgres-e2e` on `5435`, `api-e2e` internal, `web-e2e` on `3100`. Global setup migrates the disposable `norte_test` database (`pnpm --filter @repo/api db:migrate`) and initializes Clerk.

Reports land in `playwright-report/`, traces for failures in `test-results/` (`pnpm --filter @repo/e2e exec playwright show-report`). They may contain private test data.
