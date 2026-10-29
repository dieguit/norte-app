import { describe, expect, it } from 'vitest';
import { Agent, type MastraDBMessage } from '@mastra/core/agent';
import { RequestContext } from '@mastra/core/request-context';
import { createMockModel } from '@mastra/core/test-utils/llm-mock';
import {
  createDomainProcessor,
  createRouter,
  domainNames,
  isUserTurn,
  parseRouterOutput,
  routingText,
  selectDomains,
} from './domain-router';

describe('domain routing', () => {
  const modelDomains = Object.fromEntries(
    domainNames.map((name) => [
      name,
      { skill: { instructions: `${name} rules` }, tools: {} },
    ]),
  ) as unknown as Parameters<typeof createDomainProcessor>[0];

  it.each([
    [['advice', 'notifications', 'finances', 'goals'], 'goals'],
    [['advice', 'notifications', 'finances'], 'finances'],
    [['advice', 'notifications'], 'notifications'],
    [['advice'], 'advice'],
    [[], undefined],
  ])(
    'selects the model by fixed priority for %j',
    async (selected, expected) => {
      const models = Object.fromEntries(
        domainNames.map((name) => [
          name,
          {
            model: {
              providerId: 'omniroute',
              modelId: name,
              url: 'http://localhost/v1',
            },
            providerOptions: { openai: { reasoningEffort: 'low' } },
          },
        ]),
      );
      const processor = createDomainProcessor(modelDomains, models);
      const requestContext = new RequestContext();
      requestContext.set('norteDomains', selected);
      const result = await processor.processInputStep!({
        requestContext,
        state: {},
        systemMessages: [],
        messages: [],
      } as unknown as Parameters<
        NonNullable<typeof processor.processInputStep>
      >[0]);
      if (expected) expect(result).toMatchObject(models[expected]);
      else expect(result).not.toHaveProperty('model');
    },
  );

  it('keeps the default model when selected domains have no override', async () => {
    for (const models of [
      undefined,
      { goals: { model: 'omniroute/goals' as const } },
    ]) {
      const processor = createDomainProcessor(modelDomains, models);
      const requestContext = new RequestContext();
      requestContext.set('norteDomains', ['finances']);
      const result = await processor.processInputStep!({
        requestContext,
        state: {},
        systemMessages: [],
        messages: [],
      } as unknown as Parameters<
        NonNullable<typeof processor.processInputStep>
      >[0]);
      expect(result).not.toHaveProperty('model');
    }
  });

  it('uses the domain model instead of the default during an agent run', async () => {
    const override = createMockModel({ mockText: 'OVERRIDE', version: 'v2' });
    if (override.specificationVersion !== 'v2')
      throw new Error('Expected v2 mock');
    const agent = new Agent({
      id: 'domain-model-test',
      name: 'Domain model test',
      instructions: 'Reply briefly.',
      model: createMockModel({ mockText: 'DEFAULT', version: 'v2' }),
      inputProcessors: [
        createDomainProcessor(modelDomains, {
          goals: { model: override },
        }),
      ],
    });
    const requestContext = new RequestContext();
    requestContext.set('norteDomains', ['goals']);
    expect((await agent.generate('Hola', { requestContext })).text).toBe(
      'OVERRIDE',
    );
    requestContext.set('norteDomains', ['advice']);
    expect((await agent.generate('Hola', { requestContext })).text).toBe(
      'DEFAULT',
    );
  });

  it('sends only text to the router, replacing attachments with a marker', () => {
    expect(
      routingText({
        content: {
          parts: [
            { type: 'text', text: 'anotá esto' },
            { type: 'file', data: 'BASE64' } as { type: string },
          ],
        },
      }),
    ).toBe('anotá esto\n[file]');
  });

  it('preserves core messages and enables a loaded skill without duplicating context', async () => {
    const domains = Object.fromEntries(
      domainNames.map((name) => [
        name,
        {
          skill: { instructions: `${name} rules` },
          tools: { [`${name}Tool`]: {} },
        },
      ]),
    ) as unknown as Parameters<typeof createDomainProcessor>[0];
    const processor = createDomainProcessor(domains);
    const requestContext = new RequestContext();
    requestContext.set('norteDomains', []);
    const args = {
      requestContext,
      state: {},
      systemMessages: [{ role: 'system', content: 'core' }],
      messages: [
        { role: 'user', content: { parts: [{ type: 'text', text: 'Hola' }] } },
        {
          role: 'assistant',
          content: {
            parts: [
              {
                type: 'tool-invocation',
                toolInvocation: {
                  toolName: 'skill',
                  state: 'result',
                  args: { name: 'advice' },
                  result: 'advice rules',
                },
              },
            ],
          },
        },
      ],
    } as unknown as Parameters<
      NonNullable<typeof processor.processInputStep>
    >[0];
    const first = await processor.processInputStep!(args);
    expect(first).toMatchObject({
      systemMessages: [
        { role: 'system', content: 'core' },
        {
          role: 'system',
          content: expect.stringMatching(
            /^Hoy es \d{4}-\d{2}-\d{2} \(mes \d{4}-\d{2}\)/,
          ) as string,
        },
        {
          role: 'system',
          content: expect.stringMatching(
            /^Skill "advice" ya cargada[^]*advice rules$/,
          ) as string,
        },
      ],
      activeTools: [
        'confirmPendingAction',
        'undoLastWrite',
        'skill',
        'adviceTool',
      ],
    });
    const second = await processor.processInputStep!({
      ...args,
      systemMessages: (first as { systemMessages: typeof args.systemMessages })
        .systemMessages,
    });
    expect(second).toEqual(first);
  });
  it('shares request context set in processInput with the model-step processor', async () => {
    let observed: unknown;
    const agent = new Agent({
      id: 'context-test',
      name: 'Context test',
      instructions: 'Reply briefly.',
      model: createMockModel({ mockText: 'OK', version: 'v2' }),
      inputProcessors: [
        {
          id: 'test-route',
          processInput: ({ messages, requestContext }) => {
            requestContext?.set('norteDomains', ['goals']);
            return messages;
          },
        },
        {
          id: 'test-step-reader',
          processInputStep: ({ requestContext }) => {
            observed = requestContext?.get('norteDomains');
          },
        },
      ],
    });
    await agent.generate('Hola', { requestContext: new RequestContext() });
    expect(observed).toEqual(['goals']);
  });
  it('appends preloaded categories to the finances skill only', async () => {
    const domains = Object.fromEntries(
      domainNames.map((name) => [
        name,
        { skill: { instructions: `${name} rules` }, tools: {} },
      ]),
    ) as unknown as Parameters<typeof createDomainProcessor>[0];
    const processor = createDomainProcessor(domains);
    const requestContext = new RequestContext();
    requestContext.set('norteDomains', ['finances', 'goals']);
    requestContext.set('norteCategories', { expense: { custom: ['Café'] } });
    const result = (await processor.processInputStep!({
      requestContext,
      state: {},
      systemMessages: [],
      messages: [],
    } as unknown as Parameters<
      NonNullable<typeof processor.processInputStep>
    >[0])) as { systemMessages: { content: string }[] };
    const [, finances, goals] = result.systemMessages.map((m) => m.content);
    expect(finances).toContain('Categorías del usuario');
    expect(finances).toContain('Café');
    expect(goals).not.toContain('Categorías del usuario');
  });
  it('recognizes channel user signals as the user turn', () => {
    const content = (type: string) => ({ metadata: { signal: { type } } });
    expect(
      isUserTurn({ role: 'signal', type: 'user', content: content('user') }),
    ).toBe(true);
    expect(isUserTurn({ role: 'user', content: {} })).toBe(true);
    expect(isUserTurn({ role: 'signal', content: content('state') })).toBe(
      false,
    );
    expect(isUserTurn({ role: 'assistant', content: {} })).toBe(false);
  });
  it('routes the latest user signal and skips when there is none', async () => {
    const route = createRouter(
      createMockModel({ mockText: '{"domains":["goals"]}', version: 'v2' }),
      { omniroute: { reasoningEffort: 'none' } },
    );
    const requestContext = new RequestContext();
    const signal = {
      role: 'signal',
      type: 'user',
      content: {
        format: 2,
        parts: [{ type: 'text', text: 'quiero ahorrar' }],
        metadata: { signal: { type: 'user' } },
      },
    } as unknown as MastraDBMessage;
    await route({ messages: [signal], requestContext });
    expect(requestContext.get('norteDomains')).toEqual(['goals']);
    await route({ messages: [], requestContext });
    expect(requestContext.get('norteDomains')).toBeUndefined();
  });
  it('selects routed domains', () => {
    expect(selectDomains(['finances', 'goals'])).toEqual(['finances', 'goals']);
  });
  it('falls back to all domains when routing is missing or invalid', () => {
    expect(selectDomains(undefined)).toEqual(domainNames);
    expect(selectDomains(['invalid'])).toEqual(domainNames);
  });
  it('unions loaded skills with routed domains', () => {
    expect(selectDomains(['finances'], ['advice', 'finances'])).toEqual([
      'finances',
      'advice',
    ]);
  });
  it('keeps chit-chat core only', () => {
    expect(selectDomains([])).toEqual([]);
  });
  it('parses multi-label and empty output, rejects malformed output', () => {
    expect(parseRouterOutput({ domains: ['goals', 'advice'] })).toEqual([
      'goals',
      'advice',
    ]);
    expect(parseRouterOutput({ domains: [] })).toEqual([]);
    for (const output of [
      undefined,
      null,
      {},
      { domains: ['unknown'] },
      { domains: 'finances' },
    ]) {
      expect(parseRouterOutput(output)).toBeUndefined();
    }
  });
});
