import {
  DeletePlaceholderItemResponseSchema,
  PlaceholderItemListSchema,
  PlaceholderItemSchema,
} from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';

export class PlaceholderResponseDto extends createZodDto(
  PlaceholderItemSchema,
) {}

export class PlaceholderListResponseDto extends createZodDto(
  PlaceholderItemListSchema,
) {}

export class DeletePlaceholderResponseDto extends createZodDto(
  DeletePlaceholderItemResponseSchema,
) {}
