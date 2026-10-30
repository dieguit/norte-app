import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS,
  type BenefitCatalogResponse,
  type BenefitPreferences,
  type BenefitProfileFacts,
  type UpdateBenefitPreferences,
} from '@repo/shared-types';
import { eq } from 'drizzle-orm';
import { DAY_MS, todayInArgentina } from '../argentina-time';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { NotificationsService } from '../notifications/notifications.service';
import { benefitUserPreferences } from './benefits.schema';
import type { Extract, MatchedBenefit, CommitSummary } from './benefits.types';
import { CATALOG, INSTRUMENTS } from './catalog';
import { formatDigest } from './digest';
import { runHarvest } from './harvest';
import { evaluateBenefit, rankMatches } from './rules';
import {
  commitSourceRun,
  expireBenefits,
  loadMatchableBenefits,
  loadSourcePolicies,
} from './store';

export type BenefitProfilePatch = Partial<BenefitProfileFacts> & {
  addInstrumentSlugs?: string[];
  removeInstrumentSlugs?: string[];
};

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async harvestNightly(extract: Extract, now = new Date()) {
    const policies = await loadSourcePolicies(this.db);
    const results = await runHarvest({
      providers: CATALOG,
      includeDisabled: false,
      policies,
      extract,
      now,
    });
    const summaries: {
      sourceId: string;
      summary?: CommitSummary;
      error?: string;
    }[] = [];
    for (const result of results) {
      if (!result.llm || result.provenance !== 'live') continue;
      try {
        const source = CATALOG.flatMap((p) => p.sources).find(
          (s) => s.id === result.sourceId,
        );
        if (!source) throw new Error(`Fuente desconocida: ${result.sourceId}`);
        summaries.push({
          sourceId: result.sourceId,
          summary: await commitSourceRun(this.db, result, source, {
            now,
            actor: 'nightly',
          }),
        });
      } catch (error) {
        summaries.push({
          sourceId: result.sourceId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const expired = await expireBenefits(this.db, todayInArgentina(now).today);
    return { results, summaries, expired };
  }

  private async loadPreferences(userId: string) {
    const [row] = await this.db
      .select()
      .from(benefitUserPreferences)
      .where(eq(benefitUserPreferences.userId, userId));
    return row;
  }

  async findMatching(
    userId: string,
    now = new Date(),
    opts?: { purchase?: { amountMinor: number } },
  ): Promise<MatchedBenefit[]> {
    const prefs = await this.loadPreferences(userId);
    if (!prefs?.instrumentSlugs.length || !prefs.categories.length) return [];
    const instruments = prefs.instrumentSlugs.flatMap((slug) => {
      const instrument = INSTRUMENTS.get(slug);
      return instrument ? [instrument] : [];
    });
    if (!instruments.length) return [];
    const rows = await loadMatchableBenefits(
      this.db,
      prefs.categories as BenefitPreferences['categories'],
    );
    const matches = rows.map((row) => {
      const candidate = {
        ...row,
        rules: row.snapshot.rules,
        excludeAfterMs: (row.origin === 'manual' ? 90 : 7) * DAY_MS,
      };
      return evaluateBenefit(
        candidate,
        {
          instruments,
          instrumentFacts: prefs.instrumentFacts,
          providerFacts: prefs.providerFacts,
        },
        { now, ...opts },
      );
    });
    return rankMatches(matches).map((match) => {
      const row = rows.find((row) => row.id === match.benefitId)!;
      return {
        match,
        benefit: {
          id: row.id,
          publisherProviderSlug: row.publisherProviderSlug,
          category: row.category,
          origin: row.origin,
          title: row.snapshot.title,
          merchant: row.snapshot.merchant,
          rules: row.snapshot.rules,
          sourceUrl: row.snapshot.evidence.sourceUrl,
          termsUrl: row.snapshot.evidence.termsUrl,
        },
        instrumentLabels: match.matchedInstrumentSlugs.map(
          (slug) => INSTRUMENTS.get(slug)?.label ?? slug,
        ),
      };
    });
  }

  async buildDigest(userId: string, now = new Date()): Promise<string | null> {
    const [matches, prefs] = await Promise.all([
      this.findMatching(userId, now),
      this.loadPreferences(userId),
    ]);
    return formatDigest(
      matches.filter(
        ({ match, benefit }) =>
          match.eligibility === 'eligible' &&
          match.availability === 'available' &&
          !match.stale &&
          (benefit.rules.recurrence !== 'ongoing' ||
            match.matchedInstrumentSlugs.some((slug) => {
              const declared = Date.parse(prefs?.declaredAt[slug] ?? '');
              return (
                declared <= now.getTime() && declared > now.getTime() - DAY_MS
              );
            })),
      ),
    );
  }

  catalog(): BenefitCatalogResponse {
    return {
      providers: CATALOG.filter((p) => p.instruments.length).map(
        ({ slug, name, kind, instruments, sources }) => ({
          slug,
          name,
          kind,
          // Any active source wins; degraded coverage is partial, everything else pending.
          coverage: sources.some((s) => s.status === 'active')
            ? 'active'
            : sources.some((s) => s.status === 'degraded')
              ? 'partial'
              : 'pending',
          instruments: instruments.map((i) => ({
            slug: i.slug,
            label: i.label,
            network: i.network ?? null,
            type: i.type,
            tier: i.tier ?? null,
            issuerProviderSlug:
              i.issuerProviderSlug ?? (kind === 'bank' ? slug : null),
            segment: i.segment ?? null,
            productLevel: i.productLevel ?? null,
            usage: i.usage ?? null,
          })),
        }),
      ),
      categories: BENEFIT_CATEGORIES.map((slug) => ({
        slug,
        label: BENEFIT_CATEGORY_LABELS[slug],
      })),
    };
  }

  async getPreferences(userId: string): Promise<BenefitPreferences> {
    const row = (await this.loadPreferences(userId)) ?? {
      instrumentSlugs: [],
      categories: [],
      instrumentFacts: {},
      providerFacts: {},
    };
    const settings = await this.notifications.listSettings(userId);
    return {
      instrumentSlugs: row.instrumentSlugs,
      categories: row.categories as BenefitPreferences['categories'],
      instrumentFacts: row.instrumentFacts,
      providerFacts: row.providerFacts,
      enabled:
        settings.find((s) => s.type === 'savings_digest')?.enabled ?? false,
    };
  }

  async savePreferences(
    userId: string,
    input: UpdateBenefitPreferences,
  ): Promise<BenefitPreferences> {
    return this.writePreferences(userId, input, true);
  }

  async updateProfile(
    userId: string,
    patch: BenefitProfilePatch,
  ): Promise<BenefitPreferences> {
    const current = await this.getPreferences(userId);
    const removed = new Set(patch.removeInstrumentSlugs ?? []);
    const unknown = [...(patch.addInstrumentSlugs ?? []), ...removed].filter(
      (slug) => !INSTRUMENTS.has(slug),
    );
    if (unknown.length)
      throw new BadRequestException(
        `Instrumentos desconocidos: ${unknown.join(', ')}`,
      );
    const instrumentSlugs = [
      ...new Set([
        ...current.instrumentSlugs,
        ...(patch.addInstrumentSlugs ?? []),
      ]),
    ].filter((slug) => !removed.has(slug));
    return this.writePreferences(
      userId,
      {
        instrumentSlugs,
        categories: current.categories,
        instrumentFacts: {
          ...Object.fromEntries(
            Object.entries(current.instrumentFacts).filter(([slug]) =>
              instrumentSlugs.includes(slug),
            ),
          ),
          ...Object.fromEntries(
            Object.entries(patch.instrumentFacts ?? {}).map(([slug, facts]) => [
              slug,
              { ...current.instrumentFacts[slug], ...facts },
            ]),
          ),
        },
        providerFacts: {
          ...current.providerFacts,
          ...Object.fromEntries(
            Object.entries(patch.providerFacts ?? {}).map(([slug, facts]) => [
              slug,
              { ...current.providerFacts[slug], ...facts },
            ]),
          ),
        },
      },
      false,
    );
  }

  private async writePreferences(
    userId: string,
    input: UpdateBenefitPreferences,
    enableDigest: boolean,
  ): Promise<BenefitPreferences> {
    const unknown = input.instrumentSlugs.filter(
      (slug) => !INSTRUMENTS.has(slug),
    );
    if (unknown.length)
      throw new BadRequestException(
        `Instrumentos desconocidos: ${unknown.join(', ')}`,
      );
    const instrumentSlugs = [...new Set(input.instrumentSlugs)];
    await this.db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(benefitUserPreferences)
        .where(eq(benefitUserPreferences.userId, userId));
      const facts = previous ?? {
        instrumentFacts: {},
        providerFacts: {},
        declaredAt: {} as Record<string, string>,
      };
      const instrumentFacts =
        input.instrumentFacts ??
        Object.fromEntries(
          Object.entries(facts.instrumentFacts).filter(([slug]) =>
            instrumentSlugs.includes(slug),
          ),
        );
      const providerFacts = input.providerFacts ?? facts.providerFacts;
      if (
        Object.keys(instrumentFacts).some(
          (slug) => !instrumentSlugs.includes(slug),
        ) ||
        Object.keys(providerFacts).some(
          (slug) => !CATALOG.some((p) => p.slug === slug),
        )
      )
        throw new BadRequestException(
          'Los datos deben pertenecer a instrumentos declarados y proveedores del catálogo.',
        );
      const now = new Date().toISOString();
      const values = {
        instrumentSlugs,
        categories: [...new Set(input.categories)],
        instrumentFacts,
        providerFacts,
        declaredAt: Object.fromEntries(
          instrumentSlugs.map((slug) => [slug, facts.declaredAt[slug] ?? now]),
        ),
      };
      await tx
        .insert(benefitUserPreferences)
        .values({ userId, ...values })
        .onConflictDoUpdate({
          target: benefitUserPreferences.userId,
          set: values,
        });
      if (enableDigest)
        await this.notifications.updateSetting(
          userId,
          'savings_digest',
          { enabled: true },
          tx,
        );
    });
    return this.getPreferences(userId);
  }
}
