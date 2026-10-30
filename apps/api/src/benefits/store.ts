import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  BenefitRulesSchema,
  type BenefitCategory,
  type BenefitRules,
} from '@repo/shared-types';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../database/database.types';
import {
  benefits,
  benefitRevisions,
  benefitSourcePolicies,
  benefitSourceRuns,
  benefitSources,
} from './benefits.schema';
import type { Source } from './catalog';
import {
  PROTECTABLE_FIELDS,
  type BenefitSnapshot,
  type CandidateBenefit,
  type CommitSummary,
  type ReviewCommand,
  type ReviewResult,
  type SourcePolicy,
  type SourceResult,
  type StoredBenefit,
  type WriteContext,
} from './benefits.types';

export function decideLifecycle(autoPublish: boolean, rules: BenefitRules) {
  return autoPublish && rules.eligibilityCompleteness === 'complete'
    ? ('published' as const)
    : ('needs_review' as const);
}

export function mergeProtectedFields(
  stored: {
    snapshot: BenefitSnapshot;
    category: BenefitCategory;
    protectedFields: string[];
  },
  candidate: CandidateBenefit,
) {
  const snapshot = { ...candidate.snapshot };
  let category = candidate.category;
  const conflicts: string[] = [];
  for (const field of PROTECTABLE_FIELDS) {
    if (!stored.protectedFields.includes(field)) continue;
    const previous =
      field === 'category' ? stored.category : stored.snapshot[field];
    const next = field === 'category' ? category : snapshot[field];
    if (!isDeepStrictEqual(previous, next)) conflicts.push(field);
    if (field === 'category') category = stored.category;
    else Object.assign(snapshot, { [field]: previous });
  }
  return { snapshot, category, conflicts };
}

function validate(snapshot: BenefitSnapshot): BenefitSnapshot {
  return { ...snapshot, rules: BenefitRulesSchema.parse(snapshot.rules) };
}

function hash(snapshot: BenefitSnapshot, category: BenefitCategory): string {
  const stable = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, item]) => [key, stable(item)]),
          )
        : value;
  return createHash('sha256')
    .update(
      JSON.stringify(
        stable({
          title: snapshot.title,
          merchant: snapshot.merchant,
          category,
          rules: snapshot.rules,
        }),
      ),
    )
    .digest('hex');
}

export async function loadSourcePolicies(
  db: Database,
): Promise<Map<string, SourcePolicy>> {
  return new Map(
    (await db.select().from(benefitSourcePolicies)).map((row) => [
      row.sourceId,
      {
        ...(row.enabled === null ? {} : { enabled: row.enabled }),
        ...(row.autoPublish === null ? {} : { autoPublish: row.autoPublish }),
      },
    ]),
  );
}

export async function setSourcePolicy(
  db: Database,
  sourceId: string,
  patch: SourcePolicy,
  ctx: WriteContext,
): Promise<void> {
  await db
    .insert(benefitSourcePolicies)
    .values({ sourceId, ...patch, updatedBy: ctx.actor, updatedAt: ctx.now })
    .onConflictDoUpdate({
      target: benefitSourcePolicies.sourceId,
      set: { ...patch, updatedBy: ctx.actor, updatedAt: ctx.now },
    });
}

async function insertSourceRun(
  tx: Transaction,
  result: SourceResult,
  source: Source,
) {
  const [run] = await tx
    .insert(benefitSourceRuns)
    .values({
      sourceId: source.id,
      provenance: result.provenance,
      llm: result.llm,
      outcome: result.outcome,
      complete: result.complete,
      coverage: source.coverage,
      httpStatus: result.http?.status,
      mime: result.http?.mime,
      bytes: result.http?.bytes,
      counts: {
        detected: result.candidates.length + result.rejected.length,
        valid: result.candidates.length,
        rejected: result.rejected.length,
      },
      diagnostics: result.diagnostics,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    })
    .returning();

  return run;
}

async function insertHarvestBenefit(
  tx: Transaction,
  candidate: CandidateBenefit,
  snapshot: BenefitSnapshot,
  autoPublish: boolean,
  ctx: WriteContext,
  summary: CommitSummary,
) {
  const lifecycle = decideLifecycle(autoPublish, snapshot.rules);
  const [inserted] = await tx
    .insert(benefits)
    .values({
      publisherProviderSlug: candidate.publisherProviderSlug,
      identityKey: candidate.identityKey,
      origin: 'harvest',
      lifecycle,
      snapshot,
      category: candidate.category,
      contentHash: candidate.contentHash,
      firstSeenAt: ctx.now,
      lastSeenAt: ctx.now,
      lastVerifiedAt: ctx.now,
    })
    .returning();
  const benefitId = inserted.id;
  // staged = waiting for review, whether a new row or a revision of a published one.
  if (lifecycle === 'published') summary.published++;
  else summary.staged++;

  return benefitId;
}

async function stageHarvestRevision(
  tx: Transaction,
  stored: typeof benefits.$inferSelect,
  candidate: CandidateBenefit,
  snapshot: BenefitSnapshot,
  conflicts: string[],
  ctx: WriteContext,
) {
  await tx
    .update(benefitRevisions)
    .set({
      status: 'superseded',
      decidedAt: ctx.now,
      decidedBy: ctx.actor,
    })
    .where(
      and(
        eq(benefitRevisions.benefitId, stored.id),
        eq(benefitRevisions.status, 'pending'),
      ),
    );
  await tx.insert(benefitRevisions).values({
    benefitId: stored.id,
    baseVersion: stored.version,
    snapshot,
    category: candidate.category,
    contentHash: candidate.contentHash,
    status: 'pending',
    actor: ctx.actor,
    createdAt: ctx.now,
    reason: conflicts.length
      ? `conflicts with protected field ${conflicts.join(', ')}`
      : null,
  });
}

async function updateHarvestBenefit(
  tx: Transaction,
  stored: typeof benefits.$inferSelect,
  candidate: CandidateBenefit,
  merged: ReturnType<typeof mergeProtectedFields>,
  autoPublish: boolean,
  ctx: WriteContext,
  summary: CommitSummary,
) {
  const lifecycle = decideLifecycle(autoPublish, merged.snapshot.rules);
  await tx
    .update(benefits)
    .set({
      snapshot: validate(merged.snapshot),
      category: merged.category,
      contentHash: candidate.contentHash,
      lifecycle,
      version: stored.version + 1,
      lastSeenAt: ctx.now,
      lastVerifiedAt: ctx.now,
    })
    .where(eq(benefits.id, stored.id));
  summary.updated++;
  if (lifecycle === 'published') summary.published++;
}

async function touchSourceLink(
  tx: Transaction,
  benefitId: string,
  source: Source,
  candidate: CandidateBenefit,
  runId: string,
  ctx: WriteContext,
) {
  await tx
    .insert(benefitSources)
    .values({
      benefitId,
      sourceId: source.id,
      upstreamId: candidate.upstreamId,
      lastSeenAt: ctx.now,
      lastSeenRunId: runId,
      firstMissingRunId: null,
    })
    .onConflictDoUpdate({
      target: [benefitSources.benefitId, benefitSources.sourceId],
      set: {
        lastSeenAt: ctx.now,
        lastSeenRunId: runId,
        firstMissingRunId: null,
        upstreamId: candidate.upstreamId,
      },
    });
}

async function commitCandidate(
  tx: Transaction,
  candidate: CandidateBenefit,
  autoPublish: boolean,
  ctx: WriteContext,
  summary: CommitSummary,
) {
  const snapshot = validate(candidate.snapshot);
  const [stored] = await tx
    .select()
    .from(benefits)
    .where(
      and(
        eq(benefits.publisherProviderSlug, candidate.publisherProviderSlug),
        eq(benefits.identityKey, candidate.identityKey),
      ),
    )
    .for('update');
  let benefitId: string;
  if (!stored) {
    benefitId = await insertHarvestBenefit(
      tx,
      candidate,
      snapshot,
      autoPublish,
      ctx,
      summary,
    );
  } else {
    benefitId = stored.id;
    if (stored.contentHash === candidate.contentHash) {
      await tx
        .update(benefits)
        .set({ lastSeenAt: ctx.now, lastVerifiedAt: ctx.now })
        .where(eq(benefits.id, benefitId));
      await supersedeReconfirmedRevision(tx, benefitId, ctx);
      summary.unchanged++;
    } else {
      const merged = mergeProtectedFields(stored, candidate);
      if (stored.lifecycle === 'published' || merged.conflicts.length) {
        await stageHarvestRevision(
          tx,
          stored,
          candidate,
          snapshot,
          merged.conflicts,
          ctx,
        );
        summary.staged++;
      } else {
        await updateHarvestBenefit(
          tx,
          stored,
          candidate,
          merged,
          autoPublish,
          ctx,
          summary,
        );
      }
    }
  }

  return benefitId;
}

async function supersedeReconfirmedRevision(
  tx: Transaction,
  benefitId: string,
  ctx: WriteContext,
) {
  await tx
    .update(benefitRevisions)
    .set({ status: 'superseded', decidedAt: ctx.now, decidedBy: ctx.actor })
    .where(
      and(
        eq(benefitRevisions.benefitId, benefitId),
        eq(benefitRevisions.status, 'pending'),
      ),
    );
}

async function recordAbsence(
  tx: Transaction,
  link: typeof benefitSources.$inferSelect,
  source: Source,
  runId: string,
  result: SourceResult,
  summary: CommitSummary,
) {
  if (!link.firstMissingRunId)
    await tx
      .update(benefitSources)
      .set({ firstMissingRunId: runId })
      .where(
        and(
          eq(benefitSources.benefitId, link.benefitId),
          eq(benefitSources.sourceId, source.id),
        ),
      );
  else {
    const [first] = await tx
      .select()
      .from(benefitSourceRuns)
      .where(eq(benefitSourceRuns.id, link.firstMissingRunId));
    if (
      first &&
      result.startedAt.getTime() - first.startedAt.getTime() >= 86_400_000
    ) {
      const withdrawn = await tx
        .update(benefits)
        .set({ lifecycle: 'withdrawn' })
        .where(
          and(
            eq(benefits.id, link.benefitId),
            eq(benefits.origin, 'harvest'),
            ne(benefits.lifecycle, 'withdrawn'),
            sql`not exists (
              select 1 from ${benefitSources}
              where ${benefitSources.benefitId} = ${benefits.id}
                and ${benefitSources.sourceId} <> ${source.id}
                and ${benefitSources.lastSeenAt} > ${first.startedAt}
            )`,
          ),
        )
        .returning({ id: benefits.id });
      summary.withdrawn += withdrawn.length;
    }
  }
}

async function withdrawAbsentBenefits(
  tx: Transaction,
  result: SourceResult,
  source: Source,
  runId: string,
  summary: CommitSummary,
) {
  if (
    result.outcome === 'ok' &&
    result.complete &&
    source.coverage === 'full'
  ) {
    const missing = await tx
      .select()
      .from(benefitSources)
      .where(
        and(
          eq(benefitSources.sourceId, source.id),
          sql`${benefitSources.lastSeenRunId} is distinct from ${runId}::uuid`,
        ),
      );
    for (const link of missing) {
      await recordAbsence(tx, link, source, runId, result, summary);
    }
  }
}

async function addManualBenefit(
  tx: Transaction,
  cmd: Extract<ReviewCommand, { kind: 'add' }>,
  ctx: WriteContext,
) {
  const snapshot = validate(cmd.candidate.snapshot);
  const [row] = await tx
    .insert(benefits)
    .values({
      publisherProviderSlug: cmd.candidate.publisherProviderSlug,
      identityKey: cmd.candidate.identityKey,
      category: cmd.candidate.category,
      snapshot,
      contentHash: hash(snapshot, cmd.candidate.category),
      origin: 'manual',
      lifecycle: 'published',
      protectedFields: cmd.protectedFields,
      firstSeenAt: ctx.now,
      lastSeenAt: ctx.now,
      lastVerifiedAt: ctx.now,
    })
    .returning();
  return {
    benefitId: row.id,
    lifecycle: row.lifecycle,
    version: row.version,
  };
}

async function decideReview(
  tx: Transaction,
  row: typeof benefits.$inferSelect,
  cmd: Extract<ReviewCommand, { kind: 'approve' | 'reject' }>,
  ctx: WriteContext,
) {
  let changes: Partial<typeof benefits.$inferInsert> = {};
  const [revision] = await tx
    .select()
    .from(benefitRevisions)
    .where(
      and(
        eq(benefitRevisions.benefitId, row.id),
        eq(benefitRevisions.status, 'pending'),
      ),
    )
    .for('update');
  if (!revision) {
    if (row.lifecycle !== 'needs_review') throw new Error('No pending review');
    return {
      lifecycle:
        cmd.kind === 'approve'
          ? ('published' as const)
          : ('withdrawn' as const),
      ...(cmd.kind === 'approve' ? { lastVerifiedAt: ctx.now } : {}),
    };
  }
  if (cmd.kind === 'approve') {
    if (revision.baseVersion !== row.version)
      throw new Error('Revision version conflict');
    changes = {
      snapshot: validate(revision.snapshot),
      category: revision.category,
      contentHash: revision.contentHash,
      version: row.version + 1,
      lifecycle: 'published',
      lastVerifiedAt: ctx.now,
    };
  }
  await tx
    .update(benefitRevisions)
    .set({
      status: cmd.kind === 'approve' ? 'approved' : 'rejected',
      reason: cmd.reason ?? revision.reason,
      decidedBy: ctx.actor,
      decidedAt: ctx.now,
    })
    .where(eq(benefitRevisions.id, revision.id));

  return changes;
}

export async function commitSourceRun(
  db: Database,
  result: SourceResult,
  source: Source,
  ctx: WriteContext,
): Promise<CommitSummary> {
  if (result.provenance === 'fixture' || !result.llm)
    throw new Error('Only live LLM runs can be committed');
  if (source.id !== result.sourceId) throw new Error('Source mismatch');
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${source.id}))`);
    const [policy] = await tx
      .select()
      .from(benefitSourcePolicies)
      .where(eq(benefitSourcePolicies.sourceId, source.id));
    const autoPublish = policy?.autoPublish ?? source.autoPublish;
    const run = await insertSourceRun(tx, result, source);
    const summary: CommitSummary = {
      runId: run.id,
      published: 0,
      staged: 0,
      updated: 0,
      unchanged: 0,
      withdrawn: 0,
    };
    for (const candidate of result.candidates) {
      const benefitId = await commitCandidate(
        tx,
        candidate,
        autoPublish,
        ctx,
        summary,
      );
      await touchSourceLink(tx, benefitId, source, candidate, run.id, ctx);
    }
    await withdrawAbsentBenefits(tx, result, source, run.id, summary);
    await tx
      .update(benefitSourceRuns)
      .set({
        counts: {
          ...run.counts,
          published: summary.published,
          staged: summary.staged,
          unchanged: summary.unchanged,
          withdrawn: summary.withdrawn,
        },
      })
      .where(eq(benefitSourceRuns.id, run.id));
    return summary;
  });
}

export async function expireBenefits(
  db: Database,
  today: string,
): Promise<number> {
  const rows = await db
    .update(benefits)
    .set({ lifecycle: 'expired' })
    .where(
      and(
        eq(benefits.lifecycle, 'published'),
        sql`${benefits.snapshot}->'rules'->'validity'->>'to' < ${today}`,
      ),
    )
    .returning({ id: benefits.id });
  return rows.length;
}

export async function reviewBenefit(
  db: Database,
  cmd: ReviewCommand,
  ctx: WriteContext,
): Promise<ReviewResult> {
  return db.transaction(async (tx) => {
    if (cmd.kind === 'add') {
      return addManualBenefit(tx, cmd, ctx);
    }
    const [row] = await tx
      .select()
      .from(benefits)
      .where(eq(benefits.id, cmd.benefitId))
      .for('update');
    if (!row) throw new Error('Benefit not found');
    let changes: Partial<typeof benefits.$inferInsert> = {};
    if (cmd.kind === 'approve' || cmd.kind === 'reject') {
      changes = await decideReview(tx, row, cmd, ctx);
    } else if (cmd.kind === 'edit') {
      const { category = row.category, ...patch } = cmd.patch;
      const snapshot = validate({ ...row.snapshot, ...patch });
      changes = {
        snapshot,
        category,
        contentHash: hash(snapshot, category),
        protectedFields: [
          ...new Set([...row.protectedFields, ...cmd.protectedFields]),
        ],
        version: row.version + 1,
      };
    } else changes = { lastVerifiedAt: ctx.now };
    const [updated] = await tx
      .update(benefits)
      .set({ ...changes, updatedAt: ctx.now })
      .where(eq(benefits.id, row.id))
      .returning();
    return {
      benefitId: updated.id,
      lifecycle: updated.lifecycle,
      version: updated.version,
    };
  });
}

export async function listBenefits(
  db: Database,
  filter: { lifecycle?: string; sourceId?: string },
): Promise<StoredBenefit[]> {
  return db
    .select()
    .from(benefits)
    .where(
      and(
        filter.lifecycle
          ? sql`${benefits.lifecycle} = ${filter.lifecycle}`
          : undefined,
        filter.sourceId
          ? sql`exists (select 1 from ${benefitSources} where ${benefitSources.benefitId} = ${benefits.id} and ${benefitSources.sourceId} = ${filter.sourceId})`
          : undefined,
      ),
    );
}

export async function getBenefit(db: Database, id: string) {
  const [benefit] = await db.select().from(benefits).where(eq(benefits.id, id));
  if (!benefit) return null;
  const [pendingRevision] = await db
    .select()
    .from(benefitRevisions)
    .where(
      and(
        eq(benefitRevisions.benefitId, id),
        eq(benefitRevisions.status, 'pending'),
      ),
    );
  return { ...benefit, pendingRevision: pendingRevision ?? null };
}

export async function loadMatchableBenefits(
  db: Database,
  categories: BenefitCategory[],
): Promise<StoredBenefit[]> {
  if (!categories.length) return [];
  return db
    .select()
    .from(benefits)
    .where(
      and(
        eq(benefits.lifecycle, 'published'),
        inArray(benefits.category, categories),
      ),
    );
}
