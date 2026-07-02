import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { DATABASE_CONNECTION } from './database.constants';
import { databaseProviders } from './database.providers';

describe('databaseProviders', () => {
  it('throws when DATABASE_URL is not in config', async () => {
    const configService = {
      get: vi.fn().mockReturnValue(undefined),
    };

    await expect(
      Test.createTestingModule({
        providers: [
          ...databaseProviders,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile(),
    ).rejects.toThrow('DATABASE_URL is required to start the API');
  });

  it('provides a database connection when DATABASE_URL is set', async () => {
    const configService = {
      get: vi
        .fn()
        .mockReturnValue('postgres://user:password@localhost:5432/app'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ...databaseProviders,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    expect(moduleRef.get(DATABASE_CONNECTION)).toBeDefined();
  });
});
