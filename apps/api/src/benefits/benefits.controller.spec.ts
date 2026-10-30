import { verifyToken } from '@clerk/backend';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('BenefitsController', () => {
  let app: INestApplication;
  const catalog = vi.fn();
  const getPreferences = vi.fn();
  const savePreferences = vi.fn();
  const USER_ID = 'verified-user';

  const authed = <T extends request.Test>(req: T): T =>
    req.set('Authorization', 'Bearer valid');

  beforeAll(async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: USER_ID,
      iss: 'https://clerk.example.test',
    } as never);

    const module = await Test.createTestingModule({
      controllers: [BenefitsController],
      providers: [
        ClerkAuthGuard,
        {
          provide: BenefitsService,
          useValue: { catalog, getPreferences, savePreferences },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              ({
                CLERK_SECRET_KEY: 'placeholder',
                CLERK_ISSUER_URL: 'https://clerk.example.test',
                CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'],
              })[key],
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue({
      sub: USER_ID,
      iss: 'https://clerk.example.test',
    } as never);
  });

  it('GET /benefits/catalog requires auth and returns the catalog', async () => {
    catalog.mockReturnValue({
      providers: [],
      categories: [{ slug: 'cine', label: 'Cine' }],
    });
    await request(app.getHttpServer()).get('/benefits/catalog').expect(401);
    await authed(request(app.getHttpServer()).get('/benefits/catalog')).expect(
      200,
      { providers: [], categories: [{ slug: 'cine', label: 'Cine' }] },
    );
  });

  it('GET /me/benefits/preferences returns user preferences', async () => {
    getPreferences.mockResolvedValue({
      instrumentSlugs: ['modo'],
      categories: ['cine'],
      enabled: true,
    });
    await authed(
      request(app.getHttpServer()).get('/me/benefits/preferences'),
    ).expect(200, {
      instrumentSlugs: ['modo'],
      categories: ['cine'],
      enabled: true,
    });
    expect(getPreferences).toHaveBeenCalledWith(USER_ID);
  });

  it('PUT /me/benefits/preferences validates and saves for the verified user', async () => {
    savePreferences.mockResolvedValue({
      instrumentSlugs: ['modo'],
      categories: ['cine'],
      enabled: true,
    });
    await authed(
      request(app.getHttpServer())
        .put('/me/benefits/preferences')
        .send({ instrumentSlugs: [], categories: ['cine'] }),
    ).expect(400);
    await authed(
      request(app.getHttpServer())
        .put('/me/benefits/preferences')
        .send({ instrumentSlugs: ['modo'], categories: ['casino'] }),
    ).expect(400);
    await authed(
      request(app.getHttpServer())
        .put('/me/benefits/preferences')
        .send({ instrumentSlugs: ['modo'], categories: ['cine'] }),
    ).expect(200);
    expect(savePreferences).toHaveBeenCalledWith(USER_ID, {
      instrumentSlugs: ['modo'],
      categories: ['cine'],
    });
  });

  it('validates facts at the boundary', async () => {
    const body = {
      instrumentSlugs: ['modo'],
      categories: ['cine'],
      instrumentFacts: { modo: { membershipStatus: 'active' } },
      providerFacts: { macro: { salaryAccount: true } },
    };
    await authed(
      request(app.getHttpServer()).put('/me/benefits/preferences').send(body),
    ).expect(200);
    expect(savePreferences).toHaveBeenCalledWith(USER_ID, body);
    await authed(
      request(app.getHttpServer())
        .put('/me/benefits/preferences')
        .send({ ...body, providerFacts: { macro: { salaryAccount: 'yes' } } }),
    ).expect(400);
    await authed(
      request(app.getHttpServer())
        .put('/me/benefits/preferences')
        .send({ ...body, categories: [] }),
    ).expect(400);
  });
});
