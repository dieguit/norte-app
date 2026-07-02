import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import type { CreateUserDto, UserResponseDto } from './users.dto';
import { users, type User } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const [user] = await this.db
      .insert(users)
      .values(createUserDto)
      .returning();

    return this.toResponse(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const userRows = await this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(50);

    return userRows.map((user) => this.toResponse(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
