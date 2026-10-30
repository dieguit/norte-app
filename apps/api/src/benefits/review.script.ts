import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { parseArgs } from 'node:util';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import { BenefitCategorySchema, BenefitRulesSchema } from '@repo/shared-types';
import { schema } from '../database/schema';
import {
  PROTECTABLE_FIELDS,
  type ReviewCommand,
  type WriteContext,
} from './benefits.types';
import { CATALOG } from './catalog';
import { effectivePolicies, manualContentHash, revisionDiff } from './cli';
import {
  getBenefit,
  listBenefits,
  loadSourcePolicies,
  reviewBenefit,
  setSourcePolicy,
} from './store';

const fields = {
  category: BenefitCategorySchema,
  title: z.string().min(1),
  merchant: z.string().nullable(),
  rules: BenefitRulesSchema,
};
const protectedFields = z.array(z.enum(PROTECTABLE_FIELDS)).default([]);
const evidence = z
  .object({
    sourceUrl: z.string(),
    detailUrl: z.string().nullable(),
    termsUrl: z.string().nullable(),
    quotes: z.array(z.object({ field: z.string(), quote: z.string() })),
    fetchedContentHash: z.string(),
  })
  .strict();
const addSchema = z
  .object({
    ...fields,
    publisherProviderSlug: z
      .string()
      .refine(
        (slug) => CATALOG.some((p) => p.slug === slug),
        'Unknown publisher',
      ),
    evidence: evidence.optional(),
    upstreamId: z.string().min(1).optional(),
    protectedFields,
  })
  .strict();
const editSchema = z
  .object(fields)
  .partial()
  .extend({ protectedFields })
  .strict();

type Database = Parameters<typeof listBenefits>[0];
type CommandInput = {
  db: Database;
  ctx: WriteContext;
  id: string;
  extra: string;
  values: { status?: string; source?: string; reason?: string };
};

async function listCommand({ db, values }: CommandInput) {
  const rows = await listBenefits(db, {
    lifecycle: values.status,
    sourceId: values.source,
  });
  console.table(
    await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        lifecycle: row.lifecycle,
        publisher: row.publisherProviderSlug,
        category: row.category,
        title: row.snapshot.title,
        pendingRevision: !!(await getBenefit(db, row.id))?.pendingRevision,
      })),
    ),
  );
}

async function showCommand({ db, id }: CommandInput) {
  const row = await getBenefit(db, id);
  if (!row) throw new Error(`Benefit not found: ${id}`);
  console.log(
    JSON.stringify(
      { ...row, changedFields: revisionDiff(row, row.pendingRevision) },
      null,
      2,
    ),
  );
}

async function policiesCommand({ db }: CommandInput) {
  const overrides = await loadSourcePolicies(db);
  console.table(effectivePolicies(CATALOG, overrides));
}

async function sourceCommand({ db, id, extra, ctx }: CommandInput) {
  if (!CATALOG.some((p) => p.sources.some((s) => s.id === id)))
    throw new Error(`Unknown source ${id}`);
  const actions = {
    enable: { enabled: true },
    disable: { enabled: false },
    'auto-publish-on': { autoPublish: true },
    'auto-publish-off': { autoPublish: false },
  };
  const patch = actions[extra as keyof typeof actions];
  if (!patch) throw new Error(`Unknown source action ${extra}`);
  await setSourcePolicy(db, id, patch, ctx);
  console.log('Source policy updated');
}

async function addCommand({ db, ctx, id }: CommandInput) {
  let command: ReviewCommand;
  const input = addSchema.parse(JSON.parse(await readFile(id, 'utf8')));
  const {
    title,
    merchant,
    category,
    rules,
    publisherProviderSlug,
    upstreamId,
  } = input;
  const key =
    upstreamId ??
    `${publisherProviderSlug}-${title}`
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  command = {
    kind: 'add',
    protectedFields: input.protectedFields,
    candidate: {
      publisherProviderSlug,
      category,
      upstreamId: upstreamId ?? null,
      identityKey: `manual:${key}`,
      contentHash: manualContentHash({ title, merchant, category, rules }),
      snapshot: {
        title,
        merchant,
        rules,
        evidence: input.evidence ?? {
          sourceUrl: '',
          detailUrl: null,
          termsUrl: null,
          quotes: [],
          fetchedContentHash: '',
        },
      },
    },
  };
  await printReview(db, command, ctx);
}

async function editCommand({ db, ctx, id, extra }: CommandInput) {
  const { protectedFields, ...patch } = editSchema.parse(
    JSON.parse(await readFile(extra, 'utf8')),
  );
  await printReview(
    db,
    { kind: 'edit', benefitId: id, patch, protectedFields },
    ctx,
  );
}

async function rejectCommand({ db, ctx, id, values }: CommandInput) {
  if (!values.reason?.trim()) throw new Error('reject requires --reason');
  await printReview(
    db,
    { kind: 'reject', benefitId: id, reason: values.reason },
    ctx,
  );
}

async function approveCommand({ db, ctx, id, values }: CommandInput) {
  await printReview(
    db,
    { kind: 'approve', benefitId: id, reason: values.reason },
    ctx,
  );
}

async function reverifyCommand({ db, ctx, id }: CommandInput) {
  await printReview(db, { kind: 'reverify', benefitId: id }, ctx);
}

async function printReview(
  db: Database,
  command: ReviewCommand,
  ctx: WriteContext,
) {
  console.log(JSON.stringify(await reviewBenefit(db, command, ctx), null, 2));
}

const handlers: Record<string, (input: CommandInput) => Promise<void>> = {
  list: listCommand,
  show: showCommand,
  policies: policiesCommand,
  source: sourceCommand,
  add: addCommand,
  edit: editCommand,
  reject: rejectCommand,
  approve: approveCommand,
  reverify: reverifyCommand,
};

function parseReviewArgs() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      status: { type: 'string' },
      source: { type: 'string' },
      reason: { type: 'string' },
    },
  });
  const [cmd, id, extra] = positionals;
  const arity: Record<string, number> = {
    list: 1,
    policies: 1,
    show: 2,
    approve: 2,
    reject: 2,
    reverify: 2,
    add: 2,
    edit: 3,
    source: 3,
  };
  if (!cmd || !arity[cmd] || positionals.length !== arity[cmd])
    throw new Error(
      'Usage: benefits:review list|policies|show <id>|approve <id>|reject <id> --reason <text>|reverify <id>|add <file>|edit <id> <file>|source <id> <action>',
    );
  return { cmd, id, extra, values };
}

async function main() {
  const { cmd, id, extra, values } = parseReviewArgs();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const ctx = {
    now: new Date(),
    actor: process.env.BENEFITS_ACTOR || userInfo().username,
  };
  try {
    await handlers[cmd]({ db, ctx, id, extra, values });
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
