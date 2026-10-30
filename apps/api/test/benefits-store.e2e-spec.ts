import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BenefitRulesSchema } from '@repo/shared-types';
import { schema } from '../src/database/schema';
import {
  benefits,
  benefitRevisions,
  benefitSources,
} from '../src/benefits/benefits.schema';
import type {
  CandidateBenefit,
  SourceResult,
} from '../src/benefits/benefits.types';
import type { Source } from '../src/benefits/catalog';
import {
  commitSourceRun,
  expireBenefits,
  getBenefit,
  listBenefits,
  loadMatchableBenefits,
  loadSourcePolicies,
  reviewBenefit,
  setSourcePolicy,
} from '../src/benefits/store';

const url = process.env.DATABASE_URL;
if (url && new URL(url).pathname !== '/norte_test')
  throw new Error('Only norte_test permitted');
describe.skipIf(!url)('benefits persistence', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'drizzle' });
  });
  afterAll(async () => {
    await pool.end();
  });
  const now = new Date('2026-10-20T06:00:00Z');
  const ctx = { now, actor: 'store-test' };
  const source = (): Source => ({
    id: randomUUID(),
    url: 'https://example.test',
    strategy: 'fetch',
    enabled: true,
    autoPublish: false,
    status: 'active',
    coverage: 'full',
    instructions: '',
  });
  const candidate = (): CandidateBenefit => ({
    publisherProviderSlug: randomUUID(),
    identityKey: randomUUID(),
    upstreamId: null,
    category: 'supermercado',
    contentHash: 'first',
    snapshot: {
      title: 'Offer',
      merchant: null,
      evidence: {
        sourceUrl: 'https://example.test',
        detailUrl: null,
        termsUrl: null,
        quotes: [],
        fetchedContentHash: 'body',
      },
      rules: BenefitRulesSchema.parse({
        eligibility: { membership: { instrumentSlug: 'uber-one' } },
        eligibilityCompleteness: 'complete',
        offer: { type: 'discount', percentageBps: 1000 },
        currency: 'ARS',
        minimumSpendMinor: 0,
        capState: 'none',
        caps: [],
        validity: {
          from: null,
          to: '2026-10-31',
          weekdays: null,
          monthDays: null,
        },
        channels: { allowed: [], excluded: [] },
        stackable: 'unknown',
        recurrence: 'campaign',
      }),
    },
  });
  const result = (
    s: Source,
    candidates: CandidateBenefit[],
    day = 0,
  ): SourceResult => ({
    sourceId: s.id,
    providerSlug: 'test',
    provenance: 'live',
    llm: true,
    outcome: 'ok',
    complete: true,
    truncated: false,
    coverage: s.coverage,
    http: null,
    diagnostics: [],
    candidates,
    rejected: [],
    startedAt: new Date(now.getTime() + day * 86_400_000),
    completedAt: new Date(now.getTime() + day * 86_400_000),
  });
  const commit = (s: Source, items: CandidateBenefit[], day = 0) =>
    commitSourceRun(db, result(s, items, day), s, {
      ...ctx,
      now: result(s, items, day).startedAt,
    });
  const find = async (c: CandidateBenefit) =>
    (await listBenefits(db, {})).find(
      (row) => row.identityKey === c.identityKey,
    )!;

  it('applies policies, touches unchanged snapshots, stages and promotes revisions with optimistic conflicts', async () => {
    const s = source();
    const c = candidate();
    await commit(s, [c]);
    let row = await find(c);
    expect(row.lifecycle).toBe('needs_review');
    await reviewBenefit(db, { kind: 'approve', benefitId: row.id }, ctx);
    await setSourcePolicy(db, s.id, { autoPublish: true }, ctx);
    expect((await loadSourcePolicies(db)).get(s.id)).toEqual({
      autoPublish: true,
    });
    const other = candidate();
    expect((await commit(s, [other])).published).toBe(1);
    expect((await commit(s, [c], 1)).unchanged).toBe(1);
    row = (await getBenefit(db, row.id))!;
    expect(row.lastVerifiedAt?.getTime()).toBe(now.getTime() + 86_400_000);
    const changed = {
      ...c,
      contentHash: 'second',
      snapshot: { ...c.snapshot, title: 'Changed' },
    };
    expect((await commit(s, [changed], 2)).staged).toBe(1);
    expect((await getBenefit(db, row.id))?.snapshot.title).toBe('Offer');
    expect((await getBenefit(db, row.id))?.lastVerifiedAt).toEqual(
      row.lastVerifiedAt,
    );
    await reviewBenefit(db, { kind: 'approve', benefitId: row.id }, ctx);
    expect((await getBenefit(db, row.id))?.snapshot.title).toBe('Changed');
    await commit(s, [{ ...changed, contentHash: 'third' }], 3);
    await reviewBenefit(
      db,
      {
        kind: 'edit',
        benefitId: row.id,
        patch: { merchant: 'Edited' },
        protectedFields: ['merchant'],
      },
      ctx,
    );
    await expect(
      reviewBenefit(db, { kind: 'approve', benefitId: row.id }, ctx),
    ).rejects.toThrow('conflict');
    expect(
      (
        await db
          .select()
          .from(benefitRevisions)
          .where(eq(benefitRevisions.benefitId, row.id))
      ).some((r) => r.status === 'pending'),
    ).toBe(true);
  });

  it('keeps benefits observed by another source until all links are stale', async () => {
    const a = { ...source(), autoPublish: true };
    const b = source();
    const c = candidate();
    await commit(a, [c]);
    await commit(b, [c]);
    const row = await find(c);
    await commit(a, [], 1);
    await commit(b, [c], 1.5);
    expect((await commit(a, [], 2)).withdrawn).toBe(0);
    expect((await getBenefit(db, row.id))?.lifecycle).toBe('published');
    await commit(b, [c], 2.5);
    expect((await commit(a, [], 3)).withdrawn).toBe(0);
    await commit(b, [], 4);
    expect((await commit(b, [], 5)).withdrawn).toBe(1);
  });

  it('supersedes obsolete harvest proposals after reconfirmation or replacement', async () => {
    const s = { ...source(), autoPublish: true };
    const a = candidate();
    const b = {
      ...a,
      contentHash: 'B',
      snapshot: { ...a.snapshot, title: 'B' },
    };
    const c = {
      ...a,
      contentHash: 'C',
      snapshot: { ...a.snapshot, title: 'C' },
    };
    await commit(s, [a]);
    const row = await find(a);
    await commit(s, [b], 1);
    await commit(s, [c], 2);
    expect(
      (await getBenefit(db, row.id))?.pendingRevision?.snapshot.title,
    ).toBe('C');
    await commit(s, [a], 3);
    expect((await getBenefit(db, row.id))?.pendingRevision).toBeNull();
    await expect(
      reviewBenefit(db, { kind: 'approve', benefitId: row.id }, ctx),
    ).rejects.toThrow('No pending review');
    const revisions = await db
      .select()
      .from(benefitRevisions)
      .where(eq(benefitRevisions.benefitId, row.id));
    expect(revisions.map((r) => r.status)).toEqual([
      'superseded',
      'superseded',
    ]);
  });

  it('supersedes a pending harvest revision staged by another runner on reconfirmation', async () => {
    const s = { ...source(), autoPublish: true };
    const a = candidate();
    await commit(s, [a]);
    const row = await find(a);
    await db.insert(benefitRevisions).values({
      benefitId: row.id,
      baseVersion: row.version,
      snapshot: a.snapshot,
      category: a.category,
      contentHash: 'manual',
      status: 'pending',
      actor: 'manual-editor',
    });
    await commit(s, [a], 1);
    expect((await getBenefit(db, row.id))?.pendingRevision).toBeNull();
  });

  it('stages protected-field conflicts even for unpublished rows', async () => {
    const s = source();
    const c = candidate();
    await commit(s, [c]);
    const row = await find(c);
    await reviewBenefit(
      db,
      {
        kind: 'edit',
        benefitId: row.id,
        patch: {},
        protectedFields: ['title'],
      },
      ctx,
    );
    await commit(s, [
      {
        ...c,
        contentHash: 'changed',
        snapshot: { ...c.snapshot, title: 'Different' },
      },
    ]);
    expect((await getBenefit(db, row.id))?.snapshot.title).toBe('Offer');
    const [revision] = await db
      .select()
      .from(benefitRevisions)
      .where(eq(benefitRevisions.benefitId, row.id));
    expect(revision.reason).toBe('conflicts with protected field title');
  });

  it('requires two complete full absences >=24h, resets sightings, and never withdraws manual rows', async () => {
    const s = source();
    const c = candidate();
    await commit(s, [c]);
    const row = await find(c);
    await commitSourceRun(
      db,
      { ...result(s, [], 1), outcome: 'partial', complete: false },
      s,
      ctx,
    );
    let [link] = await db
      .select()
      .from(benefitSources)
      .where(eq(benefitSources.benefitId, row.id));
    expect(link.firstMissingRunId).toBeNull();
    await commit(s, [], 2);
    await commit(s, [], 2.5);
    expect((await getBenefit(db, row.id))?.lifecycle).not.toBe('withdrawn');
    await commit(s, [c], 3);
    [link] = await db
      .select()
      .from(benefitSources)
      .where(eq(benefitSources.benefitId, row.id));
    expect(link.firstMissingRunId).toBeNull();
    await commit(s, [], 4);
    await commit(s, [], 5);
    expect((await getBenefit(db, row.id))?.lifecycle).toBe('withdrawn');
    const manual = candidate();
    const added = await reviewBenefit(
      db,
      { kind: 'add', candidate: manual, protectedFields: [] },
      ctx,
    );
    await commit(s, [manual], 6);
    await commit(s, [], 7);
    await commit(s, [], 8);
    expect((await getBenefit(db, added.benefitId))?.lifecycle).toBe(
      'published',
    );
  });

  it('rejects uncertifiable runs, expires only published dated benefits, filters matchable rows', async () => {
    const s = source();
    const c = candidate();
    await expect(
      commitSourceRun(db, { ...result(s, [c]), provenance: 'fixture' }, s, ctx),
    ).rejects.toThrow();
    await expect(
      commitSourceRun(db, { ...result(s, [c]), llm: false }, s, ctx),
    ).rejects.toThrow();
    const added = await reviewBenefit(
      db,
      { kind: 'add', candidate: c, protectedFields: [] },
      ctx,
    );
    expect(
      (await loadMatchableBenefits(db, ['supermercado'])).some(
        (r) => r.id === added.benefitId,
      ),
    ).toBe(true);
    await expireBenefits(db, '2026-11-01');
    expect((await getBenefit(db, added.benefitId))?.lifecycle).toBe('expired');
    expect(await loadMatchableBenefits(db, [])).toEqual([]);
  });
});
