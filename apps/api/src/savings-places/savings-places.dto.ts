import { createZodDto } from 'nestjs-zod';
import {
  CreateSavingsPlaceSchema,
  RenameSavingsPlaceSchema,
  SavingsPlaceIdParamsSchema,
  SavingsPlaceMutationResponseSchema,
  SavingsTransferSchema,
  SavingsTransferResponseSchema,
} from '@repo/shared-types';

const CreateSavingsPlaceDtoSchema = CreateSavingsPlaceSchema;
const RenameSavingsPlaceDtoSchema = RenameSavingsPlaceSchema;
const SavingsTransferDtoSchema = SavingsTransferSchema;
export class CreateSavingsPlaceDto extends createZodDto(
  CreateSavingsPlaceDtoSchema,
) {}
export class RenameSavingsPlaceDto extends createZodDto(
  RenameSavingsPlaceDtoSchema,
) {}
export class SavingsPlaceIdParamsDto extends createZodDto(
  SavingsPlaceIdParamsSchema,
) {}
export class SavingsTransferDto extends createZodDto(
  SavingsTransferDtoSchema,
) {}
export class SavingsPlaceMutationResponseDto extends createZodDto(
  SavingsPlaceMutationResponseSchema,
) {}
export class SavingsTransferResponseDto extends createZodDto(
  SavingsTransferResponseSchema,
) {}
