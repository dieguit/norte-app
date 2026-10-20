import { createZodDto } from 'nestjs-zod';
import {
  ConfirmSavingContributionWireSchema,
  ContributionIdPathWireSchema,
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema,
  SavingContributionCreatedSchema,
  SavingContributionDeletedSchema,
  SavingContributionDraftWireSchema,
  SavingContributionEditPreviewSchema,
  SavingContributionPreviewSchema,
  SavingContributionStaleSchema,
  SavingContributionUpdatedSchema,
  UpdateSavingContributionWireSchema,
} from '@repo/shared-types';

export class SavingContributionDraftDto extends createZodDto(SavingContributionDraftWireSchema) {}
export class ConfirmSavingContributionDto extends createZodDto(ConfirmSavingContributionWireSchema) {}
export class UpdateSavingContributionDto extends createZodDto(UpdateSavingContributionWireSchema) {}
export class ContributionIdPathDto extends createZodDto(ContributionIdPathWireSchema) {}
export class SavingContributionContextMissingDto extends createZodDto(SavingContributionContextMissingSchema) {}
export class SavingContributionContextPresentDto extends createZodDto(SavingContributionContextPresentSchema) {}
export class SavingContributionEditPreviewDto extends createZodDto(SavingContributionEditPreviewSchema) {}
export class SavingContributionPreviewDto extends createZodDto(SavingContributionPreviewSchema) {}
export class SavingContributionCreatedDto extends createZodDto(SavingContributionCreatedSchema) {}
export class SavingContributionStaleDto extends createZodDto(SavingContributionStaleSchema) {}
export class SavingContributionUpdatedDto extends createZodDto(SavingContributionUpdatedSchema) {}
export class SavingContributionDeletedDto extends createZodDto(SavingContributionDeletedSchema) {}
