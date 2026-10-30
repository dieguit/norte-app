import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BenefitProfileSchema,
  UpdateBenefitProfileSchema,
  type BenefitProfile,
  type UpdateBenefitProfile,
  type BenefitBankList,
  type BenefitSearchQuery,
  type BenefitSearchResult,
  type BenefitDetail,
} from '@repo/shared-types';
import { and, eq, isNull, inArray, or, isNotNull, sql, gte } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { NotificationsService } from '../notifications/notifications.service';
import { benefitUserPreferences } from './benefits.schema';
import {
  benefitBanks,
  benefitBrands,
  benefitCampaigns,
  benefitCampaignBanks,
  benefitIngestRuns,
} from './ingest/schema';
import { ALLOWED_BANKS, BANK_TIERS } from './ingest/tiers';
import {
  buildResults,
  groupResults,
  rankResults,
  variantsFor,
} from './consumer';
import { formatDigest } from './digest';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async banks(now = new Date()): Promise<BenefitBankList> {
    const [banks, runs] = await Promise.all([
      this.db
        .select()
        .from(benefitBanks)
        .where(
          and(
            inArray(benefitBanks.slug, ALLOWED_BANKS),
            or(
              isNotNull(benefitBanks.playdigitalId),
              eq(benefitBanks.ownCatalog, true),
            ),
          ),
        ),
      this.db
        .select()
        .from(benefitIngestRuns)
        .where(
          and(
            eq(benefitIngestRuns.outcome, 'ok'),
            eq(benefitIngestRuns.complete, true),
            gte(
              benefitIngestRuns.completedAt,
              new Date(now.getTime() - 48 * 3600000),
            ),
          ),
        ),
    ]);
    return {
      banks: banks
        .map((bank): BenefitBankList['banks'][number] => ({
          slug: bank.slug,
          name: bank.name,
          coverage: bank.ownCatalog ? 'modo_and_own' : 'modo',
          ownCatalogScope: bank.ownCatalogScope,
          tiers: BANK_TIERS[bank.slug] ?? [],
          // Every source we advertise for the bank must be fresh.
          stale: [
            bank.playdigitalId ? 'playdigital' : null,
            bank.slug === 'galicia' ? 'galicia' : null,
          ].some(
            (source) =>
              source &&
              !runs.some(
                (run) =>
                  run.source === source &&
                  (run.bankSlug === bank.slug ||
                    (run.bankSlug === null && source === 'galicia')),
              ),
          ),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async getPreferences(userId: string): Promise<BenefitProfile> {
    const [row] = await this.db
      .select()
      .from(benefitUserPreferences)
      .where(eq(benefitUserPreferences.userId, userId));
    const settings = await this.notifications.listSettings(userId);
    return BenefitProfileSchema.parse({
      banks: row?.banks ?? [],
      usesModo: row?.usesModo ?? false,
      categories: row?.categories ?? [],
      enabled:
        settings.find((s) => s.type === 'savings_digest')?.enabled ?? false,
    });
  }

  savePreferences(userId: string, input: UpdateBenefitProfile) {
    return this.writePreferences(userId, input, true);
  }

  async updateProfile(userId: string, patch: Partial<UpdateBenefitProfile>) {
    const current = await this.getPreferences(userId);
    const { enabled: _, ...profile } = current;
    return this.writePreferences(userId, { ...profile, ...patch }, false);
  }

  private async writePreferences(
    userId: string,
    input: UpdateBenefitProfile,
    enableDigest: boolean,
  ) {
    const parsed = (
      enableDigest
        ? UpdateBenefitProfileSchema
        : BenefitProfileSchema.omit({ enabled: true })
    ).safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const available = await this.banks();
    for (const bank of parsed.data.banks) {
      const option = available.banks.find((b) => b.slug === bank.slug);
      if (
        !option ||
        (bank.tier !== null && !option.tiers.some((t) => t.code === bank.tier))
      )
        throw new BadRequestException(
          `Banco o nivel desconocido: ${bank.slug}`,
        );
    }
    const values = {
      ...parsed.data,
      categories: [...new Set(parsed.data.categories)],
    };
    await this.db.transaction(async (tx) => {
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

  private candidates(
    bankSlugs: string[],
    q?: string,
    id?: string,
    related?: { brandId: string | null; title: string },
  ) {
    return this.db
      .select({
        campaign: benefitCampaigns,
        presence: benefitCampaignBanks,
        brand: benefitBrands,
      })
      .from(benefitCampaigns)
      .innerJoin(
        benefitCampaignBanks,
        eq(benefitCampaignBanks.campaignId, benefitCampaigns.id),
      )
      .leftJoin(benefitBrands, eq(benefitBrands.id, benefitCampaigns.brandId))
      .where(
        and(
          eq(benefitCampaigns.hidden, false),
          isNull(benefitCampaigns.withdrawnAt),
          isNull(benefitCampaignBanks.withdrawnAt),
          sql`${benefitCampaignBanks.terms}->>'eligibilityCompleteness' = 'complete'`,
          related
            ? related.brandId
              ? eq(benefitCampaigns.brandId, related.brandId)
              : eq(benefitCampaigns.title, related.title)
            : id
              ? eq(benefitCampaigns.id, id)
              : inArray(benefitCampaignBanks.bankSlug, bankSlugs),
          q
            ? sql`(${benefitCampaigns.title} ilike ${'%' + q.replace(/[\\%_]/g, '\\$&') + '%'} or ${benefitBrands.name} ilike ${'%' + q.replace(/[\\%_]/g, '\\$&') + '%'} or exists (select 1 from unnest(${benefitBrands.aliases}) alias where alias ilike ${'%' + q.replace(/[\\%_]/g, '\\$&') + '%'}))`
            : undefined,
        ),
      );
  }

  async search(
    userId: string,
    query: BenefitSearchQuery,
    now = new Date(),
  ): Promise<BenefitSearchResult> {
    const [profile, banks] = await Promise.all([
      this.getPreferences(userId),
      this.banks(now),
    ]);
    const slugs = profile.banks
      .filter((b) => !query.bank || b.slug === query.bank)
      .map((b) => b.slug);
    const rows = slugs.length ? await this.candidates(slugs, query.q) : [];
    const grouped = groupResults(
      buildResults(rows, profile, banks.banks, query.day, now),
    );
    const countsByCategory: Record<string, number> = {};
    for (const item of grouped)
      for (const category of item.categories)
        countsByCategory[category] = (countsByCategory[category] ?? 0) + 1;
    const items = grouped.filter((item) =>
      query.category
        ? item.categories.includes(query.category)
        : item.categories.some((c) => profile.categories.includes(c as never)),
    );
    return {
      profileConfigured: profile.banks.length > 0,
      items: items.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize,
      ),
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      countsByCategory,
      staleBanks: banks.banks
        .filter((b) => b.stale && profile.banks.some((p) => p.slug === b.slug))
        .map((b) => b.slug),
    };
  }

  async detail(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<BenefitDetail> {
    const [profile, banks, rows] = await Promise.all([
      this.getPreferences(userId),
      this.banks(now),
      this.candidates([], undefined, id),
    ]);
    const results = buildResults(
      rows,
      profile,
      banks.banks,
      'available',
      now,
      true,
    );
    const item = results.sort(rankResults)[0];
    if (!item) throw new NotFoundException('Beneficio no disponible');
    const grouped = groupResults(
      results.filter((result) => result.match !== 'ineligible'),
    )[0];
    const campaign = rows[0]!.campaign;
    const related = buildResults(
      await this.candidates([], undefined, undefined, campaign),
      profile,
      banks.banks,
      'available',
      now,
      true,
    );
    return {
      ...item,
      usableWith: grouped?.usableWith ?? item.usableWith,
      variants: variantsFor(
        related.filter((other) => other.validity.to === item.validity.to),
        item,
      ),
    };
  }

  async buildDigest(userId: string, now = new Date()): Promise<string | null> {
    const profile = await this.getPreferences(userId);
    const result = await this.search(
      userId,
      { day: 'today', page: 1, pageSize: 50 },
      now,
    );
    // Fetch all groups: a category's overflow count must not depend on API pagination.
    const items = [...result.items];
    for (let page = 2; items.length < result.total; page++) {
      const next = await this.search(
        userId,
        { day: 'today', page, pageSize: 50 },
        now,
      );
      if (!next.items.length) break;
      items.push(...next.items);
    }
    return formatDigest(
      items,
      profile.categories,
      this.config.get<string>('WEB_APP_URL') ?? '',
    );
  }
}
