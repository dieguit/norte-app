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
          .nullish(),
        transaction_cap: z
          .object({ amount_by_transaction: amount })
          .passthrough()
          .nullish(),
      })
      .passthrough()
      .nullish(),
    offer_caps: z.array(z.unknown()).nullish(),
    offer_transaction_cap: amount.nullish(),
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

export function readableLegal(html: string): string {
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

function unknownKeys(
  value: Record<string, unknown>,
  known: string[],
  path: string,
  unresolved: string[],
) {
  for (const [key, item] of Object.entries(value))
    if (!known.includes(key) && item !== undefined)
      unresolved.push(`unsupported ${path}.${key}`);
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

function checkEnvelope(d: Detail, unresolved: string[]) {
  unknownKeys(
    d,
    [
      'id',
      'name',
      'description',
      'type',
      'reward_type',
      'scope',
      'status',
      'real_status',
      'is_engine_active',
      'created_at',
      'updated_at',
      'deleted_at',
      'short_description',
      'publication_description',
      'slug',
      'display_start_date',
      'display_stop_date',
      'search_tags',
      'conditions',
      'offers',
      'debit_list',
      'credit_list',
      'terms_and_conditions',
      'terms_and_conditions_url',
      'coupon',
      'card',
      'details',
    ],
    'benefit',
    unresolved,
  );
  unknownKeys(
    d.conditions,
    [
      'schedule',
      'payment_flow',
      'payment_methods',
      'acquirers',
      'exclusiveness',
      'exclusiveness_source',
      'has_differential_amount',
    ],
    'conditions',
    unresolved,
  );
  unknownKeys(
    d.conditions.schedule,
    [
      'start_date',
      'stop_date',
      'days_of_week',
      'daily_start_time',
      'daily_stop_time',
    ],
    'schedule',
    unresolved,
  );
  unknownKeys(d.conditions.payment_flow, ['flows'], 'payment_flow', unresolved);
  unknownKeys(
    d.conditions.payment_methods,
    ['methods'],
    'payment_methods',
    unresolved,
  );
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

function checkOfferRestrictions(
  o: Offer,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  unknownKeys(
    o,
    [
      'id',
      'benefit_id',
      'name',
      'priority',
      'segmentations',
      'requirements',
      'outcomes',
      'limits',
      'categories',
      'sub_categories',
      'preselected',
      'created_at',
      'updated_at',
      'deleted_at',
      'offer_caps',
      'offer_transaction_cap',
    ],
    'offer',
    unresolved,
  );
  if (o.requirements.banks.list.includes(null))
    unresolved.push('unknown bank restriction');
  unknownKeys(
    o.requirements,
    ['banks', 'amount_range'],
    'requirements',
    unresolved,
  );
  unknownKeys(o.requirements.banks, ['list'], 'banks', unresolved);
  unknownKeys(
    o.requirements.amount_range,
    ['min', 'max'],
    'amount_range',
    unresolved,
  );
  if (o.requirements.amount_range.max != null)
    unresolved.push('maximum purchase amount restriction');
  for (const [key, value] of Object.entries(o.segmentations ?? {}))
    if (
      key !== 'categories' &&
      value !== undefined &&
      (!Array.isArray(value) || value.length)
    )
      checkSegmentation(key, value, unresolved, conditions);
}

function checkSegmentation(
  key: string,
  value: unknown,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  const merchantKeys = [
    'store_cuit',
    'store_terminal_id',
    'store_financing_online_id',
  ];
  if (
    key === 'whitelist' &&
    Array.isArray(value) &&
    value.every((entry) => merchantKeys.includes(entry))
  ) {
    conditions.push({
      kind: 'participating_locations',
      instruction:
        'Consultá los locales adheridos en la página oficial de la promoción.',
      evidence: 'offers[].segmentations.whitelist',
    });
    return;
  }
  unresolved.push(`offer segmentation: ${key}`);
}

function checkConditionRestrictions(
  d: Detail,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  if (d.conditions.acquirers)
    unknownKeys(
      d.conditions.acquirers,
      ['list', 'segmentation_mode'],
      'acquirers',
      unresolved,
    );
  acquirerCondition(d.conditions.acquirers, unresolved, conditions);
  if (d.conditions.exclusiveness && d.conditions.exclusiveness !== 'all')
    unresolved.push('exclusive audience restriction');
  if (d.conditions.has_differential_amount)
    unresolved.push('differential amount restriction');
}

function acquirerCondition(
  acquirers: Detail['conditions']['acquirers'],
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  if (!acquirers) return;
  if (
    acquirers.segmentation_mode === 'no_segmentation' &&
    !acquirers.list.length
  )
    return;
  const modes = { by_whitelist: 'include', by_blacklist: 'exclude' } as const;
  const mode = modes[acquirers.segmentation_mode as keyof typeof modes];
  if (!mode || !acquirers.list.length) {
    unresolved.push('acquirer restriction');
    return;
  }
  conditions.push({
    kind: 'acquirer',
    mode,
    names: acquirers.list,
    evidence: 'conditions.acquirers',
  });
}

function paymentPairs(d: Detail, bank: BankRef, unresolved: string[]) {
  const pairs: Requirement[] = [];
  for (const method of d.conditions.payment_methods.methods) {
    const pair = paymentPair(method, bank.slug, unresolved);
    if (pair) pairs.push(pair);
  }
  if (!pairs.length) throw new Error('missing supported card networks');
  return pairs;
}

function paymentPair(
  method: Detail['conditions']['payment_methods']['methods'][number],
  bankSlug: string,
  unresolved: string[],
): Requirement | null {
  const networks: Record<string, CardSelector['network']> = {
    visa: 'visa',
    master: 'mastercard',
    mastercard: 'mastercard',
    american_express: 'amex',
    amex: 'amex',
    cabal: 'cabal',
  };
  if (!method) {
    unresolved.push('null payment method');
    return null;
  }
  unknownKeys(method, ['type', 'issuer'], 'payment_method', unresolved);
  const type =
    method.type === 'credit_card'
      ? 'credit'
      : method.type === 'debit_card'
        ? 'debit'
        : null;
  const network = networks[method.issuer];
  if (
    type &&
    [
      'dinners_club',
      'maestro',
      'confiable',
      'naranja',
      'patagonia_365',
      'tarjeta_sol',
    ].includes(method.issuer)
  )
    return null;
  if (!type || !network) {
    unresolved.push(
      `unsupported payment method: ${method.type}/${method.issuer}`,
    );
    return null;
  }
  return { card: { issuerProviderSlugs: [bankSlug], network, types: [type] } };
}

function legalEvidence(d: Detail) {
  const legal = readableLegal(d.terms_and_conditions ?? '');
  const evidence = readableLegal(
    `${legal} ${d.details?.faq ?? ''} ${d.details?.name ?? ''} ${d.card?.benefit ?? ''}`,
  ).toLowerCase();
  return { legal, evidence };
}

function eligibility(
  d: Detail,
  bank: BankRef,
  tiers: string[] | null,
  evidence: string,
  unresolved: string[],
) {
  const pairs = paymentPairs(d, bank, unresolved);
  const allOf: Requirement[] = [{ anyOf: pairs }];
  if (
    /\bmodo\b/.test(evidence) ||
    d.conditions.exclusiveness_source?.includes('modo')
  )
    allOf.push({ membership: { instrumentSlug: 'modo' } });
  if (tiers)
    allOf.push({
      providerFact: { providerSlug: bank.slug, key: 'tier', values: tiers },
    });
  return { allOf };
}

function checkLegalRestrictions(
  d: Detail,
  evidence: string,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  const couponConfirmed = couponCondition(d.coupon, unresolved, conditions);
  if (!couponConfirmed && /cup[oó]n|c[oó]digo promocional/.test(evidence))
    unresolved.push('coupon restriction');
  legalPurchaseConditions(d, unresolved, conditions);
}

function couponCondition(
  coupon: unknown,
  unresolved: string[],
  conditions: PurchaseCondition[],
): boolean {
  if (coupon == null) return false;
  if (typeof coupon !== 'object' || Array.isArray(coupon)) {
    unresolved.push('unknown coupon shape');
    return false;
  }
  if (
    Object.keys(coupon).some((key) => !['code', 'instruction'].includes(key))
  ) {
    unresolved.push('unknown coupon shape');
    return false;
  }
  const parsed = PurchaseConditionSchema.safeParse({
    ...coupon,
    kind: 'coupon',
    evidence: 'coupon',
  });
  if (!parsed.success) {
    unresolved.push('unknown coupon shape');
    return false;
  }
  conditions.push(parsed.data);
  return true;
}

function legalPurchaseConditions(
  d: Detail,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  const sources = [
    ['terms_and_conditions', d.terms_and_conditions],
    ['details.faq', d.details?.faq],
    ['details.name', d.details?.name],
    ['card.benefit', d.card?.benefit],
  ] as const;
  for (const [path, html] of sources) {
    for (const excerpt of readableLegal(html ?? '').split(/(?<=[.!?])\s+/)) {
      classifyLegalExcerpt(excerpt, path, unresolved, conditions);
    }
  }
  boundLegalConditions(conditions, unresolved);
}

function boundLegalConditions(
  conditions: PurchaseCondition[],
  unresolved: string[],
) {
  const legal = conditions.filter(
    (condition) => condition.kind === 'legal_purchase',
  );
  if (
    conditions.length <= 20 &&
    legal.every((condition) => condition.text.length <= 2000)
  )
    return;
  const other = conditions.filter(
    (condition) => condition.kind !== 'legal_purchase',
  );
  const merged: PurchaseCondition[] = [];
  for (const path of new Set(legal.map((condition) => condition.evidence))) {
    const sentences = legal
      .filter((condition) => condition.evidence === path)
      .map((condition) => condition.text);
    const text = mergeLegalSentences(sentences, unresolved);
    if (text) merged.push({ kind: 'legal_purchase', text, evidence: path });
  }
  if (other.length + merged.length > 20)
    unresolved.push('legal conditions too long');
  conditions.splice(
    0,
    conditions.length,
    ...other,
    ...merged.slice(0, Math.max(0, 20 - other.length)),
  );
}

function mergeLegalSentences(sentences: string[], unresolved: string[]) {
  const full = sentences.join(' ');
  if (full.length <= 2000) return full;
  let text = '';
  for (const sentence of sentences) {
    const next = text ? `${text} ${sentence}` : sentence;
    if (next.length > 1999) {
      if (!text) unresolved.push('legal conditions too long');
      return text ? `${text}…` : '';
    }
    text = next;
  }
  return text;
}

const legalProfileRestriction =
  /clientes? seleccionad[oa]s?|exclusiv[oa]s?\s+(?:para|de)|exclusivamente\s+para\s+(?:los\s+|las\s+)?(?:clientes?|titulares?|socios?|usuarios?)|(?:solo|s[oó]lo|[uú]nicamente)\s+(?:para|con|de|al?)\s+(?:(?:los|las)\s+)?(?:clientes?|titulares?|socios?|usuarios?|tarjetas|cr[eé]dito|d[eé]bito|prepaga)|\binvitad[oa]s?\b|\bsegmento\b|\bnivel\b|\bselecta\b|\b[eé]minent\b|\bblack\b(?!\s+(?:week|friday))|\b(?:platinum|signature|infinite)\b|plan sueldo|cobro de haberes|jubilad[oa]s?|jubilaci[oó]n|\bbin\b|tarjetas emitidas por|tarjetas?\s+(?:empresariales|de clientes)|\b(?:visa|mastercard|amex|cabal|naranja|banco|billetera|wallet)\s+exclusiv[oa]s?\b|cuenta\s+abierta\s+en|titulares?\s+de\s+(?:una\s+|la\s+)?cuenta|pose(?:er|an|a|en)\s+(?:una\s+)?cuenta|cuenta\s+(?:sueldo|haberes)|excluy(?:e|en)\s+(?:a\s+)?(?:los\s+|las\s+)?emplead[oa]s?|no\s+registr(?:en|ar|a|an)\s+(?:deuda|mora)|sin\s+deuda|situaci[oó]n\s+crediticia|antig[uü]edad\s+(?:como\s+cliente|en\s+(?:el\s+)?banco)|mayores?\s+de\s+(?:edad|\d+\s+a[nñ]os)|(?:tener|tengan)\s+(?:m[aá]s\s+de\s+)?\d+\s+a[nñ]os|residentes?\s+(?:en|de)|resid(?:ir|an|encia)\s+(?:en|de)|nuev[oa]s?\s+clientes?|clientes?\s+nuev[oa]s?|alta\s+(?:de|del)\s+(?:un\s+|una\s+|el\s+)?producto/i;

const standardAccount = /cuenta\s+abierta\s+en\s+la\s+entidad\s+adherida/i;
const standardDebt =
  /no\s+registren\s+deuda\s+o\s+mora\s+en\s+ning[uú]n\s+producto\s+de\s+la\s+entidad\s+adherida\s+con\s+la\s+que\s+realice\s+el\s+pago/i;

const standardAccountClause =
  /cuenta\s+abierta\s+en\s+la\s+entidad\s+adherida(?:\s+emisora\s+de\s+la\s+tarjeta(?:\s+mastercard)?\s+con\s+la\s+que\s+realicen\s+el\s+pago)?\s*,\s*y\s+que\s+dicha\s+cuenta\s+se\s+encuentre\s+asociada\s+a\s+modo\b/i;

function classifyLegalExcerpt(
  excerpt: string,
  path: string,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  const account = standardAccountClause.test(excerpt);
  const standard = account || standardDebt.test(excerpt);
  const profileText = (
    account ? excerpt.replace(standardAccount, '') : excerpt
  ).replace(standardDebt, '');
  if (
    legalProfileRestriction.test(profileText) ||
    /(?:no\s+aplica|excepto|excluy(?:e|en)|ni\s+(?:para|a))[^;.!?]*\btarjetas?\s+(?:de\s+)?(?:american\s+express|amex|cabal|visa|mastercard|master|naranja|maestro|diners|cr[eé]dito|d[eé]bito|prepagas?)\b/i.test(
      profileText,
    ) ||
    /exclusivamente\s+(?:con|para|de|a trav[eé]s de)\s+(?:(?:el|la)\s+)?(?:banco|billetera|wallet|visa|mastercard|amex|cabal|naranja)\b/i.test(
      profileText,
    )
  ) {
    unresolved.push('legal profile restriction');
    return;
  }
  if (standard) {
    conditions.push({ kind: 'legal_purchase', text: excerpt, evidence: path });
    return;
  }
  if (
    /^(?:no aplica (?:para|a) compras (?:online|por internet)|(?:v[aá]lido |aplica |[uú]nicamente |solo |s[oó]lo )?en (?:los )?locales adheridos)[.!]?$/i.test(
      excerpt,
    )
  ) {
    conditions.push({ kind: 'legal_purchase', text: excerpt, evidence: path });
    return;
  }
  const evidence = excerpt.toLowerCase();
  if (
    /anticipaci[oó]n|clase tarifaria|fechas aplica|\bdesde las\b|\bhasta las\b|no aplica|excepto|exclu[si]|[uú]nicamente|solo para|s[oó]lo para|sujeto a|siempre que/.test(
      evidence,
    )
  )
    conditions.push({ kind: 'legal_purchase', text: excerpt, evidence: path });
}

function cashbackMode(
  cashback: NonNullable<Offer['outcomes']['cashback']>,
  legal: string,
  evidence: string,
  unresolved: string[],
) {
  let mode: 'cashback' | 'discount' | 'unspecified' =
    cashback.cashback_mode === 'descuento_en_pdv'
      ? 'discount'
      : ['cashback_bancario', 'cashback_por_regla', 'cashback_link'].includes(
            cashback.cashback_mode,
          )
        ? 'cashback'
        : 'unspecified';
  if (mode === 'unspecified') unresolved.push('unknown cashback mode');
  if (
    mode === 'cashback' &&
    /descuento/.test(legal.toLowerCase()) &&
    /cup[oó]n|c[oó]digo promocional/.test(evidence)
  ) {
    mode = 'unspecified';
    unresolved.push('cashback versus legal discount contradiction');
  }
  return mode;
}

function cashbackOffers(
  o: Offer,
  legal: string,
  evidence: string,
  unresolved: string[],
) {
  const offers: CampaignOffer[] = [];
  unknownKeys(o.outcomes, ['cashback', 'financing'], 'outcomes', unresolved);
  const cashback = o.outcomes.cashback;
  if (cashback) {
    unknownKeys(
      cashback,
      ['amount', 'amount_type', 'cashback_mode'],
      'cashback',
      unresolved,
    );
    const mode = cashbackMode(cashback, legal, evidence, unresolved);
    if (
      cashback.amount_type === 'percent' &&
      cashback.amount != null &&
      cashback.amount > 0
    )
      offers.push({
        kind: 'percent',
        percentageBps: minor(cashback.amount),
        mode,
      });
    else unresolved.push('unsupported or missing cashback amount/type');
  }
  return offers;
}

function financingOffers(o: Offer, unresolved: string[]) {
  const offers: CampaignOffer[] = [];
  const financing = o.outcomes.financing;
  if (financing) {
    unknownKeys(financing, ['installments'], 'financing', unresolved);
    const counts: number[] = [];
    for (const i of financing.installments) {
      if (!i) {
        unresolved.push('null financing installment');
        continue;
      }
      unknownKeys(
        i,
        [
          'type',
          'number',
          'coefficient',
          'annual_nominal_rate',
          'total_financial_cost',
        ],
        'installment',
        unresolved,
      );
      if (
        i.type !== 'sin_interes' ||
        ![i.coefficient, i.annual_nominal_rate, i.total_financial_cost].every(
          (v) => /^0(?:\.0+)?$/.test(v),
        )
      )
        unresolved.push('unsupported financing costs');
      else if (i.number >= 2) counts.push(i.number);
    }
    if (counts.length)
      offers.push({
        kind: 'installments',
        count: Math.max(...counts),
        upTo: counts.length > 1,
      });
  }
  return offers;
}

function periodCaps(
  period: NonNullable<NonNullable<Offer['limits']>['period_cap']>,
  unresolved: string[],
) {
  const caps: BenefitCap[] = [];
  unknownKeys(
    period,
    [
      'reset_by',
      'aggregate_by',
      'amount_by_period',
      'amount_of_transactions_by_period',
    ],
    'period_cap',
    unresolved,
  );
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
  if (!capPeriod || !capScope) unresolved.push('unsupported cap period/scope');
  else if (period.amount_by_period > 0)
    caps.push({
      amountMinor: minor(period.amount_by_period),
      period: capPeriod,
      scope: capScope,
    });
  if (period.amount_of_transactions_by_period > 0)
    unresolved.push('transaction count limit');
  return caps;
}

function transactionCapAmount(o: Offer, unresolved: string[]) {
  const transactionCap = o.limits?.transaction_cap;
  const transaction = transactionCap?.amount_by_transaction;
  if (transactionCap)
    unknownKeys(
      transactionCap,
      ['amount_by_transaction'],
      'transaction_cap',
      unresolved,
    );
  if (
    transaction != null &&
    o.offer_transaction_cap != null &&
    transaction !== o.offer_transaction_cap
  )
    unresolved.push('conflicting transaction caps');
  return transaction ?? o.offer_transaction_cap;
}

function transactionCaps(o: Offer, unresolved: string[]) {
  const caps: BenefitCap[] = [];
  const transactionAmount = transactionCapAmount(o, unresolved);
  if (transactionAmount != null && transactionAmount > 0)
    caps.push({
      amountMinor: minor(transactionAmount),
      period: 'transaction',
      scope: null,
    });
  return caps;
}

function offerCaps(o: Offer, unresolved: string[]) {
  const caps: BenefitCap[] = [];
  if (o.offer_caps?.length) unresolved.push('unsupported offer_caps');
  const limits = o.limits;
  if (limits)
    unknownKeys(
      limits,
      ['period_cap', 'transaction_cap'],
      'limits',
      unresolved,
    );
  const period = limits?.period_cap;
  if (period) caps.push(...periodCaps(period, unresolved));
  caps.push(...transactionCaps(o, unresolved));
  return caps;
}

function validity(
  schedule: Schedule,
  unresolved: string[],
  conditions: PurchaseCondition[],
) {
  if (
    schedule.daily_start_time !== '00:00:00' ||
    schedule.daily_stop_time !== '23:59:59'
  )
    conditions.push({
      kind: 'daily_time',
      from: schedule.daily_start_time,
      to: schedule.daily_stop_time,
      timezone: 'America/Argentina/Buenos_Aires',
      evidence: 'conditions.schedule',
    });
  const dayNames = [
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
        const n = day === null ? -1 : dayNames.indexOf(day);
        if (n < 0) {
          unresolved.push('unknown schedule weekday');
          return [];
        }
        return [n];
      }),
    ),
  ];
  if (!days.length) unresolved.push('missing schedule weekdays');
  return {
    from: schedule.start_date,
    to: schedule.stop_date,
    weekdays: days.length && days.length !== 7 ? days : null,
  };
}

function paymentChannels(
  d: Detail,
  requirements: Requirement,
  unresolved: string[],
) {
  const channels: string[] = [];
  for (const flow of d.conditions.payment_flow.flows) {
    if (flow === 'instore_nfc') channels.push('instore', 'nfc');
    else if (flow && ['online', 'instore', 'qr', 'nfc', 'modo'].includes(flow))
      channels.push(flow);
    else unresolved.push(`unsupported payment flow: ${flow}`);
  }
  if (
    'allOf' in requirements &&
    requirements.allOf.some((r) => 'membership' in r)
  )
    channels.push('modo');
  return [...new Set(channels)];
}

function displayTerms(d: Detail, legal: string) {
  return {
    where: d.card?.validity_place?.slice(0, 500) || null,
    legalText: legal.slice(0, 20000) || null,
  };
}

export function mapPlaydigitalDetail(
  raw: unknown,
  bank: BankRef,
  inherited: string[],
  tiers: string[] | null,
) {
  const parsed = playdigitalDetailSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(`invalid v2 detail: ${detailError(parsed.error)}`);
  const d = parsed.data;
  requireActiveDetail(d);
  const unresolved = [...inherited];
  const purchaseConditions: PurchaseCondition[] = [];
  checkEnvelope(d, unresolved);
  const o = applicableOffer(d, bank);
  checkOfferRestrictions(o, unresolved, purchaseConditions);
  checkConditionRestrictions(d, unresolved, purchaseConditions);
  const { legal, evidence } = legalEvidence(d);
  const requirements = eligibility(d, bank, tiers, evidence, unresolved);
  checkLegalRestrictions(d, evidence, unresolved, purchaseConditions);
  const offers = [
    ...cashbackOffers(o, legal, evidence, unresolved),
    ...financingOffers(o, unresolved),
  ];
  const caps = offerCaps(o, unresolved);
  const schedule = validity(
    d.conditions.schedule,
    unresolved,
    purchaseConditions,
  );
  const channels = paymentChannels(d, requirements, unresolved);
  return CampaignTermsSchema.parse({
    offers,
    eligibility: requirements,
    eligibilityCompleteness: unresolved.length ? 'incomplete' : 'complete',
    unresolved: [...new Set(unresolved)].slice(0, 10),
    purchaseConditions,
    capState: caps.length ? 'known' : 'unknown',
    caps,
    minimumSpendMinor: minor(o.requirements.amount_range.min),
    validity: schedule,
    channels,
    ...displayTerms(d, legal),
    warnings: caps.length ? [] : ['cap semantics unconfirmed'],
  });
}
