import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('GET /finances', () => {
  let app: INestApplication;
  const getWorkspace = vi.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FinancesController],
      providers: [
        ClerkAuthGuard,
        { provide: FinancesService, useValue: { getWorkspace } },
        { provide: ConfigService, useValue: { getOrThrow: (key: string) => ({ CLERK_SECRET_KEY: 'key', CLERK_ISSUER_URL: 'https://clerk.example.test', CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'] })[key] } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });
  afterAll(async () => app.close());

  it('validates selected month, scopes by verified user, and preserves missing-profile null', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ sub: 'actual-user', iss: 'https://clerk.example.test' } as never);
    getWorkspace.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/finances?month=2026-08').set('Authorization', 'Bearer token').expect(200, null);
    expect(getWorkspace).toHaveBeenCalledWith('actual-user', '2026-08');
    await request(app.getHttpServer()).get('/finances?month=2026-13').set('Authorization', 'Bearer token').expect(400);
    expect(getWorkspace).toHaveBeenCalledOnce();
  });
});
