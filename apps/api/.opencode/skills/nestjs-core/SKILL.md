---
name: nestjs-core
description: Guides NestJS modules, providers, dependency injection, controllers, services, configuration, lifecycle hooks, and error handling. Use when editing NestJS application structure or core server-side behavior.
license: MIT
metadata:
  stack: NestJS
  version: "1.0.0"
---

# NestJS Core

## Overview

Keep NestJS code modular, explicit, and boring. Feature modules own their behavior; dependencies are visible through constructors and module imports.

## When to Use

- Editing modules, providers, controllers, or services.
- Changing dependency injection, provider scopes, or module exports.
- Adding config, lifecycle hooks, or error handling.
- Refactoring feature boundaries or circular dependencies.

## Core Rules

| Area | Do | Avoid |
| --- | --- | --- |
| Modules | Organize by feature module | Global `controllers/`, `services/`, `dto/` layers |
| Dependencies | Constructor injection with `private readonly` | `ModuleRef.get()` service locator |
| Sharing | Export from one module and import that module | Re-providing the same service in many modules |
| Scope | Singleton providers by default | Request scope unless state is request-specific |
| Globals | Config, logger, database only when justified | Making feature modules global |
| Errors | Throw Nest exceptions in HTTP-facing services | Returning `{ error }` objects from services |

## Architecture

- A feature module owns its controller, service, DTOs, and feature-specific Drizzle schema/query code.
- Keep `AppModule` boring: import config, database, and feature modules.
- Avoid circular dependencies. First try extracting shared code, moving orchestration up, or emitting an event.
- Use `forwardRef()` only as a last resort and leave a short comment explaining why.
- Split a service when it has unrelated reasons to change; do not split just to satisfy a pattern.

## Modules And Providers

- Providers are module-scoped. If another module needs a provider, export it from its home module and import that module.
- Do not list the same service in multiple modules' `providers`; that creates multiple instances.
- Dynamic modules are fine for infrastructure that needs configuration. Keep feature modules static unless runtime config is truly needed.

## Dependency Injection

- Use symbols or abstract classes as injection tokens only when swapping implementations is real.
- Keep injected capabilities narrow. If a service only sends email, inject an email sender, not a god notification service.
- Do not store request user/context in singleton instance fields.

## Controllers And Services

- Controllers handle HTTP mapping: route params, body/query binding, guards, status codes, and response DTO decorators.
- Services handle business logic and orchestration.
- Keep controllers thin, but do not create useless pass-through services for one line of behavior.
- For layer-agnostic domain code, throw domain errors and map them to HTTP at the controller/filter boundary.

## Error Handling

- Await promises. For fire-and-forget work, add `.catch()` and log enough context.
- Background jobs, event handlers, cron jobs, and queue consumers must catch and handle errors explicitly.
- Use exception filters when error formatting is repeated or centralized. Do not add a custom filter for one endpoint.
- Never swallow errors that affect data integrity.

## Configuration And Lifecycle

- Use `@nestjs/config` for environment config.
- Validate config at boot. Prefer a small Zod env schema over Joi.
- Do not read `process.env` throughout services. Parse once, inject typed config.
- Keep constructors cheap. Do I/O in lifecycle hooks or explicit methods.
- Enable graceful shutdown for deployed APIs and close DB/queue resources.

## Optional Patterns

- Events help decouple side effects, but add them only when direct dependencies are becoming a problem.
- Interceptors are for repeated cross-cutting behavior such as logging, tracing, caching, or response transforms.
- API versioning belongs only when public clients need compatibility across breaking changes.
