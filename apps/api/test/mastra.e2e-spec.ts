import { createServer, type Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type UpstreamCall = { url?: string; auth?: string; model?: string };

describe('Mastra routes (e2e)', () => {
  let app: INestApplication<App>;
  let upstream: Server;
  const calls: UpstreamCall[] = [];
  const generatePath = '/agents/agents/weather-agent/generate';
  const body = { messages: [{ role: 'user', content: 'hello' }] };

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        calls.push({
          url: req.url,
          auth: req.headers.authorization,
          model: (JSON.parse(raw || '{}') as { model?: string }).model,
        });
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            id: 'cmpl-test',
            object: 'chat.completion',
            created: 0,
            model: 'cx/gpt-5.5',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'mock reply' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) =>
      upstream.listen(4999, '127.0.0.1', resolve),
    );

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((resolve) => upstream?.close(resolve));
  });

  it('rejects requests without a token', () =>
    request(app.getHttpServer()).post(generatePath).send(body).expect(401));

  it('rejects requests with a wrong token', () =>
    request(app.getHttpServer())
      .post(generatePath)
      .set('Authorization', 'Bearer wrong')
      .send(body)
      .expect(401));

  it('routes authorized requests to the configured LLM endpoint', async () => {
    const res = await request(app.getHttpServer())
      .post(generatePath)
      .set('Authorization', 'Bearer test-mastra-key')
      .send(body)
      .expect(200);

    expect((res.body as { text: string }).text).toBe('mock reply');
    expect(calls).toContainEqual({
      url: '/v1/chat/completions',
      auth: 'Bearer test-llm-key',
      model: 'cx/gpt-5.5',
    });
  });

  it('does not shadow existing app routes', () =>
    request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));

  it('does not shadow the WhatsApp link claim route', () =>
    request(app.getHttpServer())
      .post(`/whatsapp/links/${'a'.repeat(43)}/claim`)
      .expect(401));
});
