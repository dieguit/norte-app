import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS,
  type BenefitCapPeriod,
  type BenefitCatalogResponse,
  type BenefitCategory,
  type BenefitKind,
  type BenefitPreferences,
  type UpdateBenefitPreferences,
} from '@repo/shared-types';
import {
  and,
  arrayContains,
  arrayOverlaps,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
} from 'drizzle-orm';
import { argentinaInstant, DAY_MS, todayInArgentina } from '../argentina-time';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { NotificationsService } from '../notifications/notifications.service';
import { benefits, benefitUserPreferences } from './benefits.schema';
import { CATALOG, INSTRUMENTS } from './catalog';
import { formatDigest, rankBenefits, type MatchedBenefit } from './digest';
import { runHarvest, type Extract, type SourceResult } from './harvest';

const FRESH_MS = 3 * DAY_MS;

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  harvest(extract: Extract, now = new Date()): Promise<SourceResult[]> {
    return runHarvest(this.db, extract, undefined, now);
  }

  async findMatching(
    userId: string,
    now = new Date(),
  ): Promise<MatchedBenefit[]> {
    const [prefs] = await this.db
      .select()
      .from(benefitUserPreferences)
      .where(eq(benefitUserPreferences.userId, userId));
    if (!prefs?.instrumentSlugs.length || !prefs.categories.length) return [];
    const validInstrumentSlugs = prefs.instrumentSlugs.filter((slug) =>
      INSTRUMENTS.has(slug),
    );
    if (!validInstrumentSlugs.length) return [];
    const today = todayInArgentina(now).today;
    const weekday = argentinaInstant(today, '12:00').getUTCDay();
    const rows = await this.db
      .select()
      .from(benefits)
      .where(
        and(
          arrayOverlaps(benefits.instrumentSlugs, validInstrumentSlugs),
          inArray(benefits.category, prefs.categories),
          or(
            isNull(benefits.weekdays),
            arrayContains(benefits.weekdays, [weekday]),
          ),
          or(isNull(benefits.validFrom), lte(benefits.validFrom, today)),
          or(isNull(benefits.validTo), gte(benefits.validTo, today)),
          gte(benefits.lastSeenAt, new Date(now.getTime() - FRESH_MS)),
        ),
      );
    const held = new Set(validInstrumentSlugs);
    return rankBenefits(
      rows.map((row) => {
        const slug =
          row.instrumentSlugs.find((s) => held.has(s)) ?? row.instrumentSlugs[0];
        return {
          title: row.title,
          merchant: row.merchant,
          category: row.category as BenefitCategory,
          kind: row.kind as BenefitKind,
          value: row.value,
          maxAmount: row.maxAmount,
          maxAmountPeriod: row.maxAmountPeriod as BenefitCapPeriod | null,
          conditions: row.conditions,
          sourceUrl: row.sourceUrl,
          instrumentLabel: INSTRUMENTS.get(slug)?.label ?? slug,
        };
      }),
    );
  }

  async buildDigest(userId: string, now = new Date()): Promise<string | null> {
    return formatDigest(await this.findMatching(userId, now));
  }

  catalog(): BenefitCatalogResponse {
    return {
      providers: CATALOG.filter((p) => p.instruments.length).map(
        ({ slug, name, kind, instruments }) => ({
          slug,
          name,
          kind,
          instruments: instruments.map((i) => ({
            slug: i.slug,
            label: i.label,
            network: i.network ?? null,
            type: i.type,
            tier: i.tier ?? null,
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
    const [row] = await this.db
      .select()
      .from(benefitUserPreferences)
      .where(eq(benefitUserPreferences.userId, userId));
    const settings = await this.notifications.listSettings(userId);
    return {
      instrumentSlugs: row?.instrumentSlugs ?? [],
      categories: (row?.categories ?? []) as BenefitPreferences['categories'],
      enabled:
        settings.find((s) => s.type === 'savings_digest')?.enabled ?? false,
    };
  }

  // Saving the page is the opt-in: preferences and the digest setting are written together.
  async savePreferences(
    userId: string,
    input: UpdateBenefitPreferences,
  ): Promise<BenefitPreferences> {
    const unknown = input.instrumentSlugs.filter(
      (slug) => !INSTRUMENTS.has(slug),
    );
    if (unknown.length)
      throw new BadRequestException(
        `Instrumentos desconocidos: ${unknown.join(', ')}`,
      );
    const values = {
      instrumentSlugs: [...new Set(input.instrumentSlugs)],
      categories: [...new Set(input.categories)],
    };
    await this.db.transaction(async (tx) => {
      await tx
        .insert(benefitUserPreferences)
        .values({ userId, ...values })
        .onConflictDoUpdate({
          target: benefitUserPreferences.userId,
          set: values,
        });
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
