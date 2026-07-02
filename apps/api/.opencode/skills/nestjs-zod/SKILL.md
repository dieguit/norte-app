---
name: nestjs-zod
description: Guides NestJS request DTOs, validation, response serialization, OpenAPI output, and environment parsing with nestjs-zod and Zod. Use when editing API contracts or boundary validation.
license: MIT
metadata:
  stack: NestJS, Zod, nestjs-zod
  version: "1.0.0"
---

# NestJS Zod

## Overview

Use `nestjs-zod` for API boundary validation and response serialization. New code should not use `class-validator`, `class-transformer`, or Joi unless compatibility with existing code requires it.

## When to Use

- Adding or changing request body, query, or params DTOs.
- Adding response schemas or Swagger/OpenAPI output.
- Parsing environment variables.
- Removing raw database rows from API responses.

## App Setup

- Register `ZodValidationPipe` globally so `@Body()`, `@Query()`, and `@Param()` DTOs are parsed.
- Register `ZodSerializerInterceptor` globally if controllers use Zod response serialization.
- If using `@nestjs/swagger`, run `cleanupOpenApiDoc()` before `SwaggerModule.setup()`.
- Use a filter only when default Zod error responses need project-specific formatting or logging.

```ts
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

providers: [
  { provide: APP_PIPE, useClass: ZodValidationPipe },
  { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
]
```

## DTOs

- Define Zod schemas next to the feature that owns them.
- Export DTO classes with `createZodDto()` for Nest runtime metadata.
- Use schema composition instead of duplicating fields.
- Prefer explicit create/update/query/params DTOs over one giant optional DTO.
- Use `z.coerce` for query and param values that arrive as strings.
- Use `z.transform` only when the transformed value is what the service should receive.
- Use `.strict()` when unknown request keys should fail.

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export const UserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export class UserParamsDto extends createZodDto(UserParamsSchema) {}
```

## Controllers

- Type `@Body()`, `@Query()`, and `@Param()` with Zod DTO classes, not plain interfaces.
- Do not import DTOs with `import type`; Nest needs runtime classes.
- Built-in Nest pipes like `ParseIntPipe` are fine for trivial single params, but feature DTOs should use Zod.
- Guards are for auth/authz, not request body validation.

```ts
@Post()
@ZodResponse({ type: UserResponseDto, status: 201 })
create(@Body() dto: CreateUserDto) {
  return this.users.create(dto);
}
```

## Response Serialization

- Do not return raw Drizzle rows if they include internal fields or secrets.
- Prefer explicit mapping plus a Zod response DTO.
- Use `@ZodResponse()` where possible because it keeps runtime serialization, TypeScript return type, and OpenAPI docs aligned.
- Response schemas must omit secrets, password hashes, tokens, internal flags, and deleted-at fields unless explicitly part of the API.

```ts
export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
```

## OpenAPI

- Prefer `@ZodResponse()` over duplicating `@ApiResponse({ type })` and return types.
- Add `.meta({ id: 'Name' })` to reusable schemas that should appear clearly in OpenAPI components.
- Keep request and response schemas separate when defaults/transforms mean input and output differ.

## Config Validation

```ts
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
});

export const env = EnvSchema.parse(process.env);
```

## Avoid

- `ValidationPipe` plus `class-validator` decorators for new code.
- `ClassSerializerInterceptor`, `@Exclude`, and `@Expose` for new code.
- Hand-written DTO classes with no Zod schema.
- Returning unvalidated response objects from sensitive endpoints.
