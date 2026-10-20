import { createZodDto } from 'nestjs-zod';
import {
  FinancialOnboardingResponseSchema,
  FinancialOnboardingSchema,
} from '@repo/shared-types';

export class FinancialOnboardingDto extends createZodDto(
  FinancialOnboardingSchema,
) {}
export class FinancialOnboardingResponseDto extends createZodDto(
  FinancialOnboardingResponseSchema,
) {}
