import {
  BenefitCatalogResponseSchema,
  BenefitPreferencesSchema,
  UpdateBenefitPreferencesSchema,
} from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';

export class BenefitCatalogResponseDto extends createZodDto(
  BenefitCatalogResponseSchema,
) {}
export class BenefitPreferencesDto extends createZodDto(
  BenefitPreferencesSchema,
) {}
export class UpdateBenefitPreferencesDto extends createZodDto(
  UpdateBenefitPreferencesSchema,
) {}
