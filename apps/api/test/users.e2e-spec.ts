import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;

  const createUserPayload = () => ({
    name: `E2E User ${crypto.randomUUID()}`,
    phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}`,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates and lists a user through HTTP', async () => {
    const newUser = createUserPayload();

    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send(newUser)
      .expect(201);

    const body = createResponse.body as {
      id: string;
      name: string;
      phone: string;
    };
    expect(body).toMatchObject(newUser);
    expect(body.id).toEqual(expect.any(String));

    const listResponse = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: body.id })]),
    );
  });

  it('returns a created user by id through HTTP', async () => {
    const newUser = createUserPayload();

    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send(newUser)
      .expect(201);

    const body = createResponse.body as { id: string };
    const getResponse = await request(app.getHttpServer())
      .get(`/users/${body.id}`)
      .expect(200);

    expect(getResponse.body).toEqual(createResponse.body);
  });

  it('returns 404 when a valid user id is not found', async () => {
    await request(app.getHttpServer())
      .get(`/users/${crypto.randomUUID()}`)
      .expect(404);
  });

  it.each([
    ['missing name', { phone: '+15551234567' }],
    ['missing phone', { name: 'E2E User Missing Phone' }],
    ['empty name', { name: '', phone: '+15551234567' }],
    ['empty phone', { name: 'E2E User Empty Phone', phone: '' }],
  ])('returns 400 when creating a user with %s', async (_case, body) => {
    await request(app.getHttpServer()).post('/users').send(body).expect(400);
  });

  it('returns 400 when getting a user with an invalid id', async () => {
    await request(app.getHttpServer()).get('/users/not-a-uuid').expect(400);
  });
});
