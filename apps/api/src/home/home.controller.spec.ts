import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const sampleGoal = {
  id: 'goal-1',
  name: 'Colchón de 3 meses',
  type: 'emergency_fund',
  currency: 'ARS' as const,
  priority: 'high' as const,
  strategy: 'save' as const,
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  targetAmount: { amount: '3000000.00', currency: 'ARS' as const },
  savingsValue: { amount: '0.00', currency: 'ARS' as const },
  investmentValue: { amount: '0.00', currency: 'ARS' as const },
  actualValue: { amount: '0.00', currency: 'ARS' as const },
  funding: [],
  projection: { status: 'available' as const, completionMonth: '2027-03' },
  usesPlanningRate: false,
  completionEligible: true,
};

const sampleMonth = {
  month: '2026-08',
  objectives: [sampleGoal],
  oneTimeExpenses: [],
  recurringExpenses: [],
  endingExpenses: [],
  oneTimeIncomes: [],
  recurringIncomes: [],
  contributions: [],
};

const sampleRoadmap = {
  undatedObjectives: [],
  futureMonths: [sampleMonth],
  currentMonth: sampleMonth,
  historyMonths: [],
};

describe('HomeController (GET /home)', () => {
  let app: INestApplication;
  const getHome = vi.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        ClerkAuthGuard,
        { provide: HomeService, useValue: { getHome } },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              ({
                CLERK_SECRET_KEY: 'key',
                CLERK_ISSUER_URL: 'https://clerk.example.test',
                CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'],
              })[key],
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/home').expect(401);
  });

  it('validates query param and rejects invalid currentMonth', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);

    await request(app.getHttpServer())
      .get('/home?currentMonth=2026-13')
      .set('Authorization', 'Bearer valid-token')
      .expect(400);

    expect(getHome).not.toHaveBeenCalled();
  });

  it('returns missing profile response when profile is missing', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      sub: 'user-missing',
      iss: 'https://clerk.example.test',
    } as never);
    getHome.mockResolvedValueOnce({ profile: 'missing' });

    await request(app.getHttpServer())
      .get('/home')
      .set('Authorization', 'Bearer valid-token')
      .expect(200, { profile: 'missing' });

    expect(getHome).toHaveBeenCalledWith('user-missing', undefined);
  });

  it('returns present profile roadmap and completion goals', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      sub: 'user-present',
      iss: 'https://clerk.example.test',
    } as never);
    const expected = {
      roadmap: sampleRoadmap,
      completionGoals: [sampleGoal],
    };
    getHome.mockResolvedValueOnce(expected);

    const res = await request(app.getHttpServer())
      .get('/home?currentMonth=2026-08')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(res.body).toEqual(expected);
    expect(res.body.completionGoals).toHaveLength(1);
    expect(res.body.completionGoals[0].id).toBe('goal-1');
    expect(res.body.roadmap.currentMonth.month).toBe('2026-08');
    expect(getHome).toHaveBeenCalledWith('user-present', '2026-08');
  });

  it('throws 500 when service output is invalid or leaks unvalidated properties', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      sub: 'user-invalid',
      iss: 'https://clerk.example.test',
    } as never);
    getHome.mockResolvedValueOnce({
      profile: 'missing',
      leakedField: 'unexpected',
    });

    await request(app.getHttpServer())
      .get('/home')
      .set('Authorization', 'Bearer valid-token')
      .expect(500);
  });

  it('documents endpoints and schemas in Swagger OpenAPI metadata', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Home API').setVersion('1').build(),
    );
    const homePath = document.paths['/home']?.get;
    expect(homePath).toBeDefined();

    const responseSchema = (homePath?.responses?.['200'] as any)?.content?.[
      'application/json'
    ]?.schema;
    expect(responseSchema).toBeDefined();
    expect(responseSchema.oneOf).toHaveLength(2);

    const schemas = document.components?.schemas as any;
    expect(schemas.HomeRoadmapMissingDto).toBeDefined();
    expect(schemas.HomeRoadmapPresentDto).toBeDefined();
    expect(
      schemas.HomeRoadmapPresentDto.properties.roadmap,
    ).toBeDefined();
    expect(
      schemas.HomeRoadmapPresentDto.properties.completionGoals,
    ).toBeDefined();
  });
});
