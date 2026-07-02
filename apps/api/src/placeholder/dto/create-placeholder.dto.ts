import { CreatePlaceholderItemSchema } from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';

export class CreatePlaceholderDto extends createZodDto(
  CreatePlaceholderItemSchema,
) {}
