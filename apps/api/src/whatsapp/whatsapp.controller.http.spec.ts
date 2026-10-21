import { verifyToken } from '@clerk/backend';
import { ConflictException, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { WHATSAPP_ADAPTER } from './whatsapp.adapter.provider';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappLinksService } from './whatsapp-links.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const token = 'a'.repeat(43);
const path = `/whatsapp/links/${token}/claim`;

async function makeApp(adapter: unknown, claim = vi.fn()) {
  const module = await Test.createTestingModule({
    controllers: [WhatsappController],
    providers: [
      ClerkAuthGuard,
      { provide: WhatsappLinksService, useValue: { claim } },
      { provide: WHATSAPP_ADAPTER, useValue: adapter },
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
  const app = module.createNestApplication();
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  return app;
}

describe('WhatsappController', () => {
  let app: INestApplication;
  beforeEach(() => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'user_1',
      iss: 'https://clerk.example.test',
    } as never);
  });
  afterEach(async () => app?.close());

  it('requires authentication', async () => {
    app = await makeApp(null);
    await request(app.getHttpServer()).post(path).expect(401);
  });

  it('rejects malformed tokens', async () => {
    app = await makeApp(null);
    await request(app.getHttpServer())
      .post('/whatsapp/links/short/claim')
      .set('Authorization', 'Bearer t')
      .expect(400);
  });

  it('claims for the signed-in user and confirms on WhatsApp (lid JID)', async () => {
    const claim = vi.fn().mockResolvedValue({ jid: '123@lid', alreadyClaimed: false });
    const adapter = {
      openDM: vi.fn().mockResolvedValue('whatsapp:thread-123'),
      postMessage: vi.fn().mockResolvedValue({}),
    };
    app = await makeApp(adapter, claim);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer t')
      .expect(200, { linked: true });
    expect(claim).toHaveBeenCalledWith(token, 'user_1');
    expect(adapter.openDM).toHaveBeenCalledWith('123@lid');
    expect(adapter.postMessage).toHaveBeenCalledWith(
      'whatsapp:thread-123',
      '✅ WhatsApp vinculado a tu cuenta Norte',
    );
  });

  it('does not send confirmation on idempotent re-claim', async () => {
    const claim = vi
      .fn()
      .mockResolvedValue({ jid: '123@lid', alreadyClaimed: true });
    const adapter = {
      openDM: vi.fn(),
      postMessage: vi.fn(),
    };
    app = await makeApp(adapter, claim);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer t')
      .expect(200, { linked: true });
    expect(claim).toHaveBeenCalledWith(token, 'user_1');
    expect(adapter.openDM).not.toHaveBeenCalled();
    expect(adapter.postMessage).not.toHaveBeenCalled();
  });

  it('still succeeds when the confirmation cannot be sent', async () => {
    const claim = vi.fn().mockResolvedValue({ jid: '123@lid', alreadyClaimed: false });
    const adapter = {
      openDM: vi.fn().mockResolvedValue('whatsapp:thread-123'),
      postMessage: vi.fn().mockRejectedValue(new Error('socket closed')),
    };
    app = await makeApp(adapter, claim);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer t')
      .expect(200, { linked: true });
  });

  it('succeeds without an adapter (WhatsApp disabled)', async () => {
    app = await makeApp(
      null,
      vi.fn().mockResolvedValue({ jid: '123@lid', alreadyClaimed: false }),
    );
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer t')
      .expect(200, { linked: true });
  });

  it('maps service errors to status codes', async () => {
    app = await makeApp(
      null,
      vi.fn().mockRejectedValue(new ConflictException('otro')),
    );
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer t')
      .expect(409);
  });
});
