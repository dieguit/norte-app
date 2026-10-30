import type { BenefitRules, Requirement } from '@repo/shared-types';
import type { HeldInstrument } from '../eligibility';

export function referenceRules(
  eligibility: Requirement,
  overrides: Partial<BenefitRules> = {},
): BenefitRules {
  return {
    eligibility,
    eligibilityCompleteness: 'complete',
    unresolved: [],
    offer: { type: 'cashback', percentageBps: 1000 },
    currency: 'ARS',
    minimumSpendMinor: 0,
    capState: 'none',
    caps: [],
    validity: {
      from: '2026-09-28',
      to: '2026-10-31',
      weekdays: null,
      monthDays: null,
    },
    channels: { allowed: [], excluded: [] },
    requiredActions: [],
    stackable: 'unknown',
    recurrence: 'campaign',
    ...overrides,
  };
}
export const instruments = {
  mastercard: {
    slug: 'bank-mastercard',
    label: 'Mastercard',
    providerSlug: 'bank',
    network: 'mastercard',
    type: 'credit',
    issuerCountry: 'AR',
    evidenceUrl: 'https://example.com/card',
  },
  debit: {
    slug: 'bank-mastercard-debit',
    label: 'Mastercard débito',
    providerSlug: 'bank',
    network: 'mastercard',
    type: 'debit',
    issuerCountry: 'AR',
    evidenceUrl: 'https://example.com/debit',
  },
  selecta: {
    slug: 'macro-signature',
    label: 'Selecta',
    providerSlug: 'macro',
    network: 'visa',
    type: 'credit',
    issuerCountry: 'AR',
    segment: 'selecta',
    productLevel: 'signature',
    evidenceUrl: 'https://www.macro.com.ar/selecta/gourmet',
  },
  modo: {
    slug: 'modo',
    label: 'MODO',
    providerSlug: 'modo',
    type: 'membership',
    evidenceUrl: 'https://www.modo.com.ar',
  },
  nx: {
    slug: 'nx-credit',
    label: 'NX',
    providerSlug: 'naranjax',
    type: 'credit',
    issuerCountry: 'AR',
    evidenceUrl: 'https://www.naranjax.com',
  },
  turbo: {
    slug: 'naranjax-plan-turbo',
    label: 'Turbo',
    providerSlug: 'naranjax',
    type: 'membership',
    evidenceUrl: 'https://www.naranjax.com/plan-turbo',
  },
  epico: {
    slug: 'naranjax-plan-epico',
    label: 'Épico',
    providerSlug: 'naranjax',
    type: 'membership',
    evidenceUrl: 'https://www.naranjax.com/plan-epico',
  },
  plus: {
    slug: 'pedidosya-plus',
    label: 'Plus',
    providerSlug: 'pedidosya',
    type: 'membership',
    evidenceUrl: 'https://www.pedidosya.com.ar',
  },
  cabal: {
    slug: 'bank-cabal',
    label: 'Cabal',
    providerSlug: 'bank',
    type: 'credit',
    issuerCountry: 'AR',
    network: 'cabal',
    evidenceUrl: 'https://www.cabal.coop',
  },
} satisfies Record<string, HeldInstrument>;

export const ypf = referenceRules(
  {
    card: {
      network: 'mastercard',
      types: ['credit', 'debit', 'prepaid'],
      issuerCountries: ['AR'],
    },
  },
  {
    minimumSpendMinor: 3500000,
    capState: 'known',
    caps: [{ amountMinor: 600000, period: 'week', scope: 'card' }],
    validity: {
      from: '2026-09-28',
      to: '2026-10-31',
      weekdays: [1],
      monthDays: null,
    },
    channels: { allowed: ['app-ypf'], excluded: [] },
  },
);
export const gourmet = referenceRules(
  {
    allOf: [
      {
        anyOf: [
          {
            card: {
              issuerProviderSlugs: ['macro'],
              network: 'visa',
              productLevels: ['signature'],
              segments: ['selecta'],
            },
          },
          {
            card: {
              issuerProviderSlugs: ['macro'],
              network: 'mastercard',
              productLevels: ['black'],
              segments: ['selecta'],
            },
          },
          {
            card: {
              issuerProviderSlugs: ['macro'],
              network: 'amex',
              productLevels: ['icon'],
              segments: ['selecta'],
            },
          },
        ],
      },
      { membership: { instrumentSlug: 'modo' } },
    ],
  },
  {
    offer: { type: 'cashback', percentageBps: 3000 },
    capState: 'unknown',
    caps: [{ amountMinor: null, period: 'month', scope: 'account' }],
    validity: {
      from: '2026-03-01',
      to: '2027-03-31',
      weekdays: null,
      monthDays: null,
    },
    channels: { allowed: ['app-macro', 'modo'], excluded: [] },
  },
);
const nxRules = (plan: string, bps: number, cap: number) =>
  referenceRules(
    {
      allOf: [
        {
          card: {
            issuerProviderSlugs: ['naranjax'],
            types: ['credit', 'debit'],
          },
        },
        { membership: { instrumentSlug: plan } },
      ],
    },
    {
      offer: { type: 'cashback', percentageBps: bps },
      capState: 'known',
      caps: [{ amountMinor: cap, period: 'week', scope: null }],
      validity: { from: null, to: null, weekdays: [2], monthDays: null },
    },
  );
export const turbo = nxRules('naranjax-plan-turbo', 2500, 950000);
export const epico = nxRules('naranjax-plan-epico', 3000, 1200000);
export const mascotas = referenceRules(
  {
    allOf: [
      { card: { network: 'mastercard', types: ['credit'] } },
      { membership: { instrumentSlug: 'pedidosya-plus' } },
    ],
  },
  {
    offer: { type: 'discount', percentageBps: 2500 },
    capState: 'known',
    caps: [{ amountMinor: 1500000, period: 'month', scope: 'card' }],
    validity: {
      from: '2026-09-12',
      to: '2026-10-31',
      weekdays: [6],
      monthDays: null,
    },
    channels: { allowed: ['online'], excluded: [] },
    stackable: 'yes',
  },
);
export const abc = referenceRules(
  { card: { network: 'cabal', types: ['credit'] } },
  {
    eligibilityCompleteness: 'incomplete',
    unresolved: ['Lista de emisores participantes pendiente'],
    offer: { type: 'discount', percentageBps: 2000 },
    capState: 'known',
    caps: [{ amountMinor: 1000000, period: 'month', scope: 'account' }],
    validity: {
      from: '2026-03-05',
      to: '2026-11-30',
      weekdays: null,
      monthDays: null,
    },
    channels: { allowed: [], excluded: ['wallet', 'intermediary'] },
  },
);
