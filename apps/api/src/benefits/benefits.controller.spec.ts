import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { BenefitsController } from './benefits.controller';
import { BenefitsService } from './benefits.service';
let app: INestApplication;
const profile = {
  banks: [],
  usesModo: false,
  categories: ['supermercados'],
  enabled: true,
};
const service = {
  banks: vi.fn().mockResolvedValue({ banks: [] }),
  getPreferences: vi.fn().mockResolvedValue(profile),
  savePreferences: vi.fn().mockResolvedValue(profile),
  search: vi
    .fn()
    .mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      profileConfigured: false,
      countsByCategory: {},
      staleBanks: [],
    }),
  detail: vi.fn(),
};
beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: [BenefitsController],
    providers: [{ provide: BenefitsService, useValue: service }],
  })
    .overrideGuard(ClerkAuthGuard)
    .useValue({
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        if (!req.headers.authorization) return false;
        req.user = { id: 'u' };
        return true;
      },
    })
    .compile();
  app = module.createNestApplication();
  await app.init();
});
afterAll(async () => app.close());
const get = (url: string) =>
  request(app.getHttpServer()).get(url).set('Authorization', 'test');
it('guards all routes and serializes output using production interceptor', async () => {
  await request(app.getHttpServer()).get('/benefits/banks').expect(403);
  await get('/benefits/banks').expect(200, { banks: [] });
  await get('/me/benefits/preferences').expect(200, profile);
  service.banks.mockResolvedValueOnce({
    banks: [{ slug: 'invalid' }],
  } as never);
  await get('/benefits/banks').expect(500);
});
it('validates profile, query and UUID at boundaries', async () => {
  const put = (body: object) =>
    request(app.getHttpServer())
      .put('/me/benefits/preferences')
      .set('Authorization', 'test')
      .send(body);
  const { enabled: _, ...body } = profile;
  await put({ ...body, categories: [] }).expect(400);
  await put({ ...body, categories: ['cine'] }).expect(400);
  await put({ ...body, unexpected: true }).expect(400);
  await put(body).expect(200);
  expect(service.savePreferences).toHaveBeenCalledWith('u', body);
  await get('/me/benefits/search?day=bad').expect(400);
  await get('/me/benefits/search?page=0').expect(400);
  await get('/me/benefits/search?day=tomorrow&pageSize=10').expect(200);
  expect(service.search).toHaveBeenCalledWith('u', {
    day: 'tomorrow',
    page: 1,
    pageSize: 10,
  });
  await get('/me/benefits/campaigns/not-a-uuid').expect(400);
});
