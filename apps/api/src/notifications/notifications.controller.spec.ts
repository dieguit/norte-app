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
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

describe('/me/notifications', () => {
  let app: INestApplication;
  const listSettings = vi.fn();
  const updateSetting = vi.fn();
  const USER_ID = 'verified-user';

  const authed = <T extends request.Test>(req: T): T =>
    req.set('Authorization', 'Bearer valid');

  const setting = {
    type: 'day_close_checkin',
    enabled: true,
    frequency: 'daily',
    time: '21:30',
  };

  beforeAll(async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: USER_ID,
      iss: 'https://clerk.example.test',
    } as never);

    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        ClerkAuthGuard,
        {
          provide: NotificationsService,
          useValue: { listSettings, updateSetting },
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

  it('GET /me/notifications wraps settings for the authenticated user', async () => {
    listSettings.mockResolvedValue([setting]);
    const res = await authed(
      request(app.getHttpServer()).get('/me/notifications'),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ settings: [setting] });
    expect(listSettings).toHaveBeenCalledWith(USER_ID);
  });

  it('PATCH /me/notifications/:type updates the setting', async () => {
    updateSetting.mockResolvedValue(setting);
    const res = await authed(
      request(app.getHttpServer())
        .patch('/me/notifications/day_close_checkin')
        .send({ enabled: true, time: '21:30' }),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(setting);
    expect(updateSetting).toHaveBeenCalledWith(USER_ID, 'day_close_checkin', {
      enabled: true,
      time: '21:30',
    });
  });

  it.each([
    ['unknown type', '/me/notifications/weekly_digest', { enabled: true }],
    ['off-slot time', '/me/notifications/day_close_checkin', { time: '21:15' }],
    ['empty body', '/me/notifications/day_close_checkin', {}],
  ])(
    'PATCH rejects %s with 400 and writes nothing',
    async (_name, url, body) => {
      updateSetting.mockClear();
      const res = await authed(
        request(app.getHttpServer()).patch(url).send(body),
      );
      expect(res.status).toBe(400);
      expect(updateSetting).not.toHaveBeenCalled();
    },
  );
});
