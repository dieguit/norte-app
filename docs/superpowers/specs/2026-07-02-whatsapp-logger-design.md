# Design Spec: Migrate WhatsApp Services to NestJS Logger

## Background
Currently, the WhatsApp services (`WhatsappConnectionService` and `WhatsappMessageService`) use `console.log` and `console.error` directly. To follow NestJS best practices, these should be replaced with the NestJS built-in `Logger` class.

## Proposed Changes

### 1. `WhatsappConnectionService`
* Import `Logger` from `@nestjs/common`.
* Instantiate `private readonly logger = new Logger(WhatsappConnectionService.name)`.
* Replace `console.log` with `this.logger.log`.
* Replace `console.error` with `this.logger.error`.

### 2. `WhatsappMessageService`
* Import `Logger` from `@nestjs/common`.
* Instantiate `private readonly logger = new Logger(WhatsappMessageService.name)`.
* Replace `console.log` with `this.logger.log`.
* Replace `console.error` with `this.logger.error`.

### 3. Unit Tests
* In both `whatsapp-connection.service.spec.ts` and `whatsapp-message.service.spec.ts`, replace the spy on `console` with a spy on `Logger.prototype`:
  ```typescript
  import { Logger } from '@nestjs/common';
  // ...
  loggerLog = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  ```

## Verification Plan
* Run tests with `pnpm --filter @repo/api test` to verify all test suites pass.
