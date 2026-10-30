import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import defaultMatrix, { type BenchConfig } from './matrix';
import { scenarios } from './scenarios';

const fmt = (n: number, digits = 0) => n.toFixed(digits);

export async function runMatrix(file: string, args: string[]) {
  const configs = await loadMatrix(file);
  const forwarded = forwardArgs(args);
  const dir = '/tmp/opencode/bench';
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const reports: Array<{
    config: BenchConfig;
    data?: RunData;
    error?: string;
  }> = [];
  for (const config of configs) {
    const entry = await runConfig(config, forwarded);
    reports.push(entry);
    writeFileSync(
      `${dir}/${stamp}-${config.name.replace(/[^\w.-]/g, '_')}.json`,
      JSON.stringify(entry, null, 2),
    );
  }
  const lines = summaryLines(reports);
  appendScenarioMatrix(lines, configs, reports, args);
  appendFailures(lines, reports);
  const reportPath = `${dir}/report-${stamp}.md`;
  writeFileSync(reportPath, lines.join('\n'));
  console.log(reportPath);
}

type Report = { config: BenchConfig; data?: RunData; error?: string };
async function loadMatrix(file: string) {
  const loaded =
    resolve(file) === resolve(__dirname, 'matrix.ts')
      ? defaultMatrix
      : file.endsWith('.json')
        ? (JSON.parse(readFileSync(resolve(file), 'utf8')) as unknown)
        : ((await import(resolve(file))) as unknown);
  const configs = unwrapMatrix(loaded) as BenchConfig[];
  validateMatrix(configs);
  return configs;
}
function forwardArgs(args: string[]) {
  const flags = ['--matrix', '--model', '--effort'];
  return args.filter(
    (arg, i) =>
      !flags.includes(arg) &&
      !flags.includes(args[i - 1]) &&
      !flags.some((flag) => arg.startsWith(`${flag}=`)),
  );
}
async function runConfig(
  config: BenchConfig,
  forwarded: string[],
): Promise<Report> {
  const { code, output, stderr } = await spawnConfig(config, forwarded);
  const path = output.match(/\/tmp\/opencode\/bench\/[^\s]+\.json/g)?.at(-1);
  let data: RunData | undefined;
  if (path) data = JSON.parse(readFileSync(path, 'utf8')) as RunData;
  const entry = {
    config,
    data,
    ...(!data
      ? {
          error: `Process exit ${code}: ${stderr.slice(0, 1000) || output.slice(-500)}`,
        }
      : {}),
  };
  return entry;
}
async function spawnConfig(config: BenchConfig, forwarded: string[]) {
  let output = '';
  let stderr = '';
  const code = await new Promise<number | null>((done) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/bench-agent.ts',
        ...forwarded,
        '--model',
        config.model,
        ...effortArgs(config),
      ],
      {
        env: {
          ...process.env,
          ...configEnv(config),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on('error', (error) => {
      output += String(error);
      done(1);
    });
    child.on('close', done);
  });
  return { code, output, stderr };
}
function effortArgs(config: BenchConfig) {
  return config.effort ? ['--effort', config.effort] : [];
}
function configEnv(config: BenchConfig) {
  return {
    BENCH_DOMAIN_MODELS: JSON.stringify(config.domainModels ?? {}),
    BENCH_GUARD_MODEL: config.guardModel ?? '',
    BENCH_GUARD_EFFORT: config.guardEffort ?? '',
  };
}
function summaryLines(reports: Report[]) {
  const lines = [
    '# Norte benchmark',
    '',
    '| Config | Gate+DB pass | Judge | p50 ms | p95 ms | Steps/turn | Reasoning/turn | Errors/timeouts |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const { config, data, error } of reports) {
    lines.push(summaryRow(config, data, error));
  }
  return lines;
}
function appendScenarioMatrix(
  lines: string[],
  configs: BenchConfig[],
  reports: Report[],
  args: string[],
) {
  const option = (flag: string) =>
    args.find((arg) => arg.startsWith(`${flag}=`))?.slice(flag.length + 1) ??
    (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const only = option('--only')?.split(',');
  const tag = option('--tag');
  const ids = scenarios
    .filter(
      (s) => (!only || only.includes(s.id)) && (!tag || s.tags.includes(tag)),
    )
    .map((s) => s.id);
  lines.push(
    '',
    '## Scenario pass matrix',
    '',
    `| Scenario | ${configs.map((c) => c.name).join(' | ')} |`,
    `|---|${configs.map(() => '---').join('|')}|`,
  );
  for (const id of ids)
    lines.push(
      `| ${id} | ${reports
        .map((r) => {
          const runs = r.data?.results.filter((s) => s.id === id);
          return runs?.length
            ? `${runs.filter((s) => s.pass).length}/${runs.length}`
            : 'ERROR';
        })
        .join(' | ')} |`,
    );
}
function appendFailures(lines: string[], reports: Report[]) {
  lines.push('', '## Worst failures');
  for (const report of reports) {
    if (report.error)
      lines.push(`\n### ${report.config.name}\n${report.error}`);
    appendReportFailures(lines, report);
  }
}
function summaryRow(
  config: BenchConfig,
  data: RunData | undefined,
  error: string | undefined,
) {
  const t = data?.totals;
  const metrics = [
    ...scoreColumns(t),
    ...latencyColumns(t),
    ...usageColumns(t),
    error ?? errorColumn(t),
  ];
  return `| ${config.name} | ${metrics.join(' | ')} |`;
}
function latencyColumns(t: RunData['totals'] | undefined) {
  return [t ? fmt(t.p50Ms) : '-', t ? fmt(t.p95Ms) : '-'];
}
function usageColumns(t: RunData['totals'] | undefined) {
  return [
    t ? fmt(t.steps / t.turns, 1) : '-',
    t?.reasoningTokens == null ? 'unknown' : fmt(t.reasoningTokens / t.turns),
  ];
}
function unwrapMatrix(list: unknown): unknown {
  while (isDefaultWrapper(list)) list = list.default;
  return list;
}
function isDefaultWrapper(list: unknown): list is { default: unknown } {
  return (
    !!list &&
    !Array.isArray(list) &&
    typeof list === 'object' &&
    'default' in list
  );
}
function validateMatrix(configs: BenchConfig[]) {
  if (!Array.isArray(configs) || !configs.length || configs.some(invalidConfig))
    throw new Error('Matrix must be a nonempty config list');
}
function invalidConfig(config: BenchConfig) {
  return !config.name || !config.model;
}
function scoreColumns(t: RunData['totals'] | undefined) {
  if (!t) return [fmt(0, 2), '-'];
  return [
    fmt(t.passRate ?? 0, 2),
    t.judgeMean == null ? '-' : fmt(t.judgeMean, 2),
  ];
}
function errorColumn(t: RunData['totals'] | undefined) {
  if (!t) return '0/0';
  return `${t.errors ?? 0}/${t.timeouts ?? 0}`;
}

interface RunData {
  totals: {
    passRate: number;
    judgeMean: number;
    p50Ms: number;
    p95Ms: number;
    steps: number;
    turns: number;
    reasoningTokens: number | null;
    errors: number;
    timeouts: number;
  };
  results: Array<{
    id: string;
    pass: boolean;
    judgeReasons?: Record<string, { score: number; reason: string }>;
    judgeError?: string;
    turns: Array<{ input: string; text: string; error?: string }>;
  }>;
}

function appendReportFailures(lines: string[], report: Report) {
  for (const result of report.data?.results
    .filter((r) => failedResult(r))
    .slice(0, 8) ?? []) {
    lines.push(
      `\n### ${report.config.name}: ${result.id}\n${failureReason(result)}\n`,
      ...result.turns.map(
        (t) =>
          `> User: ${t.input.slice(0, 180)}\n> Assistant: ${(t.error ?? t.text).slice(0, 400)}`,
      ),
    );
  }
}
function failedResult(result: RunData['results'][number]) {
  return (
    !result.pass ||
    result.judgeError ||
    Object.values(result.judgeReasons ?? {}).some((c) => c.score === 0)
  );
}

function failureReason(result: RunData['results'][number]) {
  return result.judgeError ?? JSON.stringify(result.judgeReasons ?? {});
}
