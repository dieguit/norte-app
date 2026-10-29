import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'dotenv';
import { Pool } from 'pg';
import { transformSync } from '@swc/core';
import { Module, type Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RequestContext } from '@mastra/core/request-context';
import type { AgentExecutionOptions } from '@mastra/core/agent';
import { createScorer, runEvals } from '@mastra/core/evals';
import { createBenchJudge, type JudgeResult } from './bench/judge';
import { runMatrix } from './bench/report';
import { scenarios, turnGates } from './bench/scenarios';
import { cleanupBenchUser, snapshotUser } from './bench/database';
import { noWriteLoops } from './bench/checks';
import type { NorteServices } from '../src/mastra/services';
import type { createMastra as CreateMastra } from '../src/mastra';
import {
  roles,
  type DomainModels,
  type ReasoningEffort,
} from '../src/config/llm.config';

function parseEffort(value: string | undefined): ReasoningEffort | undefined {
  if (!value) return undefined;
  if (invalidEffort(value))
    throw new Error(`Invalid reasoning effort: ${value}`);
  return value as ReasoningEffort;
}
function parseConfig() {
  const { values } = parseCli();
  if (values.matrix) return { values, reps: 0, selected: [] };
  const reps = Number(values.reps);
  const selected = scenarios.filter(
    (s) =>
      (!values.only || values.only.split(',').includes(s.id)) &&
      (!values.tag || s.tags.includes(values.tag)),
  );
  if (
    invalidSelection(values.model, reps, selected) ||
    invalidFilters(values)
  ) {
    throw new Error(
      'Expected --model ALIAS [--effort low|medium|high|minimal|none] [--reps positive integer] [--only scenarioId] [--judge ALIAS] (aliases: src/config/llm.config.ts)',
    );
  }
  return { values, reps, selected };
}
async function bootNest() {
  const apiRoot = resolve(__dirname, '..');
  const localEnv = parse(readFileSync(resolve(apiRoot, '.env')));
  if (
    !localEnv.DATABASE_URL ||
    !['localhost', '127.0.0.1'].includes(
      new URL(localEnv.DATABASE_URL).hostname,
    )
  ) {
    throw new Error(
      'Benchmark requires localhost/127.0.0.1 DATABASE_URL from apps/api/.env',
    );
  }
  Object.assign(process.env, localEnv, { NODE_ENV: 'development' });
  delete process.env.CHAT_CHANNEL;
  delete process.env.POSTHOG_TOKEN;

  const require = metadataRequire(apiRoot);
  const names = [
    'expenses',
    'incomes',
    'finances',
    'home',
    'profile',
    'goals',
    'contributions',
    'notifications',
    'savings-places',
  ] as const;
  const pascal = (name: string) =>
    name.replace(/(^|-)(\w)/g, (_, _dash, char: string) => char.toUpperCase());
  const imports = names.map((name) => {
    const className = pascal(name);
    const exports = require(`../src/${name}/${name}.module.ts`) as Record<
      string,
      Type<unknown>
    >;
    return exports[`${className}Module`];
  });
  class BenchModule {}
  Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      ...imports,
    ],
  })(BenchModule);
  const app = await NestFactory.createApplicationContext(BenchModule, {
    logger: ['error', 'warn'],
  });
  const services = Object.fromEntries(
    names.map((name) => {
      const exports = require(`../src/${name}/${name}.service.ts`) as Record<
        string,
        Type<unknown>
      >;
      const className = pascal(name);
      return [
        className[0].toLowerCase() + className.slice(1),
        app.get(exports[`${className}Service`]),
      ];
    }),
  ) as NorteServices;
  const { createMastra } = require('../src/mastra/index.ts') as {
    createMastra: typeof CreateMastra;
  };
  return { apiRoot, localEnv, app, services, createMastra };
}
function parseDomainModels(values: ReturnType<typeof parseCli>['values']) {
  const domainModels: Record<string, string> = JSON.parse(
    process.env.BENCH_DOMAIN_MODELS ?? '{}',
  ) as Record<string, string>;
  for (const entry of values['domain-model'] ?? []) {
    const [domain, model] = parseDomainEntry(entry);
    domainModels[domain] = model;
  }
  return Object.fromEntries(
    Object.entries(domainModels).map(([domain, model]) => [domain, { model }]),
  ) as DomainModels;
}

function benchGuard(localEnv: Record<string, string>) {
  return {
    ...roles.guard,
    model:
      process.env.BENCH_GUARD_MODEL ||
      localEnv.LLM_GUARD_MODEL ||
      roles.guard.model,
    effort: parseEffort(process.env.BENCH_GUARD_EFFORT) ?? roles.guard.effort,
  };
}
async function boot(values: ReturnType<typeof parseCli>['values']) {
  const { apiRoot, localEnv, app, services, createMastra } = await bootNest();
  const scoring = createBenchScorers(values, localEnv);
  const { dbScorer, judge } = scoring;
  const domainModels = parseDomainModels(values);
  const mastra = createMastra(
    {
      DATABASE_URL: localEnv.DATABASE_URL,
      MASTRA_API_KEY: localEnv.MASTRA_API_KEY,
      LLM_BASE_URL: localEnv.LLM_BASE_URL,
      LLM_API_KEY: localEnv.LLM_API_KEY,
      OPENAI_API_KEY: localEnv.OPENAI_API_KEY,
      GROQ_API_KEY: localEnv.GROQ_API_KEY,
      LLM_MODEL: values.model!,
      LLM_GUARD_MODEL:
        process.env.BENCH_GUARD_MODEL || localEnv.LLM_GUARD_MODEL,
    },
    {
      services,
      scorers: { dbScorer, judge },
      webAppUrl: localEnv.WEB_APP_URL,
      domainModels,
      guard: benchGuard(localEnv),
      main: { model: values.model!, effort: parseEffort(values.effort) },
    },
  );
  const agent = mastra.getAgent('norteAgent');
  const pool = new Pool({ connectionString: localEnv.DATABASE_URL });
  return {
    apiRoot,
    localEnv,
    app,
    services,
    mastra,
    agent,
    pool,
    domainModels,
    ...scoring,
  };
}
type Results = Array<
  Record<string, unknown> & {
    id: string;
    rep: number;
    evaluation: Awaited<ReturnType<typeof runEvals>>;
    turns: Array<{
      wallMs: number;
      steps: unknown[];
      tools: string[];
      text: string;
      input: string;
      domains?: unknown;
      error?: string;
      repeatedCalls?: number;
      dbAfter?: string;
      usage?: {
        inputTokens?: number;
        outputTokens?: number;
        reasoningTokens?: number;
      };
    }>;
    pass: boolean;
  }
>;
type Config = ReturnType<typeof parseConfig>;
type Context = Awaited<ReturnType<typeof boot>>;
type Scenario = (typeof scenarios)[number];
function turnText(turn: Scenario['turns'][number]) {
  return typeof turn === 'string'
    ? turn
    : [turn.text, `[adjunto: ${turn.file}]`].filter(Boolean).join('\n');
}
function turnMessage<T>(turn: Scenario['turns'][number] | undefined, input: T) {
  if (typeof turn !== 'object') return input;
  const data = readFileSync(resolve(__dirname, 'bench/fixtures', turn.file));
  return [
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: turn.text ?? '' },
        { type: 'file' as const, data, mediaType: turn.mediaType },
      ],
    },
  ];
}
function instrumentAgent(
  agent: Context['agent'],
  generate: Context['agent']['generate'],
  scenario: Scenario,
  turns: Results[number]['turns'],
  requestContext: RequestContext,
  snapshot: () => Promise<unknown>,
) {
  agent.generate = (async (
    input: Parameters<typeof agent.generate>[0],
    options: AgentExecutionOptions<unknown>,
  ) => {
    const steps: unknown[] = [];
    const tools: string[] = [];
    const callKeys: string[] = [];
    const start = performance.now();
    let previousStep = start;
    try {
      const signal = AbortSignal.timeout(120_000);
      const message = turnMessage(scenario.turns[turns.length], input);
      let response = await generate(message, {
        ...options,
        abortSignal: signal,
        onStepFinish: (step) => {
          previousStep = recordStep(step, steps, tools, callKeys, previousStep);
        },
      });
      if (signal.aborted) throw new Error('Turn timeout after 120000 ms');
      response = normalizeResponse(response, scenario, tools);
      turns.push({
        input: turnText(scenario.turns[turns.length]),
        wallMs: performance.now() - start,
        steps,
        tools,
        usage: response.totalUsage,
        domains: requestContext.get('norteDomains'),
        text: response.text,
        // Identical tool call repeated in one turn = a loop (e.g. duplicate writes).
        repeatedCalls: callKeys.filter((k, i) => callKeys.indexOf(k) !== i)
          .length,
        // Gates are scored after all turns, so capture per-turn DB state here.
        dbAfter: JSON.stringify(await snapshot()),
      });
      return response;
    } catch (error) {
      return recordTurnError(
        error,
        scenario,
        turns,
        input,
        start,
        steps,
        tools,
      );
    }
  }) as typeof agent.generate;
}
function recordStep(
  step: Parameters<
    NonNullable<AgentExecutionOptions<unknown>['onStepFinish']>
  >[0],
  steps: unknown[],
  tools: string[],
  callKeys: string[],
  previousStep: number,
) {
  const now = performance.now();
  const calls = step.toolCalls?.map((call) => call.payload.toolName) ?? [];
  tools.push(...calls);
  callKeys.push(
    ...(step.toolCalls?.map((call) =>
      JSON.stringify([call.payload.toolName, call.payload.args]),
    ) ?? []),
  );
  steps.push({
    ms: now - previousStep,
    tools: calls,
    parallelism: calls.length,
    usage: step.usage,
    calls: step.toolCalls?.map((call) => ({
      name: call.payload.toolName,
      args: call.payload.args,
    })),
    results: step.toolResults?.map((result) =>
      JSON.stringify(result).slice(0, 12000),
    ),
  });
  return now;
}
function createEvalTurns(
  scenario: Scenario,
  turns: Results[number]['turns'],
  before: string,
  dbScorer: Context['dbScorer'],
) {
  const evalTurns = scenario.turns.map((input, index) => ({
    input: turnText(input),
    gates: [
      ...turnGates(scenario.id, index),
      ...domainGates(scenario, turns),
      ...(needsPreviewGate(scenario, index)
        ? [
            createScorer({
              id: 'bench-preview-no-write',
              description: 'Preview does not persist changes',
              type: 'agent',
            }).generateScore(() => Number(before === turns[index]?.dbAfter)),
          ]
        : []),
      createScorer({
        id: 'bench-no-write-loops',
        description: 'No duplicate calls or repeated writes',
        type: 'agent',
      }).generateScore(() => Number(noWriteLoops(turns.slice(0, index + 1)))),
      ...(index === scenario.turns.length - 1 ? [dbScorer] : []),
    ],
  }));
  return evalTurns;
}
async function runScenario(
  context: Context,
  values: ReturnType<typeof parseCli>['values'],
  scenario: Scenario,
  userId: string,
  rep: number,
  results: Results,
) {
  const { agent, pool, mastra, dbScorer, judge } = context;
  const turns: Results[number]['turns'] = [];
  context.setJudgeContext({
    expectation: scenario.expectation,
    transcript: turns,
  });
  const snapshot = () => snapshotUser(pool, userId);
  const before = JSON.stringify(await snapshot());
  const requestContext = new RequestContext();
  requestContext.set('userId', userId);
  requestContext.set('benchConfig', {
    model: values.model,
    effort: values.effort ?? 'default',
    scenario: scenario.id,
    rep,
  });
  const generate = agent.generate.bind(agent) as typeof agent.generate;
  instrumentAgent(agent, generate, scenario, turns, requestContext, snapshot);
  context.setCheckDb(async () => {
    return scenario.check(
      pool,
      userId,
      JSON.parse(before) as Awaited<ReturnType<typeof snapshotUser>>,
    );
  });
  const evalTurns = createEvalTurns(scenario, turns, before, dbScorer);
  registerGates(mastra, evalTurns);
  try {
    const evaluation = await runEvals({
      target: agent,
      data: [{ turns: evalTurns, requestContext }],
      targetOptions: { memory: { resource: userId } },
      scorers: [{ scorer: judge, threshold: 1 }],
    });
    results.push({
      id: scenario.id,
      rep,
      userId,
      turns,
      evaluation,
      ...context.judgeResult(),
      pass: scenarioPassed(scenario, turns, evaluation),
    });
  } catch (error) {
    results.push({
      id: scenario.id,
      rep,
      userId,
      turns,
      pass: false,
      error: String(error),
      evaluation: {
        scores: {},
        summary: { totalItems: 1 },
        verdict: 'failed',
      },
    });
  } finally {
    agent.generate = generate;
  }
}
async function cleanupUser(
  agent: Context['agent'],
  pool: Pool,
  userId: string,
) {
  try {
    const memory = await agent.getMemory();
    if (memory) {
      await cleanupThreads(memory, userId);
    }
  } finally {
    await cleanupBenchUser(pool, userId);
  }
}
async function runScenarios(
  context: Context,
  config: Config,
  results: Results,
) {
  const { apiRoot, services, agent, pool, mastra, app } = context;
  const { values, reps, selected } = config;
  let quotaHit = false;
  try {
    for (let rep = 0; rep < reps && !quotaHit; rep++) {
      const userId = `bench_${randomUUID()}`;
      try {
        execFileSync(
          process.execPath,
          ['--import', 'tsx', 'scripts/seed-demo.ts'],
          {
            cwd: apiRoot,
            env: { ...process.env, DEMO_USER_ID: userId },
            stdio: 'inherit',
          },
        );
        // Start away from the requested time, so the notification check cannot pass on defaults.
        await services.notifications.updateSetting(
          userId,
          'day_close_checkin',
          {
            time: '20:00',
          },
        );
        quotaHit = await runRepetition(
          context,
          values,
          selected,
          userId,
          rep,
          results,
        );
      } finally {
        await cleanupUser(agent, pool, userId);
      }
    }
  } finally {
    await mastra.observability.flush();
    await mastra.shutdown();
    await app.close();
    await pool.end();
  }
}
function writeResults(
  context: Context,
  values: ReturnType<typeof parseCli>['values'],
  results: Results,
  startedAt: string,
) {
  const { judge, dbScorer, localEnv, domainModels } = context;
  const totals = summarize(results, judge.id);
  console.table(
    results.map((r) => ({
      scenario: r.id,
      rep: r.rep + 1,
      turns: r.turns.length,
      seconds: +(r.turns.reduce((n, t) => n + t.wallMs, 0) / 1000).toFixed(2),
      steps: r.turns.reduce((n, t) => n + t.steps.length, 0),
      tools: r.turns.flatMap((t) => t.tools).join(', '),
      verdict: r.evaluation.verdict,
      gates: r.evaluation.turnResults?.every((t) =>
        t.gateResults?.every((g) => g.passed),
      ),
      db: dbScore(r.evaluation, dbScorer.id),
      judge: Number(r.evaluation.scores[judge.id]),
    })),
  );
  console.log(totals);
  const dir = '/tmp/opencode/bench';
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/${startedAt.replaceAll(':', '-')}-${values.model!.replace(/[^a-zA-Z0-9._-]/g, '_')}-${values.effort ?? 'default'}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      {
        startedAt,
        model: values.model,
        effort: values.effort ?? null,
        judgeModel: values.judge,
        ...guardConfig(localEnv),
        domainModels,
        totals,
        results,
      },
      null,
      2,
    ),
  );
  console.log(file);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}
async function main() {
  const config = parseConfig();
  if (config.values.matrix)
    return runMatrix(config.values.matrix, process.argv.slice(2));
  const context = await boot(config.values);
  const results: Results = [];
  const startedAt = new Date().toISOString();
  await runScenarios(context, config, results);
  writeResults(context, config.values, results, startedAt);
}

function invalidSelection(
  model: string | undefined,
  reps: number,
  selected: Scenario[],
) {
  return !model || !Number.isInteger(reps) || reps < 1 || !selected.length;
}
function invalidFilters(values: ReturnType<typeof parseCli>['values']) {
  return invalidEffort(values.effort) || unknownScenarios(values.only);
}
function invalidEffort(effort: string | undefined) {
  return (
    effort && !['low', 'medium', 'high', 'minimal', 'none'].includes(effort)
  );
}
function unknownScenarios(only: string | undefined) {
  return (
    only && only.split(',').some((id) => !scenarios.some((s) => s.id === id))
  );
}
function parseDomainEntry(entry: string) {
  const [domain, ...model] = entry.split('=');
  if (
    !['finances', 'goals', 'notifications', 'advice'].includes(domain) ||
    !model.join('=')
  )
    throw new Error(`Invalid domain model: ${entry}`);
  return [domain, model.join('=')] as const;
}
function normalizeResponse<
  T extends Awaited<ReturnType<Context['agent']['generate']>>,
>(response: T, scenario: Scenario, tools: string[]) {
  if (blockedResponse(scenario, response, tools))
    response = {
      ...response,
      text: 'Solicitud bloqueada por seguridad (tripwire).',
    };
  if (response.finishReason === 'error')
    throw new Error('Model returned finishReason=error');
  return response;
}
function blockedResponse(
  scenario: Scenario,
  response: Awaited<ReturnType<Context['agent']['generate']>>,
  tools: string[],
) {
  return scenario.id === 'injection' && response.tripwire && !tools.length;
}
function blockedError(scenario: Scenario, error: unknown, tools: string[]) {
  return (
    scenario.id === 'injection' &&
    /tripwire|blocked|input.*reject/i.test(String(error)) &&
    tools.length === 0
  );
}
function recordTurnError(
  error: unknown,
  scenario: Scenario,
  turns: Results[number]['turns'],
  input: Parameters<Context['agent']['generate']>[0],
  start: number,
  steps: unknown[],
  tools: string[],
) {
  if (blockedError(scenario, error, tools)) {
    turns.push({
      input: turnText(scenario.turns[turns.length]),
      wallMs: performance.now() - start,
      steps,
      tools,
      text: 'Solicitud bloqueada por seguridad.',
    });
    return {
      text: 'Solicitud bloqueada por seguridad.',
      response: { messages: [] },
      totalUsage: {},
    } as unknown as Awaited<ReturnType<Context['agent']['generate']>>;
  }
  turns.push({
    input: turnText(scenario.turns[turns.length]),
    wallMs: performance.now() - start,
    steps,
    tools,
    text: '',
    error: String(error),
  });
  throw error;
}
function domainGates(scenario: Scenario, turns: Results[number]['turns']) {
  return scenario.id === 'two-domain'
    ? [
        createScorer({
          id: 'bench-both-domains',
          description: 'Also consult goals',
          type: 'agent',
        }).generateScore(() =>
          Number(
            turns
              .flatMap((t) => t.tools)
              .some((tool) => ['getRoadmap', 'listGoals'].includes(tool)),
          ),
        ),
      ]
    : [];
}
function gatesPassed(evaluation: Results[number]['evaluation']) {
  return evaluation.turnResults?.every((turn) =>
    turn.gateResults?.every((gate) => gate.passed),
  );
}
function scenarioPassed(
  scenario: Scenario,
  turns: Results[number]['turns'],
  evaluation: Results[number]['evaluation'],
) {
  return (
    turns.length === scenario.turns.length &&
    !turns.some((turn) => turn.error) &&
    evaluationPassed(scenario, evaluation)
  );
}
function evaluationPassed(
  scenario: Scenario,
  evaluation: Results[number]['evaluation'],
) {
  return (
    evaluation.turnResults?.length === scenario.turns.length &&
    gatesPassed(evaluation) === true
  );
}
async function cleanupThreads(
  memory: NonNullable<Awaited<ReturnType<Context['agent']['getMemory']>>>,
  userId: string,
) {
  while (true) {
    const page = await memory.listThreads({
      filter: { resourceId: userId },
      perPage: 100,
    });
    for (const thread of page.threads) await memory.deleteThread(thread.id);
    if (!page.threads.length) break;
  }
}
function quotaReached(last: Results[number] | undefined) {
  return /429|rate.?limit|cooling down|exhausted|quota/i.test(
    [last?.error, ...(last?.turns.map((t) => t.error) ?? [])].join(' '),
  );
}
function summarize(results: Results, judgeId: string) {
  const turns = results.flatMap((r) => r.turns);
  const latencies = turns.map((t) => t.wallMs).sort((a, b) => a - b);
  const percentile = (p: number) =>
    latencies[Math.max(0, Math.ceil(latencies.length * p) - 1)];
  const totals = {
    inputTokens: turns.reduce((n, t) => n + (t.usage?.inputTokens ?? 0), 0),
    outputTokens: turns.reduce((n, t) => n + (t.usage?.outputTokens ?? 0), 0),
    reasoningTokens: turns.some((t) => t.usage?.reasoningTokens !== undefined)
      ? turns.reduce((n, t) => n + (t.usage?.reasoningTokens ?? 0), 0)
      : null,
    turns: turns.length,
    steps: turns.reduce((n, t) => n + t.steps.length, 0),
    tools: turns.reduce((n, t) => n + t.tools.length, 0),
    wallMs: turns.reduce((n, t) => n + t.wallMs, 0),
    passRate: results.filter((r) => r.pass).length / results.length,
    judgeMean:
      results.reduce(
        (n, r) => n + Number(r.evaluation.scores[judgeId] ?? 0),
        0,
      ) / results.length,
    passed: results.filter((r) => r.pass).length,
    scenarios: results.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    errors: results.filter(
      (r) => r.error || r.judgeError || r.turns.some((t) => t.error),
    ).length,
    timeouts: turns.filter((t) =>
      /timeout|timed out|abort/i.test(t.error ?? ''),
    ).length,
  };
  return totals;
}
function dbScore(evaluation: Results[number]['evaluation'], scorerId: string) {
  return evaluation.turnResults
    ?.flatMap((t) => t.gateResults ?? [])
    .find((g) => g.id === scorerId)?.score;
}

function parseCli() {
  return parseArgs({
    options: {
      model: { type: 'string' },
      effort: { type: 'string' },
      reps: { type: 'string', default: '1' },
      only: { type: 'string' },
      judge: { type: 'string', default: roles.judge.model },
      matrix: { type: 'string' },
      tag: { type: 'string' },
      'domain-model': { type: 'string', multiple: true },
    },
  });
}
function needsPreviewGate(scenario: Scenario, index: number) {
  return index === 0 && scenario.tools?.[1] === 'confirmPendingAction';
}
function registerGates(
  mastra: Context['mastra'],
  turns: ReturnType<typeof createEvalTurns>,
) {
  for (const turn of turns)
    for (const gate of turn.gates) mastra.addScorer(gate);
}
async function runRepetition(
  context: Context,
  values: ReturnType<typeof parseCli>['values'],
  selected: Scenario[],
  userId: string,
  rep: number,
  results: Results,
) {
  for (const scenario of selected) {
    await runScenario(context, values, scenario, userId, rep, results);
    // The router shares model quotas with production; stop at the first rate limit instead of draining it.
    if (quotaReached(results.at(-1))) {
      console.error('Rate limit/quota hit; stopping this config.');
      return true;
    }
  }
  return false;
}
function guardConfig(localEnv: Record<string, string>) {
  return {
    guardModel: process.env.BENCH_GUARD_MODEL || localEnv.LLM_GUARD_MODEL,
    guardEffort: process.env.BENCH_GUARD_EFFORT ?? 'none',
  };
}

function metadataRequire(apiRoot: string) {
  // tsx omits decorator metadata required by Nest constructor injection.
  const require = createRequire(__filename);
  const previous = require.extensions['.ts'];
  require.extensions['.ts'] = (module, filename) => {
    if (!filename.startsWith(resolve(apiRoot, 'src') + '/')) {
      previous!(module, filename);
      return;
    }
    const { code } = transformSync(readFileSync(filename, 'utf8'), {
      filename,
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
      module: { type: 'commonjs' },
    });
    (
      module as NodeModule & { _compile(code: string, filename: string): void }
    )._compile(code, filename);
  };
  return require;
}
function createBenchScorers(
  values: ReturnType<typeof parseCli>['values'],
  localEnv: Record<string, string>,
) {
  let checkDb: () => Promise<boolean> = () => Promise.resolve(false);
  const dbScorer = createScorer({
    id: 'bench-db-state',
    description: 'Estado persistido correcto para el escenario',
    type: 'agent',
  }).generateScore(async () => Number(await checkDb()));
  let judgeContext: { expectation: string; transcript: unknown } = {
    expectation: '',
    transcript: [],
  };
  let judgeReasons: JudgeResult | undefined;
  let judgeError: string | undefined;
  const judge = createBenchJudge({
    ref: { ...roles.judge, model: values.judge },
    env: localEnv,
    context: () => judgeContext,
    save: (result) => {
      judgeReasons = result;
    },
    onError: (error) => {
      judgeError = error;
    },
  });
  return {
    dbScorer,
    judge,
    setCheckDb: (check: typeof checkDb) => {
      checkDb = check;
    },
    setJudgeContext: (context: typeof judgeContext) => {
      judgeContext = context;
      judgeReasons = undefined;
      judgeError = undefined;
    },
    judgeResult: () => ({ judgeReasons, judgeError }),
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
