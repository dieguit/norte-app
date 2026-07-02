---
name: nestjs-drizzle
description: Guides Drizzle ORM usage in NestJS, including schema definitions, database providers, typed queries, migrations, transactions, and database tests. Use when editing persistence code.
license: MIT
metadata:
  stack: NestJS, Drizzle ORM
  version: "1.0.0"
---

# NestJS Drizzle

## Overview

Use Drizzle as the persistence layer. New code should not use TypeORM, Prisma, entity decorators, repositories from other ORMs, or production schema sync patterns.

## When to Use

- Adding or changing database tables, indexes, or migrations.
- Writing Drizzle queries or transactions.
- Creating Nest database providers.
- Testing persistence behavior.

## Schema

- Define tables with Drizzle builders such as `pgTable`, `sqliteTable`, or `mysqlTable` according to the database.
- Keep feature-owned tables close to the feature when that improves ownership, then re-export them from a shared database schema entrypoint.
- Use inferred types: `typeof table.$inferInsert` and `typeof table.$inferSelect`.
- Define indexes, unique constraints, defaults, and foreign keys in schema/migrations, not only service code.
- DTOs are API contracts; Drizzle schemas are persistence contracts. Do not force them to be identical.

```ts
import { pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## Nest Integration

- Provide one typed DB client through a database module.
- Inject the DB client with a clear token or wrapper service.
- Keep the connection provider in infrastructure code, not feature modules.
- If using `@sixaphone/nestjs-drizzle` or another wrapper, follow its `forRoot`/`forRootAsync` pattern and keep connection names as constants.
- For custom providers, export the DB token from `DatabaseModule` and import that module in features that query data.

## Query Placement

- Simple CRUD can live in the service.
- Move query code into small query helpers or repositories only when queries are complex, reused, or noisy.
- Do not create one repository class per table by default.
- Keep business decisions in services; keep SQL composition in query helpers when it gets large.

## Queries

- Select only columns needed for the use case.
- Paginate list endpoints. Never add unbounded `findAll()` for public or large tables.
- Avoid N+1 queries. Use joins, Drizzle relations, or `inArray` batching.
- Add indexes for hot filters and join keys.
- Use typed Drizzle operators such as `eq`, `and`, `or`, and `inArray` instead of string-built SQL.
- Use raw SQL only when Drizzle cannot express the query clearly; keep it parameterized.

```ts
const rows = await db
  .select({ id: users.id, email: users.email, name: users.name })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
```

## Writes And Transactions

- Use `insert`, `update`, and `delete` explicitly.
- Return created/updated rows only when the dialect supports it and the caller needs it.
- Map unique conflicts and not-found cases to useful Nest exceptions at the service boundary.
- Never trust client-provided IDs, timestamps, roles, ownership, or price fields unless the endpoint explicitly allows them.
- Use `db.transaction(async (tx) => { ... })` for multi-step writes that must commit or fail together.
- Pass `tx` through helper functions involved in the transaction; do not mix `db` and `tx` in the same unit of work.
- Keep transactions short. Do not perform slow external network calls inside a DB transaction.

```ts
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(orderValues).returning();
  await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id })));
});
```

## Migrations

- Use Drizzle Kit migrations for schema changes.
- Commit generated migration files with schema changes.
- Do not rely on `db push`, auto-sync, or runtime table creation in production.
- Review generated SQL before applying it to shared environments.
- Prefer deploy-safe changes: add nullable columns first, backfill, then enforce constraints.

Typical project scripts:

```bash
npm run db:generate
npm run db:migrate
```

## Testing

- Mock the DB provider for unit tests when testing business logic.
- Use a test database for query behavior, migrations, and integration paths.
- Tests for transactions should assert both success and rollback when data integrity matters.
