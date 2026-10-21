import { describe, expect, it } from 'vitest';
import { buildInstructions, createNorteAgent } from './norte-agent';

const env = {
  LLM_BASE_URL: 'http://127.0.0.1:4999/v1',
  LLM_API_KEY: 'k',
  LLM_MODEL: 'cx/gpt-5.5',
};

describe('norte agent', () => {
  it('exposes confirm and undo tools', async () => {
    const agent = createNorteAgent(env, { services: {} as never });
    const tools = await agent.listTools();
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining(['confirmPendingAction', 'undoLastWrite']),
    );
  });

  it('includes confirmation rules and app links', () => {
    const text = buildInstructions('https://app.norte.test');
    expect(text).toContain('confirmPendingAction');
    expect(text).toContain('https://app.norte.test/app/goals');
    expect(text).not.toContain('Todavía no tenés acceso');
  });

  it('omits links when no web app url is configured', () => {
    expect(buildInstructions()).not.toContain('/app/goals');
  });
});
