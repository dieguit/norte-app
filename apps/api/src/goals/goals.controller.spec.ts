import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

function responseSchema(document: OpenAPIObject, path: string, method: 'get' | 'post' | 'put' | 'patch'): any {
  return (document.paths[path]![method]!.responses['200'] as any).content['application/json'].schema;
}

const workspace = { profile: 'present', workspace: { financialSummary: {
  month: '2026-08', income: { amount: '0.00', currency: 'ARS' }, expenses: { amount: '0.00', currency: 'ARS' },
  balance: { amount: '0.00', currency: 'ARS' }, dedicationPercentage: '90.00', contribution: { amount: '0.00', currency: 'ARS' },
}, groups: ['active', 'paused', 'completed'].map((status) => ({ status, goals: [] })) } };

describe('GET /goals', () => {
  let app: INestApplication;
  const getWorkspace = vi.fn();
  const getPlanContext = vi.fn();
  const previewCreation = vi.fn();
  const confirmCreation = vi.fn();
  const previewEdit = vi.fn();
  const confirmEdit = vi.fn();
  const getLifecyclePlanContext = vi.fn();
  const previewLifecycle = vi.fn();
  const confirmLifecycle = vi.fn();
  const getCompletionContext = vi.fn();
  const previewCompletion = vi.fn();
  const confirmCompletion = vi.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        ClerkAuthGuard,
        { provide: GoalsService, useValue: { getWorkspace, getPlanContext, getLifecyclePlanContext, previewCreation, confirmCreation, previewEdit, confirmEdit, previewLifecycle, confirmLifecycle, getCompletionContext, previewCompletion, confirmCompletion } },
        { provide: ConfigService, useValue: { getOrThrow: (key: string) => ({ CLERK_SECRET_KEY: 'key', CLERK_ISSUER_URL: 'https://clerk.example.test', CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'] })[key] } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('rejects unauthenticated requests and calls service with only verified subject', async () => {
    await request(app.getHttpServer()).get('/goals').expect(401);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    getWorkspace.mockResolvedValueOnce({ profile: 'missing' });
    await request(app.getHttpServer()).get('/goals?userId=attacker').set('Authorization', 'Bearer token').expect(200, { profile: 'missing' });
    expect(getWorkspace).toHaveBeenCalledWith('verified-user');
  });

  it('returns and documents the complete validated JSON workspace', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    getWorkspace.mockResolvedValueOnce(workspace);
    await request(app.getHttpServer()).get('/goals').set('Authorization', 'Bearer token').expect(200, workspace);

    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('test').setVersion('1').build());
    const responseSchema = (document.paths['/goals']?.get?.responses?.['200'] as any)?.content?.['application/json']?.schema;
    expect(responseSchema).toBeDefined();
    expect(responseSchema.oneOf).toHaveLength(2);
    const present = document.components?.schemas?.GoalsWorkspacePresentDto as any;
    expect(present.properties.workspace.properties.financialSummary.properties.income).toBeDefined();
    expect(present.properties.workspace.properties.groups.items.properties.goals.items.properties.projection).toBeDefined();
  });

  it('guards creation context and uses only the verified subject', async () => {
    await request(app.getHttpServer()).get('/goals/plan').expect(401);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    getPlanContext.mockResolvedValueOnce({ profile: 'missing' });
    await request(app.getHttpServer()).get('/goals/plan?userId=attacker').set('Authorization', 'Bearer token').expect(200, { profile: 'missing' });
    expect(getPlanContext).toHaveBeenCalledWith('verified-user', undefined);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    await request(app.getHttpServer()).get('/goals/plan?goalId=bad').set('Authorization', 'Bearer token').expect(400);
  });

  it('validates preview and confirmation bodies and documents creation unions', async () => {
    await request(app.getHttpServer()).post('/goals/preview').send({ unexpected: true }).expect(401);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    await request(app.getHttpServer()).post('/goals/preview').set('Authorization', 'Bearer token').send({ unexpected: true }).expect(400);

    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('test').setVersion('1').build());
    const contextResponse = responseSchema(document, '/goals/plan', 'get');
    const previewResponse = responseSchema(document, '/goals/preview', 'post');
    const confirmResponse = responseSchema(document, '/goals', 'post');
    expect(contextResponse.oneOf).toHaveLength(2);
    expect(previewResponse.$ref).toContain('GoalCreationPreviewDto');
    expect(confirmResponse.oneOf).toHaveLength(2);

    const editPreview = responseSchema(document, '/goals/{id}/preview', 'post');
    const editConfirm = responseSchema(document, '/goals/{id}', 'patch');
    const allocationPreview = responseSchema(document, '/goals/allocation/preview', 'post');
    const allocationConfirm = responseSchema(document, '/goals/allocation', 'put');
    expect(editPreview.$ref).toContain('GoalCreationPreviewDto');
    expect(editConfirm.oneOf).toHaveLength(2);
    expect(allocationPreview.$ref).toContain('AllocationChangePreviewDto');
    expect(allocationConfirm.oneOf).toHaveLength(2);
    expect(document.paths['/goals/allocation/preview']).toBeDefined();
    expect((document.components?.schemas?.GoalPlanContextPresentDto as any).properties.allocationContext).toBeDefined();
    expect(document.paths['/goals/plan']?.get?.parameters?.some((parameter: any) => parameter.name === 'goalId')).toBe(true);
  });

  it('routes lifecycle plan context only with a validated action and selected goal', async () => {
    const goalId = '11111111-1111-4111-8111-111111111111';
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    getLifecyclePlanContext.mockResolvedValueOnce({ profile: 'missing' });
    await request(app.getHttpServer()).get(`/goals/plan?goalId=${goalId}&action=pause&userId=attacker`).set('Authorization', 'Bearer token').expect(200, { profile: 'missing' });
    expect(getLifecyclePlanContext).toHaveBeenCalledWith('verified-user', goalId, 'pause');
    expect(getPlanContext).not.toHaveBeenCalledWith('verified-user', goalId);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    await request(app.getHttpServer()).get('/goals/plan?action=resume').set('Authorization', 'Bearer token').expect(400);
  });

  it('guards and validates lifecycle preview and confirmation bodies with exact routes', async () => {
    const goalId = '11111111-1111-4111-8111-111111111111';
    await request(app.getHttpServer()).post(`/goals/${goalId}/lifecycle/preview`).send({ lifecycle: 'pause' }).expect(401);
    await request(app.getHttpServer()).post(`/goals/${goalId}/lifecycle`).send({}).expect(401);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    await request(app.getHttpServer()).post(`/goals/${goalId}/lifecycle/preview`).set('Authorization', 'Bearer token').send({ lifecycle: 'pause', unexpected: true }).expect(400);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    previewLifecycle.mockResolvedValueOnce({ previewToken: 'a'.repeat(64) });
    await request(app.getHttpServer()).post(`/goals/${goalId}/lifecycle/preview`).set('Authorization', 'Bearer token').send({ lifecycle: 'pause', allocations: [] }).expect(200);
    expect(previewLifecycle).toHaveBeenCalledWith('verified-user', goalId, { lifecycle: 'pause', allocations: [] });
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    confirmLifecycle.mockResolvedValueOnce({ status: 'updated' });
    await request(app.getHttpServer()).post(`/goals/${goalId}/lifecycle`).set('Authorization', 'Bearer token').send({ lifecycle: 'resume', allocations: [], previewToken: 'a'.repeat(64) }).expect(200, { status: 'updated' });
    expect(confirmLifecycle).toHaveBeenCalledWith('verified-user', goalId, { lifecycle: 'resume', allocations: [], previewToken: 'a'.repeat(64) });

    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('test').setVersion('1').build());
    const planQuery = document.paths['/goals/plan']?.get?.parameters ?? [];
    expect(planQuery.some((parameter: any) => parameter.name === 'action' && parameter.in === 'query')).toBe(true);
    const planResponse = responseSchema(document, '/goals/plan', 'get');
    expect(planResponse.oneOf).toHaveLength(2);
    expect((document.components?.schemas?.GoalPlanContextPresentDto as any).properties.lifecycleContext).toBeDefined();
    const lifecyclePreview = responseSchema(document, '/goals/{id}/lifecycle/preview', 'post');
    const lifecycleConfirm = responseSchema(document, '/goals/{id}/lifecycle', 'post');
    expect(lifecyclePreview.$ref).toContain('GoalLifecyclePreviewDto');
    expect(lifecycleConfirm.oneOf).toHaveLength(2);
  });

  it('guards and routes completion context, preview, and confirmation with exact paths and validated bodies', async () => {
    const goalId = '11111111-1111-4111-8111-111111111111';
    await request(app.getHttpServer()).get(`/goals/${goalId}/completion`).expect(401);
    await request(app.getHttpServer()).post(`/goals/${goalId}/completion/preview`).send({ withdrawals: [], allocations: [] }).expect(401);
    await request(app.getHttpServer()).post(`/goals/${goalId}/completion`).send({}).expect(401);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    getCompletionContext.mockResolvedValueOnce({ profile: 'missing' });
    await request(app.getHttpServer()).get(`/goals/${goalId}/completion`).set('Authorization', 'Bearer token').expect(200, { profile: 'missing' });
    expect(getCompletionContext).toHaveBeenCalledWith('verified-user', goalId);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    await request(app.getHttpServer()).post(`/goals/${goalId}/completion/preview`).set('Authorization', 'Bearer token')
      .send({ withdrawals: [], allocations: [], goalId }).expect(400);
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    previewCompletion.mockResolvedValueOnce({ previewToken: 'a'.repeat(64) });
    await request(app.getHttpServer()).post(`/goals/${goalId}/completion/preview`).set('Authorization', 'Bearer token')
      .send({ withdrawals: [], allocations: [] }).expect(200);
    expect(previewCompletion).toHaveBeenCalledWith('verified-user', goalId, { withdrawals: [], allocations: [] });
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'verified-user', iss: 'https://clerk.example.test' } as never);
    confirmCompletion.mockResolvedValueOnce({ status: 'invalid', message: 'No se puede completar el objetivo con el estado actual.' });
    await request(app.getHttpServer()).post(`/goals/${goalId}/completion`).set('Authorization', 'Bearer token')
      .send({ withdrawals: [], allocations: [], previewToken: 'a'.repeat(64) }).expect(200, { status: 'invalid', message: 'No se puede completar el objetivo con el estado actual.' });
    expect(confirmCompletion).toHaveBeenCalledWith('verified-user', goalId, { withdrawals: [], allocations: [], previewToken: 'a'.repeat(64) });

    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('test').setVersion('1').build());
    const completionContext = responseSchema(document, '/goals/{id}/completion', 'get');
    const completionPreview = responseSchema(document, '/goals/{id}/completion/preview', 'post');
    const completionConfirm = responseSchema(document, '/goals/{id}/completion', 'post');
    expect(completionContext.oneOf).toHaveLength(2);
    expect(completionPreview.$ref).toContain('GoalCompletionPreviewDto');
    expect(completionConfirm.oneOf).toHaveLength(3);
    expect((document.components?.schemas?.GoalCompletionContextPresentDto as any).properties.context).toBeDefined();
  });
});
