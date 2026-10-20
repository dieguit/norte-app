import { createZodDto } from 'nestjs-zod';
import {
  IncomeDraftSchema,
  IncomeMutationResponseSchema,
} from '@repo/shared-types';
import { z } from 'zod';

export const CreateIncomeBodySchema = z.object({ draft: IncomeDraftSchema });
export const UpdateIncomeBodySchema = CreateIncomeBodySchema;
const IncomeIdParamsSchema = z.object({ id: z.string().uuid() });
export class CreateIncomeDto extends createZodDto(CreateIncomeBodySchema) {}
export class UpdateIncomeDto extends createZodDto(UpdateIncomeBodySchema) {}
export class IncomeIdParamsDto extends createZodDto(IncomeIdParamsSchema) {}
export class IncomeResponseDto extends createZodDto(
  IncomeMutationResponseSchema,
) {}
