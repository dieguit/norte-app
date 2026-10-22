import { describe, expect, it } from 'vitest';
import { buildInstructions, createNorteAgent } from './norte-agent';

const env = {
  LLM_BASE_URL: 'http://127.0.0.1:4999/v1',
  LLM_API_KEY: 'k',
  LLM_MODEL: 'agy/gemini-3.8-flash-low',
  LLM_GUARD_MODEL: 'agy/gemini-3.5-flash-lite',
};

describe('norte agent', () => {
  it('exposes confirm and undo tools', async () => {
    const agent = createNorteAgent(env, { services: {} as never });
    const tools = await agent.listTools();
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'confirmPendingAction',
        'undoLastWrite',
        'recordExpense',
        'getFinancesSummary',
        'getRoadmap',
        'readSource',
        'getCurrentDate',
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
    ]);
  });

  it('includes confirmation rules and app links', () => {
    const text = buildInstructions('https://app.norte.test');
    expect(text).toContain('confirmPendingAction');
    expect(text).toContain('https://app.norte.test/app/goals');
    expect(text).not.toContain('Todavía no tenés acceso');
    expect(text).not.toContain('(monto, concepto, categoría');
    expect(text).toContain('getCurrentDate');
    expect(text).toContain('listCategories');
    expect(text).toContain('getNotificationSettings');
    expect(text).toContain('day_close_checkin');
  });

  it('omits links when no web app url is configured', () => {
    expect(buildInstructions()).not.toContain('/app/goals');
    expect(buildInstructions()).toContain('fondo-de-emergencia: ');
  });
});
