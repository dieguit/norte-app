import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { users } from './users.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const createdAt = new Date('2026-01-02T03:04:05.000Z');
  const updatedAt = new Date('2026-01-03T04:05:06.000Z');

  it('creates a user and maps dates to ISO strings', async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: '2f6a48dc-06a4-4ac7-bc58-d40ff6fe2cf7',
        name: 'Diego',
        phone: '+5491112345678',
        createdAt,
        updatedAt,
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });

    const service = await createService({ insert });

    await expect(
      service.create({ name: 'Diego', phone: '+5491112345678' }),
    ).resolves.toEqual({
      id: '2f6a48dc-06a4-4ac7-bc58-d40ff6fe2cf7',
      name: 'Diego',
      phone: '+5491112345678',
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-01-03T04:05:06.000Z',
    });
    expect(insert).toHaveBeenCalledWith(users);
    expect(values).toHaveBeenCalledWith({
      name: 'Diego',
      phone: '+5491112345678',
    });
  });

  it('throws NotFoundException when a user is missing', async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });

    const service = await createService({ select });

    await expect(
      service.findOne('2f6a48dc-06a4-4ac7-bc58-d40ff6fe2cf7'),
    ).rejects.toThrow(NotFoundException);
  });
});

async function createService(db: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      UsersService,
      {
        provide: DATABASE_CONNECTION,
        useValue: db,
      },
    ],
  }).compile();

  return moduleRef.get(UsersService);
}
