import { verifyToken } from '@clerk/backend';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('/expenses', () => {
  let app: INestApplication;
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const response = {
    id: '00000000-0000-4000-8000-000000000001',
    sourceKind: 'housing',
    sourceId: null,
    concept: null,
    amount: '100.00',
    currency: 'ARS',
    recurring: true,
    effectiveMonth: '2026-10-01',
    endMonth: null,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        ClerkAuthGuard,
        {
          provide: ExpensesService,
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

  it('authenticates, validates and uses the verified subject for mutations', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    create.mockResolvedValueOnce(response);
    const body = {
      draft: {
        source: { kind: 'housing' },
        concept: '',
        amount: '100',
        currency: 'ARS',
        recurring: true,
      },
      effectiveMonth: '2026-10',
      userId: 'attacker',
    };
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(201, response);
    expect(create).toHaveBeenCalledWith('verified-user', {
      draft: { ...body.draft, concept: null },
      effectiveMonth: '2026-10',
    });
    await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', 'Bearer valid')
      .send({ ...body, effectiveMonth: '2026-13' })
      .expect(400);
    await request(app.getHttpServer()).post('/expenses').send({}).expect(401);
  });

  it('validates path UUIDs and month body for update/delete', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    await request(app.getHttpServer())
      .patch('/expenses/not-a-uuid')
      .set('Authorization', 'Bearer valid')
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .delete('/expenses/not-a-uuid')
      .set('Authorization', 'Bearer valid')
      .send({ effectiveMonth: '2026-10' })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/expenses/${response.id}`)
      .set('Authorization', 'Bearer valid')
      .send({ effectiveMonth: 'bad' })
      .expect(400);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('preserves not-found ownership errors and generates Swagger paths', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);
    update.mockRejectedValueOnce(new NotFoundException('Gasto no encontrado.'));
    await request(app.getHttpServer())
      .patch(`/expenses/${response.id}`)
      .set('Authorization', 'Bearer valid')
      .send({
        draft: {
          source: { kind: 'housing' },
          amount: '10',
          currency: 'ARS',
          recurring: false,
        },
        effectiveMonth: '2026-10',
      })
      .expect(404);
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );
    expect(document.paths).toHaveProperty('/expenses');
    expect(document.paths).toHaveProperty('/expenses/{id}');
  });
});
