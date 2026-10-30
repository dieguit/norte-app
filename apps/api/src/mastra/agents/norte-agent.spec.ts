import { describe, expect, it } from 'vitest';
import {
  buildInstructions,
  createNorteAgent,
  reserveFinalReply,
} from './norte-agent';
import { roles } from '../../config/llm.config';

const env = {
  LLM_BASE_URL: 'http://127.0.0.1:4999/v1',
  LLM_API_KEY: 'k',
  LLM_MODEL: 'agy/gemini-3.8-flash-low',
  LLM_GUARD_MODEL: 'agy/gemini-3.5-flash-lite',
};

describe('norte agent', () => {
  it('uses the main role effort unless overridden', async () => {
    const normal = createNorteAgent(env, { services: {} as never });
    expect((await normal.getDefaultOptions()).providerOptions).toEqual({
      omniroute: { reasoningEffort: roles.main.effort },
    });
    const bench = createNorteAgent(env, {
      services: {} as never,
      main: { model: 'agy-flash-low', effort: 'minimal' },
    });
    expect((await bench.getDefaultOptions()).providerOptions).toEqual({
      omniroute: { reasoningEffort: 'minimal' },
    });
  });
  it('exposes confirm and undo tools', async () => {
    const agent = createNorteAgent(env, { services: {} as never });
    const tools = await agent.listTools();
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'confirmPendingAction',
        'undoLastWrite',
        'recordExpenses',
        'getFinancesSummary',
        'getRoadmap',
        'listCategories',
        'getNotificationSettings',
        'updateNotificationSetting',
        'getDailySummary',
      ]),
    );
  });

  it('runs unicode normalization and guardrails on input', async () => {
    const agent = createNorteAgent(env, { services: {} as never });
    const processors = await agent.listConfiguredInputProcessors();
    expect(processors.map((p) => p.id)).toEqual([
      'unicode-normalizer',
      'norte-input-guardrails',
      'norte-domain-router',
    ]);
  });

  it('includes confirmation rules and app links', () => {
    const text = buildInstructions('https://app.norte.test');
    expect(text).toContain('confirmPendingAction');
    expect(text).toContain('https://app.norte.test/app/goals');
    expect(text).toContain('https://app.norte.test/app/finances/benefits');
    expect(text).not.toContain('Todavía no tenés acceso');
    expect(text).not.toContain('(monto, concepto, categoría');
    expect(text).toContain('fecha de hoy');
    expect(text).toContain('skill');
    expect(text).not.toContain('getNotificationSettings');
    expect(text).toContain('sólo podés ayudar con sus finanzas');
    expect(text).toContain('Aviso de espera');
  });

  it('omits links when no web app url is configured', () => {
    expect(buildInstructions()).not.toContain('/app/goals');
    expect(buildInstructions()).not.toContain('fondo-de-emergencia: ');
  });

  it('reserves the last step for a reply when tools would exhaust maxSteps', () => {
    expect(
      reserveFinalReply({ iteration: 9, finishReason: 'tool-calls' }),
    ).toMatchObject({
      continue: false,
      feedback: expect.any(String) as string,
    });
    expect(
      reserveFinalReply({ iteration: 3, finishReason: 'tool-calls' }),
    ).toBeUndefined();
    expect(
      reserveFinalReply({ iteration: 9, finishReason: 'stop' }),
    ).toBeUndefined();
  });
});
