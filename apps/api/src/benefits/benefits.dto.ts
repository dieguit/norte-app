import {
  BenefitBankListSchema,
  BenefitProfileSchema,
  UpdateBenefitProfileSchema,
  BenefitSearchQuerySchema,
  BenefitSearchResultSchema,
  BenefitDetailSchema,
} from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class BenefitBankListDto extends createZodDto(BenefitBankListSchema) {}
export class BenefitProfileDto extends createZodDto(BenefitProfileSchema) {}
export class UpdateBenefitProfileDto extends createZodDto(
  UpdateBenefitProfileSchema,
) {}
export class BenefitSearchQueryDto extends createZodDto(
  BenefitSearchQuerySchema,
) {}
export class BenefitSearchResultDto extends createZodDto(
  BenefitSearchResultSchema,
) {}
export class BenefitDetailDto extends createZodDto(BenefitDetailSchema) {}
export class BenefitIdDto extends createZodDto(z.object({ id: z.uuid() })) {}
