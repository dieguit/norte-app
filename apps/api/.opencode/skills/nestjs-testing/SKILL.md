---
name: nestjs-testing
description: Guides NestJS unit, integration, and e2e testing with Vitest, TestingModule, Supertest, real PostgreSQL, mocked externals, and Drizzle database tests. Use when adding or changing tests.
license: MIT
metadata:
  stack: NestJS, Vitest, Supertest, PostgreSQL, Drizzle ORM
  version: "1.0.0"
---

# NestJS Testing

## Overview

Use the smallest test that proves the changed behavior. Prefer direct class tests until Nest wiring, HTTP behavior, or database behavior matters. E2E and integration tests should run against real PostgreSQL, not mocked repositories.

## When to Use

- Adding tests for controllers, services, modules, guards, interceptors, or filters.
- Testing HTTP routes with validation, guards, serializers, or exception mapping.
- Testing Drizzle queries, migrations, or transactions.
- Testing real API-to-database flows with Vitest, Supertest, and PostgreSQL.
- Mocking external services.

## Test Choice

| Need                                                          | Test type                                          |
| ------------------------------------------------------------- | -------------------------------------------------- |
| Pure service logic                                            | Direct class test                                  |
| Nest DI, provider tokens, guards, interceptors, filters       | `TestingModule`                                    |
| Complete HTTP flow                                            | Vitest + Supertest e2e against real PostgreSQL     |
| Drizzle query, migration, transaction, or constraint behavior | Vitest DB integration test against real PostgreSQL |
| Real app plus unsafe/slow external dependency                 | Hybrid e2e with external provider mocked           |

Do not use a heavier test type when a lighter one proves the behavior.

## Unit Tests

- Mock external services, queues, payment providers, email, storage, and HTTP clients.
- Mock the Drizzle DB provider for service business logic.
- Keep mocks contract-compatible with the real provider; return the same shape and throw comparable errors.
- Do not hit real external APIs in tests.
- Test behavior, not framework internals.

```ts
import { vi } from "vitest";

const usersRepo = { findByEmail: vi.fn(), create: vi.fn() };
const service = new UsersService(usersRepo as never);

await expect(service.create({ email: "used@example.com" })).rejects.toThrow(
  ConflictException,
);
```

## TestingModule

- Use `Test.createTestingModule()` when provider tokens, guards, interceptors, or dependency wiring matter.
- Override providers with explicit `useValue` mocks.
- Avoid importing the whole `AppModule` for unit tests.

```ts
const module = await Test.createTestingModule({
  providers: [UsersService, { provide: DB, useValue: dbMock }],
}).compile();

const service = module.get(UsersService);
```

## E2E Tests

- Use Vitest to run e2e tests and Supertest for HTTP assertions.
- Use a real PostgreSQL database, ideally Dockerized, for e2e and integration tests.
- Boot the app with the same global Zod validation pipe and serializer interceptor used in production.
- Test validation failures where input rules changed.
- Test auth/guards when access behavior changed.
- Keep e2e tests few and meaningful.
- Clean database state between tests and tear down the Nest app and DB connections after the suite.
- Mock only unsafe or slow external providers such as email, payment, queues, and third-party APIs.

Verify these when relevant:

- Invalid Zod DTO returns `400`.
- Sensitive DB fields are not present in responses.
- Guarded routes reject unauthenticated requests.
- Happy path returns the documented status and response shape.
- Data written through HTTP exists in PostgreSQL when persistence is the behavior under test.
- POST/PUT/DELETE tests verify persistence with a direct DB query or factory helper such as `findById`.

```ts
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Users e2e", () => {
  let setup: E2ETestSetup;

  beforeAll(async () => {
    setup = await new E2ETestSetup().withAppModule().setupApp();
  });

  beforeEach(async () => {
    await setup.cleanup();
  });

  afterAll(async () => {
    await setup.teardown();
  });

  it("creates and returns a user through HTTP", async () => {
    const response = await request(setup.serverHttp)
      .post("/users")
      .send({ email: "ada@example.com", name: "Ada" })
      .expect(201);

    expect(response.body).toMatchObject({
      email: "ada@example.com",
      name: "Ada",
    });
  });
});
```

## Database Tests

- Use a disposable PostgreSQL database or transaction rollback strategy.
- Run migrations before integration tests when query/schema behavior matters.
- Assert constraints at the database level when they protect data integrity.
- For transaction tests, verify failed steps do not leave partial writes.

## Test Setup Utilities

- Add an `E2ETestSetup`-style builder only after setup is repeated across multiple suites.
- Useful builder actions: `withAppModule`, `withCustomModule`, `withImports`, `withProviders`, `overrideProvider`, expose `serverHttp`, cleanup, teardown.
- Add factories when tests need realistic persisted data in multiple places.
- Factories should write to the real test database and support overrides, `createMany`, and lookup helpers such as `findById`.
- Keep builders and factories small. Do not create a framework before repetition exists.

Recommended layout when utilities exist:

```text
test/e2e/*.e2e.spec.ts
test/factories/*.factory.ts
test/utils/test-setup.ts
test/config/test.config.ts
```

## Vitest Commands

Prefer project scripts. Common Vitest commands are:

```bash
pnpm --filter @repo/api test
pnpm --filter @repo/api test:e2e
pnpm --filter @repo/api test:cov
pnpm test (all Turbo tests)

## Avoid

- Snapshotting huge HTTP responses.
- Testing decorators by reimplementing Nest internals.
- Hitting real services.
- One test file per method by default.
- Mocking so much that the test only proves the mock works.
- Calling tests e2e when they mock the database.
```
