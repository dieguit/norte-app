import type {
  BenefitBankList,
  BenefitProfile,
  BenefitDetail,
  BenefitResult,
  CampaignTerms,
  Requirement,
} from '@repo/shared-types';
import { argentinaInstant, todayInArgentina, DAY_MS } from '../argentina-time';
import {
  benefitCampaigns,
  benefitCampaignBanks,
  benefitBrands,
} from './ingest/schema';
import { BANK_TIERS } from './ingest/tiers';
import {
  evaluateEligibility,
  type EligibilityProfile,
} from './rules/eligibility';

type Candidate = {
  campaign: typeof benefitCampaigns.$inferSelect;
  presence: typeof benefitCampaignBanks.$inferSelect;
  brand: typeof benefitBrands.$inferSelect | null;
};
const brandKey = Symbol('brandId');
type Matched = BenefitDetail & { [brandKey]?: string };

export function nextDate(
  terms: CampaignTerms,
  day: 'today' | 'tomorrow' | 'week' | 'available',
  now: Date,
): string | null {
  const today = todayInArgentina(now).today;
  const start = argentinaInstant(
    day === 'available' && terms.validity.from && terms.validity.from > today
      ? terms.validity.from
      : today,
  ).getTime();
  for (
    let offset = day === 'tomorrow' ? 1 : 0;
    offset <
    (day === 'week' || day === 'available' ? 7 : day === 'tomorrow' ? 2 : 1);
    offset++
  ) {
    const date = todayInArgentina(new Date(start + offset * DAY_MS)).today;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (
      (!terms.validity.from || date >= terms.validity.from) &&
      (!terms.validity.to || date <= terms.validity.to) &&
      (!terms.validity.weekdays || terms.validity.weekdays.includes(weekday))
    )
      return date;
  }
  return null;
}

function profileFor(
  profile: BenefitProfile,
  bankSlug: string,
): EligibilityProfile {
  const banks = profile.banks.filter((b) => b.slug === bankSlug);
  return {
    instruments: [
      ...banks.flatMap((bank) =>
        bank.cards.map((card) => ({
          slug: `${bank.slug}:${card.type}:${card.network}`,
          label: bank.slug,
          providerSlug: bank.slug,
          issuerProviderSlug: bank.slug,
          type: card.type,
          network: card.network,
          evidenceUrl: '',
        })),
      ),
      ...(profile.usesModo
        ? [
            {
              slug: 'modo',
              label: 'MODO',
              providerSlug: 'modo',
              type: 'membership' as const,
              evidenceUrl: '',
            },
          ]
        : []),
    ],
    instrumentFacts: {},
    providerFacts: Object.fromEntries(
      banks
        .filter((b) => b.tier !== null)
        .map((b) => [b.slug, { tier: b.tier! }]),
    ),
  };
}

function tierRequirements(
  req: Requirement,
): { bankSlug: string; codes: string[] }[] {
  if ('allOf' in req) return req.allOf.flatMap(tierRequirements);
  if ('anyOf' in req) return req.anyOf.flatMap(tierRequirements);
  return 'providerFact' in req && req.providerFact.key === 'tier'
    ? [
        {
          bankSlug: req.providerFact.providerSlug,
          codes: req.providerFact.values.filter(
            (v): v is string => typeof v === 'string',
          ),
        },
      ]
    : [];
}

function classify(
  evaluation: ReturnType<typeof evaluateEligibility>,
  profile: BenefitProfile,
  bankSlug: string,
): BenefitDetail['match'] {
  const bank = profile.banks.find((b) => b.slug === bankSlug);
  if (!bank) return 'ineligible';
  if (evaluation.result === 'yes') return 'eligible';
  if (
    evaluation.result === 'unknown' &&
    bank.tier === null &&
    evaluation.missingFacts.length > 0 &&
    evaluation.missingFacts.every(
      (fact) => fact === `provider:${bankSlug}:tier`,
    )
  )
    return 'needs_tier';
  return 'ineligible';
}

function matchingInstruments(
  eligibility: Requirement,
  held: EligibilityProfile,
  date: string,
  match: BenefitDetail['match'],
) {
  // Resolve only unknown tiers to recover matching cards; never assume other missing facts.
  const profiles =
    match === 'needs_tier'
      ? tierRequirements(eligibility).flatMap((t) =>
          t.codes.map((tier) => ({
            ...held,
            providerFacts: { ...held.providerFacts, [t.bankSlug]: { tier } },
          })),
        )
      : [held];
  const paths = profiles
    .map((profile) => ({
      profile,
      evaluation: evaluateEligibility(eligibility, profile, date),
    }))
    .filter((path) => path.evaluation.result === 'yes');
  return {
    matched: new Set(
      paths.flatMap((path) => path.evaluation.matchedInstrumentSlugs),
    ),
    requiresModo:
      paths.length > 0 &&
      paths.every(
        ({ profile }) =>
          evaluateEligibility(
            eligibility,
            {
              ...profile,
              instruments: profile.instruments.filter((i) => i.slug !== 'modo'),
            },
            date,
          ).result === 'no',
      ),
  };
}

function publishableTerms({
  campaign,
  presence,
}: Candidate): CampaignTerms | null {
  if (campaign.hidden || campaign.withdrawnAt || presence.withdrawnAt)
    return null;
  const terms = presence.terms;
  return terms?.eligibilityCompleteness === 'complete' ? terms : null;
}

function eligibilityFor(
  terms: CampaignTerms,
  tiers: Candidate['presence']['tiers'],
): Requirement {
  return tiers
    ? {
        allOf: [
          terms.eligibility,
          {
            providerFact: {
              providerSlug: tiers.bankSlug,
              key: 'tier',
              values: tiers.codes,
            },
          },
        ],
      }
    : terms.eligibility;
}

function usableCards(
  profile: BenefitProfile,
  bankSlug: string,
  banks: BenefitBankList['banks'],
  matched: Set<string>,
): BenefitResult['usableWith'] {
  return profile.banks
    .filter((bank) => bank.slug === bankSlug)
    .flatMap((bank) =>
      bank.cards
        .filter((card) =>
          matched.has(`${bank.slug}:${card.type}:${card.network}`),
        )
        .map((card) => ({
          bankSlug: bank.slug,
          bankName:
            banks.find((option) => option.slug === bank.slug)?.name ??
            bank.slug,
          card,
        })),
    );
}

function tierLabels(eligibility: Requirement): string[] {
  return [
    ...new Set(
      tierRequirements(eligibility).flatMap((t) =>
        (BANK_TIERS[t.bankSlug] ?? [])
          .filter((tier) => t.codes.includes(tier.code))
          .map((tier) => tier.label),
      ),
    ),
  ];
}

export function buildResults(
  rows: Candidate[],
  profile: BenefitProfile,
  banks: BenefitBankList['banks'],
  day: 'today' | 'tomorrow' | 'week' | 'available',
  now: Date,
  includeIneligible = false,
): Matched[] {
  return rows.flatMap((row) => {
    const { campaign, presence, brand } = row;
    const terms = publishableTerms(row);
    if (!terms) return [];
    const date = nextDate(terms, day, now);
    if (!date) return [];
    const eligibility = eligibilityFor(terms, presence.tiers);
    const held = profileFor(profile, presence.bankSlug);
    const evaluation = evaluateEligibility(eligibility, held, date);
    const match = classify(evaluation, profile, presence.bankSlug);
    if (match === 'ineligible' && !includeIneligible) return [];
    const { matched, requiresModo } = matchingInstruments(
      eligibility,
      held,
      date,
      match,
    );
    return [
      {
        [brandKey]: campaign.brandId ?? undefined,
        id: campaign.id,
        source: campaign.source,
        brandName: brand?.name ?? null,
        title: campaign.title,
        categories: campaign.categories,
        offers: terms.offers,
        capState: terms.capState,
        caps: terms.caps,
        minimumSpendMinor: terms.minimumSpendMinor,
        validity: terms.validity,
        nextDate: date,
        channels: terms.channels,
        where: terms.where,
        requiresModo,
        usableWith: usableCards(profile, presence.bankSlug, banks, matched),
        match,
        tierLabels: tierLabels(eligibility),
        variants: [],
        verifyUrl: campaign.verifyUrl,
        verifyHint: campaign.verifyHint,
        updatedAt: (
          campaign.detailFetchedAt ?? campaign.lastSeenAt
        ).toISOString(),
        eligibility,
        legalText: terms.legalText,
        warnings: terms.warnings,
      },
    ];
  });
}

export function rankResults(
  a: Pick<BenefitResult, 'offers' | 'capState' | 'caps' | 'title' | 'id'>,
  b: Pick<BenefitResult, 'offers' | 'capState' | 'caps' | 'title' | 'id'>,
): number {
  const percent = (item: typeof a) =>
    Math.max(
      0,
      ...item.offers.map((o) => (o.kind === 'percent' ? o.percentageBps : 0)),
    );
  const installments = (item: typeof a) =>
    Math.max(
      0,
      ...item.offers.map((o) => (o.kind === 'installments' ? o.count : 0)),
    );
  const cap = (item: typeof a) =>
    item.capState === 'none'
      ? Infinity
      : item.capState === 'unknown'
        ? -1
        : Math.max(0, ...item.caps.map((c) => c.amountMinor ?? -1));
  return (
    percent(b) - percent(a) ||
    installments(b) - installments(a) ||
    (cap(a) === cap(b) ? 0 : cap(b) > cap(a) ? 1 : -1) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}

export function groupResults(items: Matched[]): BenefitResult[] {
  const groups = new Map<string, Matched[]>();
  for (const item of items) {
    const key = `${item[brandKey] ?? item.title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim()}:${item.validity.to}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()]
    .map((group) => {
      group.sort(
        (a, b) =>
          Number(a.match !== 'eligible') - Number(b.match !== 'eligible') ||
          rankResults(a, b),
      );
      const first = group[0]!;
      const same = group.filter(
        (i) =>
          i.id === first.id &&
          i.match === first.match &&
          JSON.stringify([
            i.offers,
            i.capState,
            i.caps,
            i.minimumSpendMinor,
            i.validity,
            i.channels,
            i.where,
            i.requiresModo,
          ]) ===
            JSON.stringify([
              first.offers,
              first.capState,
              first.caps,
              first.minimumSpendMinor,
              first.validity,
              first.channels,
              first.where,
              first.requiresModo,
            ]),
      );
      return {
        ...first,
        match: first.match as BenefitResult['match'],
        requiresModo: same.every((i) => i.requiresModo),
        usableWith: [
          ...new Map(
            same
              .flatMap((i) => i.usableWith)
              .map((u) => [
                `${u.bankSlug}:${u.card?.type}:${u.card?.network}`,
                u,
              ]),
          ).values(),
        ],
        variants: [
          ...new Map(
            group
              .filter((i) => i.id !== first.id)
              .map((i) => [
                i.id,
                { id: i.id, offers: i.offers, tierLabels: i.tierLabels },
              ]),
          ).values(),
        ],
      };
    })
    .sort(
      (a, b) =>
        Number(a.match !== 'eligible') - Number(b.match !== 'eligible') ||
        rankResults(a, b),
    );
}
