# AGENTS.md

This project is a NestJS API using Drizzle ORM and `nestjs-zod`.

Keep this file lean. For task-specific rules, load only the relevant Agent Skill in `.opencode/skills/` before editing code.

## Read The Relevant Skill

- Nest modules, providers, controllers, services, config, errors: `skills/nestjs-core/SKILL.md`
- DTOs, validation, response serialization, OpenAPI: `skills/nestjs-zod/SKILL.md`
- Database schema, queries, migrations, transactions: `skills/nestjs-drizzle/SKILL.md`
- Unit, integration, and e2e tests: `skills/nestjs-testing/SKILL.md`
- Auth, guards, rate limiting, output safety, logging safety: `skills/nestjs-security/SKILL.md`

## Non-Negotiables

- Organize by feature module, not by technical layer.
- Avoid circular dependencies. Do not reach for `forwardRef()` before redesigning the dependency.
- Use constructor injection. Do not use service locators or global containers.
- Provide a service in one module, export it, and import that module where needed.
- Keep providers singleton by default. Use request scope only for request-specific state.
- Validate all body, query, and params at the boundary with `nestjs-zod`.
- Do not add `class-validator`, `class-transformer`, Joi, TypeORM, or Prisma patterns unless the project already uses them.
- Use Drizzle migrations for schema changes. Do not rely on schema push or auto-sync in production.
- Use transactions for all-or-nothing multi-step writes.
- Do not return raw database rows when they can leak internal or sensitive fields.
- Add or update the smallest useful test for changed behavior.

## Default Code Shape

- `src/<feature>/<feature>.module.ts`
- `src/<feature>/<feature>.controller.ts`
- `src/<feature>/<feature>.service.ts`
- `src/<feature>/<feature>.dto.ts`
- `src/<feature>/<feature>.schema.ts` for feature-owned Drizzle tables when appropriate
- `src/database/` for shared DB module, connection, schema exports, and migrations config

## Avoid By Default

- Mandatory repository class per table.
- Global modules except true app-wide infrastructure such as config, logger, or database.
- Event emitters, queues, caches, API versioning, microservices, and health checks unless the feature needs them now.
- Abstract interfaces with one implementation.
- Custom decorators, filters, interceptors, or guards for one route only.

## Commands

Prefer project scripts from `package.json`. If unsure, inspect scripts before running commands.

```bash
# All repo:
pnpm test

# API specific:
pnpm --filter @repo/api check-types
pnpm --filter @repo/api test
pnpm --filter @repo/api test:e2e
pnpm --filter @repo/api test:cov
```

```

```
