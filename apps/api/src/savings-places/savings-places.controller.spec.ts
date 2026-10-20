import { verifyToken } from '@clerk/backend';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { SavingsPlacesController } from './savings-places.controller';
import { SavingsPlacesService } from './savings-places.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('/savings-places HTTP and OpenAPI', () => {
  let app: INestApplication;
  const create = vi.fn();
  const rename = vi.fn();
  const remove = vi.fn();
  const transfer = vi.fn();
  const placeId = '00000000-0000-4000-8000-000000000001';
  const transferId = '00000000-0000-4000-8000-000000000002';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SavingsPlacesController],
      providers: [
        ClerkAuthGuard,
        { provide: SavingsPlacesService, useValue: { create, rename, delete: remove, transfer } },
        { provide: ConfigService, useValue: { getOrThrow: (key: string) => ({ CLERK_SECRET_KEY: 'placeholder', CLERK_ISSUER_URL: 'https://clerk.example.test', CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'] })[key] } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });
  afterAll(async () => app.close());

  it('authenticates, validates all mutation boundaries and emits safe responses', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    create.mockResolvedValue({ placeId });
    transfer.mockResolvedValue({ transferId });
    await request(app.getHttpServer()).post('/savings-places').send({ name: 'Caja' }).expect(401);
    await request(app.getHttpServer()).post('/savings-places').set('Authorization', 'Bearer valid').send({ name: '  Caja  ', userId: 'attacker' }).expect(201, { placeId });
    expect(create).toHaveBeenCalledWith('verified-user', 'Caja');
    await request(app.getHttpServer()).post('/savings-places/transfers').set('Authorization', 'Bearer valid').send({ fromPlaceId: placeId, toPlaceId: placeId, currency: 'ARS', amount: '10' }).expect(400);
    await request(app.getHttpServer()).post('/savings-places/transfers').set('Authorization', 'Bearer valid').send({ fromPlaceId: placeId, toPlaceId: '00000000-0000-4000-8000-000000000003', currency: 'USD', amount: '10,25' }).expect(201, { transferId });
    await request(app.getHttpServer()).patch(`/savings-places/${placeId}`).set('Authorization', 'Bearer valid').send({ name: 'Nueva' }).expect(204);
    await request(app.getHttpServer()).delete(`/savings-places/${placeId}`).set('Authorization', 'Bearer valid').expect(204);
  });

  it('documents all four routes with response types and no-content metadata', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('test').build());
    expect(document.paths).toHaveProperty('/savings-places');
    expect(document.paths).toHaveProperty('/savings-places/{id}');
    expect(document.paths).toHaveProperty('/savings-places/transfers');
    expect(document.paths['/savings-places']?.post?.responses).toHaveProperty('201');
    expect(document.paths['/savings-places/transfers']?.post?.responses).toHaveProperty('201');
    expect(document.paths['/savings-places/{id}']?.patch?.responses).toHaveProperty('204');
    expect(document.paths['/savings-places/{id}']?.delete?.responses).toHaveProperty('204');
    expect(document.components?.schemas).toHaveProperty('SavingsPlaceMutationResponseDto_Output');
    expect(document.components?.schemas).toHaveProperty('SavingsTransferResponseDto_Output');
    expect(document.components?.schemas?.SavingsTransferDto).toMatchObject({ properties: { amount: { type: 'string' }, currency: { enum: ['ARS', 'USD'] }, fromPlaceId: { format: 'uuid' } } });
    expect(document.components?.schemas?.SavingsPlaceMutationResponseDto_Output).toMatchObject({ properties: { placeId: { type: 'string', format: 'uuid' } } });
  });
});
