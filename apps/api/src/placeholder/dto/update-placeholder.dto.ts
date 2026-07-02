import { UpdatePlaceholderItemSchema } from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';

export class UpdatePlaceholderDto extends createZodDto(
  UpdatePlaceholderItemSchema,
) {}
