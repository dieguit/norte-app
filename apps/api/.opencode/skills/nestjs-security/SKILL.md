---
name: nestjs-security
description: Guides NestJS security boundaries: input validation, guards, JWT handling, rate limiting, safe responses, and safe logging. Use when editing auth, public endpoints, or sensitive data flows.
license: MIT
metadata:
  stack: NestJS, nestjs-zod
  version: "1.0.0"
---

# NestJS Security

## Overview

Protect trust boundaries first: validate input, enforce auth with guards, serialize safe responses, and avoid leaking secrets in logs or errors.

## When to Use

- Editing authentication or authorization.
- Adding public or expensive endpoints.
- Handling user input that may be rendered later.
- Returning user, account, token, payment, or internal data.
- Adding logs around requests, auth, or external providers.

## Input Boundaries

- Validate every body, query, and params object with `nestjs-zod`.
- Use `z.coerce` for query and params values that arrive as strings.
- Reject unknown or dangerous input where accepting it creates ambiguity or risk.
- Do not trust client-provided ownership, role, tenant, price, or timestamp fields.

## Authentication And Authorization

- Use guards for authentication and authorization.
- Do not repeat auth checks manually in every controller method.
- Separate authentication from authorization when the logic grows.
- Prefer route-level or controller-level guards that make access requirements visible.
- Custom decorators such as `@CurrentUser()` are fine when reused; do not create one for a single route.

## JWT Guidance, When JWT Exists

- Keep access tokens short-lived.
- Store secrets in validated config, never in source.
- Use strong secrets/keys and explicit algorithms.
- Keep token payloads minimal: subject, tenant, roles/permissions when needed.
- Validate the user still exists and is allowed when security requires current state.
- Treat refresh tokens as sensitive credentials; hash them if persisted.

## Rate Limiting, When Public Or Expensive

- Rate-limit login, signup, password reset, token refresh, and expensive public endpoints.
- Use stricter limits on unauthenticated endpoints.
- Do not add custom rate-limit machinery if `@nestjs/throttler` or existing infrastructure already covers it.

## Output Safety

- Never return password hashes, refresh tokens, provider tokens, internal flags, or authorization internals.
- Use Zod response DTOs or explicit mapping for response shapes.
- Do not return raw Drizzle rows from sensitive endpoints.
- Sanitize or reject user-provided HTML/markdown if it will be rendered by clients.
- Avoid reflecting raw user input in error messages.

## Logging

- Do not log secrets, tokens, passwords, auth headers, cookies, or full payment payloads.
- Use structured logging with context where the project already supports it.
- `console.log` is acceptable only for temporary local debugging and must not be committed.
- Log enough context to debug failures without leaking private data.

## Error Responses

- Do not reveal whether a login email exists unless the product explicitly allows it.
- Return consistent auth failure responses.
- Keep detailed internal errors in logs, not public responses.

## Dependencies And Defaults

- Prefer Nest/platform features before adding security dependencies.
- Add a dependency only when the platform or existing dependency cannot cover the requirement safely.
- Security checks at trust boundaries are not optional, even for lean implementations.
