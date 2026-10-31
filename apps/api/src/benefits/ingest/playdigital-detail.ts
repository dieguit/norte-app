import { z } from 'zod';
import {
  CampaignTermsSchema,
  type CampaignOffer,
  type Requirement,
  type BenefitCap,
  type CardSelector,
  PurchaseConditionSchema,
  type PurchaseCondition,
} from '@repo/shared-types';
import type { BankRef } from './types';
import { BANK_TIERS } from './tiers';

const amount = z.number().finite().nonnegative();
const installment = z
  .object({
    type: z.string(),
    number: z.number().int().min(1).max(60),
    coefficient: z.string(),
    annual_nominal_rate: z.string(),
    total_financial_cost: z.string(),
  })
  .passthrough();
const requirements = z
  .object({
    banks: z.object({ list: z.array(z.string().nullable()) }).passthrough(),
    amount_range: z
      .object({ min: amount, max: amount.nullish() })
      .passthrough(),
  })
  .passthrough();
const offer = z
  .object({
    requirements,
    outcomes: z
      .object({
        cashback: z
          .object({
            amount: amount.nullish(),
            amount_type: z.string(),
            cashback_mode: z.string(),
          })
          .passthrough()
          .nullish(),
        financing: z
          .object({ installments: z.array(installment.nullable()) })
          .passthrough()
          .nullish(),
      })
      .passthrough(),
    segmentations: z.record(z.string(), z.unknown()).nullish(),
    limits: z
      .object({
        period_cap: z
          .object({
            reset_by: z.string(),
            aggregate_by: z.string(),
            amount_by_period: amount,
            amount_of_transactions_by_period: amount,
          })
          .passthrough()
          .nullish()
          .catch({
            reset_by: '',
            aggregate_by: '',
            amount_by_period: 0,
            amount_of_transactions_by_period: 0,
          }),
        transaction_cap: z
          .object({ amount_by_transaction: amount })
          .passthrough()
          .nullish()
          .catch({ amount_by_transaction: -1 }),
      })
      .passthrough()
      .nullish()
      .catch({
        period_cap: {
          reset_by: '',
          aggregate_by: '',
          amount_by_period: 0,
          amount_of_transactions_by_period: 0,
        },
      }),
    offer_caps: z.array(z.unknown()).nullish().catch([null]),
    offer_transaction_cap: amount.nullish().catch(-1),
  })
  .passthrough();

export const playdigitalDetailSchema = z
  .object({
    id: z.string().min(1),
    status: z.string(),
    real_status: z.string(),
    deleted_at: z.iso.datetime().nullable(),
    conditions: z
      .object({
        schedule: z
          .object({
            start_date: z.iso.date(),
            stop_date: z.iso.date(),
            days_of_week: z.array(z.string().nullable()),
            daily_start_time: z.string(),
            daily_stop_time: z.string(),
          })
          .passthrough(),
        payment_flow: z
          .object({ flows: z.array(z.string().nullable()) })
          .passthrough(),
        payment_methods: z
          .object({
            methods: z.array(
              z
                .object({ type: z.string(), issuer: z.string() })
                .passthrough()
                .nullable(),
            ),
          })
          .passthrough(),
        acquirers: z
          .object({ list: z.array(z.string()), segmentation_mode: z.string() })
          .passthrough()
          .nullish(),
        exclusiveness: z.string().nullish(),
        exclusiveness_source: z.array(z.string()).nullish(),
        has_differential_amount: z.boolean().nullish(),
      })
      .passthrough(),
    offers: z.array(offer),
    terms_and_conditions: z.string().nullish(),
    coupon: z.unknown(),
    details: z
      .object({
        name: z.string().nullish(),
        faq: z.string().nullish(),
        applicability_description: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
    card: z
      .object({
        benefit: z.string().nullish(),
        validity_place: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export function detailError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

function readableLegal(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, value: string) => {
      const code =
        value[0].toLowerCase() === 'x'
          ? parseInt(value.slice(1), 16)
          : Number(value);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function minor(value: number): number {
  const [whole, fraction = ''] = String(value).split('.');
  if (!/^\d+$/.test(whole) || fraction.length > 2)
    throw new Error('unsupported monetary precision');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('unsafe monetary amount');
  return result;
}

type Detail = z.infer<typeof playdigitalDetailSchema>;
type Offer = z.infer<typeof offer>;
type Schedule = Detail['conditions']['schedule'];

function requireActiveDetail(d: Detail) {
  if (d.status !== 'active')
    throw new Error(`unsupported benefit status: ${d.status}`);
  if (d.real_status !== 'RUNNING')
    throw new Error(`benefit is not running: ${d.real_status}`);
  if (d.deleted_at !== null) throw new Error('benefit is deleted');
}

function applicableOffer(d: Detail, bank: BankRef) {
  const candidates = d.offers.filter((o) =>
    o.requirements.banks.list.includes(bank.playdigitalId ?? ''),
  );
  // A single terms object cannot correlate different offer branches with their own caps and eligibility.
  if (candidates.length !== 1)
    throw new Error(
      candidates.length
        ? 'multiple bank offer variants cannot be represented'
        : 'no offer for current bank',
    );
  const o = candidates[0];
  return o;
}

function audienceTiers(o: Offer, bank: BankRef) {
  const audiences = o.segmentations?.audiences;
  if (!Array.isArray(audiences)) return { codes: [], unknown: [] };
  const known = new Set(BANK_TIERS.macro.map((tier) => tier.code));
  const codes: string[] = [];
  const unknown: string[] = [];
  for (const audience of audiences) {
    const match =
      typeof audience === 'string'
        ? /^selecta-nivel-(\d+)$/.exec(audience)
        : null;
    const code = `selecta-${match?.[1]}`;
    if (bank.slug === 'macro' && known.has(code)) codes.push(code);
    else unknown.push(String(audience));
  }
  return { codes: unknown.length ? [] : [...new Set(codes)], unknown };
}

export function playdigitalAudiences(raw: unknown, bank: BankRef) {
  const d = playdigitalDetailSchema.parse(raw);
  return audienceTiers(applicableOffer(d, bank), bank);
}

function paymentPairs(d: Detail, bank: BankRef): Requirement[] {
  const networks: Record<string, CardSelector['network']> = {
    visa: 'visa',
    master: 'mastercard',
    mastercard: 'mastercard',
    american_express: 'amex',
    amex: 'amex',
    cabal: 'cabal',
  };
  const pairs: Requirement[] = [];
  for (const method of d.conditions.payment_methods.methods) {
    if (!method) continue;
    const type =
      method.type === 'credit_card'
        ? 'credit'
        : method.type === 'debit_card'
          ? 'debit'
          : null;
    const network = networks[method.issuer];
    if (type && network)
      pairs.push({
        card: { issuerProviderSlugs: [bank.slug], network, types: [type] },
      });
  }
  if (!pairs.length) throw new Error('no supported cards');
  return pairs;
}

function locationCondition(d: Detail, o: Offer): PurchaseCondition[] {
  const whitelist = o.segmentations?.whitelist;
  if (
    !Array.isArray(whitelist) ||
    !whitelist.some(
      (v) => typeof v === 'string' && (v.startsWith('store_') || v === 'mcc'),
    )
  )
    return [];
  return [
    {
      kind: 'participating_locations',
      instruction:
        d.card?.validity_place?.slice(0, 500) || 'En locales adheridos',
      evidence: 'offers[].segmentations.whitelist',
    },
  ];
}

function acquirerCondition(d: Detail): PurchaseCondition[] {
  const acquirers = d.conditions.acquirers;
  const mode =
    acquirers?.segmentation_mode === 'by_whitelist'
      ? 'include'
      : acquirers?.segmentation_mode === 'by_blacklist'
        ? 'exclude'
        : null;
  if (!mode || !acquirers?.list.length) return [];
  const parsed = PurchaseConditionSchema.safeParse({
    kind: 'acquirer',
    mode,
    names: acquirers.list,
    evidence: 'conditions.acquirers',
  });
  return parsed.success ? [parsed.data] : [];
}

function couponCondition(d: Detail): PurchaseCondition[] {
  if (!d.coupon || typeof d.coupon !== 'object' || Array.isArray(d.coupon))
    return [];
  const coupon = d.coupon as Record<string, unknown>;
  if (typeof coupon.code !== 'string' || !coupon.code.trim()) return [];
  const parsed = PurchaseConditionSchema.safeParse({
    kind: 'coupon',
    code: coupon.code,
    instruction:
      typeof coupon.instruction === 'string' && coupon.instruction.trim()
        ? coupon.instruction
        : 'Usá el código',
    evidence: 'coupon',
  });
  return parsed.success ? [parsed.data] : [];
}

function dailyTimeCondition(d: Detail): PurchaseCondition[] {
  const schedule = d.conditions.schedule;
  if (
    schedule.daily_start_time === '00:00:00' &&
    schedule.daily_stop_time === '23:59:59'
  )
    return [];
  const parsed = PurchaseConditionSchema.safeParse({
    kind: 'daily_time',
    from: schedule.daily_start_time,
    to: schedule.daily_stop_time,
    timezone: 'America/Argentina/Buenos_Aires',
    evidence: 'conditions.schedule',
  });
  return parsed.success ? [parsed.data] : [];
}

function purchaseConditions(d: Detail, o: Offer): PurchaseCondition[] {
  return [
    ...locationCondition(d, o),
    ...acquirerCondition(d),
    ...couponCondition(d),
    ...dailyTimeCondition(d),
  ];
}

function cashbackOffer(o: Offer): CampaignOffer[] {
  const cashback = o.outcomes.cashback;
  if (
    cashback?.amount_type !== 'percent' ||
    cashback.amount == null ||
    cashback.amount <= 0
  )
    return [];
  const mode =
    cashback.cashback_mode === 'descuento_en_pdv'
      ? 'discount'
      : ['cashback_bancario', 'cashback_por_regla', 'cashback_link'].includes(
            cashback.cashback_mode,
          )
        ? 'cashback'
        : 'unspecified';
  return [{ kind: 'percent', percentageBps: minor(cashback.amount), mode }];
}

function financingOffer(o: Offer): CampaignOffer[] {
  const counts = (o.outcomes.financing?.installments ?? []).flatMap((i) =>
    i &&
    i.number >= 2 &&
    i.type === 'sin_interes' &&
    [i.coefficient, i.annual_nominal_rate, i.total_financial_cost].every((v) =>
      /^0(?:\.0+)?$/.test(v),
    )
      ? [i.number]
      : [],
  );
  return counts.length
    ? [
        {
          kind: 'installments',
          count: Math.max(...counts),
          upTo: counts.length > 1,
        },
      ]
    : [];
}

function offerValues(o: Offer): CampaignOffer[] {
  const offers = [...cashbackOffer(o), ...financingOffer(o)];
  if (!offers.length) throw new Error('no offer value');
  return offers;
}

function periodCap(o: Offer): BenefitCap[] | null {
  const period = o.limits?.period_cap;
  if (!period) return [];
  const reset = {
    day: 'day',
    week: 'week',
    month: 'month',
    promo: 'campaign',
  } as const;
  const scope = {
    user: 'person',
    bank: 'bank',
    card: 'card',
    account: 'account',
  } as const;
  const capPeriod = reset[period.reset_by as keyof typeof reset];
  const capScope = scope[period.aggregate_by as keyof typeof scope];
  if (!capPeriod || !capScope || period.amount_of_transactions_by_period > 0)
    return null;
  return period.amount_by_period > 0
    ? [
        {
          amountMinor: minor(period.amount_by_period),
          period: capPeriod,
          scope: capScope,
        },
      ]
    : [];
}

function transactionCap(o: Offer): BenefitCap[] | null {
  const values = [
    o.limits?.transaction_cap?.amount_by_transaction,
    o.offer_transaction_cap,
  ].filter((value): value is number => value != null);
  if (values.includes(-1) || new Set(values).size > 1) return null;
  const value = values[0];
  return value != null && value > 0
    ? [{ amountMinor: minor(value), period: 'transaction', scope: null }]
    : [];
}

function offerCaps(o: Offer): BenefitCap[] {
  const period = periodCap(o);
  const transaction = transactionCap(o);
  return o.offer_caps?.length || !period || !transaction
    ? []
    : [...period, ...transaction];
}

function validity(schedule: Schedule) {
  const names = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const days = [
    ...new Set(
      schedule.days_of_week.flatMap((day) => {
        const n = day === null ? -1 : names.indexOf(day);
        return n < 0 ? [] : [n];
      }),
    ),
  ];
  return {
    from: schedule.start_date,
    to: schedule.stop_date,
    weekdays: days.length && days.length !== 7 ? days : null,
  };
}

export function mapPlaydigitalDetail(raw: unknown, bank: BankRef) {
  const parsed = playdigitalDetailSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(`invalid v2 detail: ${detailError(parsed.error)}`);
  const d = parsed.data;
  requireActiveDetail(d);
  const o = applicableOffer(d, bank);
  const tiers = audienceTiers(o, bank).codes;
  const allOf: Requirement[] = [
    { anyOf: paymentPairs(d, bank) },
    { membership: { instrumentSlug: 'modo' } },
  ];
  if (tiers.length)
    allOf.push({
      providerFact: { providerSlug: bank.slug, key: 'tier', values: tiers },
    });
  const caps = offerCaps(o);
  const channels = new Set<string>(['modo']);
  for (const flow of d.conditions.payment_flow.flows) {
    if (flow === 'instore_nfc') {
      channels.add('instore');
      channels.add('nfc');
    } else if (
      flow &&
      [
        'online',
        'instore',
        'qr',
        'nfc',
        'modo',
        'physical_card',
        'physical-card',
      ].includes(flow)
    )
      channels.add(flow);
  }
  return CampaignTermsSchema.parse({
    offers: offerValues(o),
    eligibility: { allOf },
    eligibilityCompleteness: 'complete',
    unresolved: [],
    purchaseConditions: purchaseConditions(d, o),
    capState: caps.length ? 'known' : 'unknown',
    caps,
    minimumSpendMinor: minor(o.requirements.amount_range.min),
    validity: validity(d.conditions.schedule),
    channels: [...channels],
    where: d.card?.validity_place?.slice(0, 500) || null,
    legalText:
      readableLegal(d.terms_and_conditions ?? '').slice(0, 20000) || null,
    warnings: caps.length ? [] : ['cap semantics unconfirmed'],
  });
}
