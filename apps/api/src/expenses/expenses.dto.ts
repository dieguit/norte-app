import { createZodDto } from 'nestjs-zod';
import {
  ExpenseDraftSchema,
  ExpenseMutationResponseSchema,
} from '@repo/shared-types';
import { z } from 'zod';

const ExpenseMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Ingresá un mes válido.');
const CreateExpenseBodySchema = z.object({
  draft: ExpenseDraftSchema,
  effectiveMonth: ExpenseMonthSchema,
});
const UpdateExpenseBodySchema = CreateExpenseBodySchema;
const DeleteExpenseBodySchema = z.object({
  effectiveMonth: ExpenseMonthSchema,
});
const ExpenseIdParamsSchema = z.object({ id: z.string().uuid() });
export class CreateExpenseDto extends createZodDto(CreateExpenseBodySchema) {}
export class UpdateExpenseDto extends createZodDto(UpdateExpenseBodySchema) {}
export class DeleteExpenseDto extends createZodDto(DeleteExpenseBodySchema) {}
export class ExpenseIdParamsDto extends createZodDto(ExpenseIdParamsSchema) {}
export class ExpenseResponseDto extends createZodDto(
  ExpenseMutationResponseSchema,
) {}
