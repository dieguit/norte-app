import { verifyToken } from '@clerk/backend';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('/incomes', () => {
  let app: INestApplication;
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const response = {
    id: '00000000-0000-4000-8000-000000000001',
    userId: 'verified-user',
    sourceKind: 'salary',
    sourceId: null,
    concept: null,
    amount: '100.00',
    currency: 'ARS',
    recurring: true,
    effectiveMonth: '2026-10-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [IncomesController],
      providers: [
        ClerkAuthGuard,
        {
          provide: IncomesService,
          useValue: { create, update, delete: remove },
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

  it('validates input and uses the verified Clerk subject', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    create.mockResolvedValueOnce(response);
    const draft = {
      concept: '',
      source: { kind: 'salary' },
      amount: '100',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-10',
    };
    await request(app.getHttpServer())
      .post('/incomes')
      .set('Authorization', 'Bearer valid')
      .send({ draft, userId: 'attacker' })
      .expect(201, response);
    expect(create).toHaveBeenCalledWith('verified-user', {
      draft: { ...draft, concept: null },
    });
    await request(app.getHttpServer())
      .post('/incomes')
      .set('Authorization', 'Bearer valid')
      .send({ draft: { ...draft, amount: '0' } })
      .expect(400);
    expect(create).toHaveBeenCalledOnce();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).post('/incomes').send({}).expect(401);
  });

  it('validates path UUIDs before update or delete', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    await request(app.getHttpServer())
      .patch('/incomes/not-a-uuid')
      .set('Authorization', 'Bearer valid')
      .send({ draft: {} })
      .expect(400);
    await request(app.getHttpServer())
      .delete('/incomes/not-a-uuid')
      .set('Authorization', 'Bearer valid')
      .expect(400);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('generates the Swagger document with income request/response DTOs', () => {
    expect(() =>
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('test').build(),
      ),
    ).not.toThrow();
  });
});
