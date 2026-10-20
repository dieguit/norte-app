import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FinancesWorkspaceSchema } from '@repo/shared-types';

const FinancesQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
  })
  .strict();
export class FinancesQueryDto extends createZodDto(FinancesQuerySchema) {}
export class FinancesWorkspaceDto extends createZodDto(
  FinancesWorkspaceSchema,
) {}
