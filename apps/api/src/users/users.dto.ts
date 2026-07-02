import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
});

export const UserParamsSchema = z.object({
  id: z.string().uuid(),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserListResponseSchema = z.array(UserResponseSchema);

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export class UserParamsDto extends createZodDto(UserParamsSchema) {}

export class UserResponseDto extends createZodDto(UserResponseSchema) {}

export class UserListResponseDto extends createZodDto(UserListResponseSchema) {}
