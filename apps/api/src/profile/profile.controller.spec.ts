import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProfileController } from './profile.controller';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ProfileService } from './profile.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('GET /me/profile', () => {
  let app: INestApplication;
  const getProfile = vi.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        ClerkAuthGuard,
        { provide: ProfileService, useValue: { getProfile } },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (name: string) =>
              ({
                CLERK_SECRET_KEY: 'placeholder',
                CLERK_ISSUER_URL: 'https://clerk.example.test',
                CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'],
              })[name],
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/me/profile').expect(401);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens before any database read', async () => {
    vi.mocked(verifyToken).mockRejectedValueOnce(new Error('invalid'));
    await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('uses only the verified Clerk subject and returns the profile response', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    getProfile.mockResolvedValueOnce({ profile: 'missing' });
    await request(app.getHttpServer())
      .get('/me/profile?userId=attacker')
      .set('Authorization', 'Bearer verified')
      .expect(200, { profile: 'missing' });
    expect(getProfile).toHaveBeenCalledWith('verified-user');
  });

  it('serializes the complete home response including optional-field omission', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    const home = {
      income: { amount: '123.45', currency: 'ARS' },
      expensesKnowledge: 'unknown',
      plan: {
        fundingMethod: 'save',
        destinationCurrency: 'USD',
        monthlyCommitment: { amount: '100.00', currency: 'ARS' },
        destinationAmount: { amount: '0.07', currency: 'USD' },
        effectiveMonth: '2026-10',
        allocationPercentage: '100.00',
      },
      goal: {
        type: 'emergency_fund',
        name: 'Fondo',
        currentAmount: { amount: '0.00', currency: 'USD' },
        emergencyFundMonths: 3,
      },
      previousMonthShortfalls: [],
    };
    getProfile.mockResolvedValueOnce({ profile: 'present', home });

    await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', 'Bearer verified')
      .expect(200, { profile: 'present', home });
  });
});
