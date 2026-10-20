import { createZodDto } from 'nestjs-zod';
import { ProfileResponseSchema } from '@repo/shared-types';

export class ProfileResponseDto extends createZodDto(ProfileResponseSchema) {}
