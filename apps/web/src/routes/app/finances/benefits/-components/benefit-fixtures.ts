import type {
  BenefitBankList,
  BenefitDetail,
  BenefitProfile,
  BenefitResult,
  BenefitSearchResult,
} from "@repo/shared-types";

export const banks: BenefitBankList["banks"] = [
  {
    slug: "galicia",
    name: "Galicia",
    coverage: "modo_and_own",
    ownCatalogScope: null,
    tiers: [{ code: "eminent", label: "Éminent" }],
    stale: false,
  },
  {
    slug: "macro",
    name: "Macro",
    coverage: "modo_and_own",
    ownCatalogScope: null,
    tiers: [
      { code: "selecta", label: "Selecta" },
      { code: "platinum", label: "Platinum" },
    ],
    stale: true,
  },
  {
    slug: "bbva",
    name: "BBVA",
    coverage: "modo",
    ownCatalogScope: null,
    tiers: [],
    stale: false,
  },
];

export const profile: BenefitProfile = {
  banks: [
    {
      slug: "galicia",
      tier: "eminent",
      cards: [{ type: "credit", network: "visa" }],
    },
    { slug: "bbva", tier: null, cards: [] },
  ],
  usesModo: false,
  categories: ["supermercados", "gastronomia"],
  enabled: true,
};

export const emptyProfile: BenefitProfile = {
  banks: [],
  usesModo: false,
  categories: [],
  enabled: false,
};

export const coto: BenefitResult = {
  id: "11111111-1111-4111-8111-111111111111",
  source: "playdigital",
  brandName: "Coto",
  title: "20% de reintegro los jueves",
  categories: ["supermercados"],
  offers: [{ kind: "percent", percentageBps: 2000, mode: "cashback" }],
  capState: "known",
  caps: [{ amountMinor: 1_500_000, period: "month", scope: "card" }],
  minimumSpendMinor: null,
  validity: { from: "2026-10-01", to: "2026-11-30", weekdays: [4] },
  nextDate: "2026-10-29",
  channels: ["modo"],
  where: null,
  requiresModo: true,
  usableWith: [
    {
      bankSlug: "galicia",
      bankName: "Galicia",
      card: { type: "credit", network: "visa" },
    },
  ],
  match: "eligible",
  tierLabels: [],
  variants: [],
  verifyUrl: "https://www.modo.com.ar/promos/coto-jueves",
  verifyHint: null,
  updatedAt: "2026-10-31T06:00:00.000Z",
};

export const jumbo: BenefitResult = {
  ...coto,
  id: "22222222-2222-4222-8222-222222222222",
  source: "galicia",
  brandName: "Jumbo",
  title: "20% de ahorro y hasta 6 cuotas",
  offers: [
    { kind: "percent", percentageBps: 2000, mode: "unspecified" },
    { kind: "installments", count: 6, upTo: true },
  ],
  capState: "unknown",
  caps: [],
  requiresModo: false,
  channels: ["instore"],
  match: "needs_tier",
  tierLabels: ["Éminent"],
  variants: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      offers: [{ kind: "percent", percentageBps: 2000, mode: "unspecified" }],
      tierLabels: ["Éminent"],
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      offers: [{ kind: "percent", percentageBps: 1000, mode: "unspecified" }],
      tierLabels: [],
    },
  ],
  verifyUrl: "https://www.galicia.ar/personas/buscador-de-promociones",
  verifyHint: "Buscá «Jumbo»",
};

export const searchResult: BenefitSearchResult = {
  profileConfigured: true,
  items: [coto, jumbo],
  total: 3,
  page: 1,
  pageSize: 2,
  countsByCategory: { supermercados: 3, gastronomia: 0 },
  staleBanks: ["macro"],
};

export const detail: BenefitDetail = {
  ...jumbo,
  eligibility: {
    allOf: [
      {
        card: {
          issuerProviderSlugs: ["galicia"],
          types: ["credit"],
          network: "visa",
        },
      },
      {
        anyOf: [
          { membership: { instrumentSlug: "modo" } },
          {
            providerFact: {
              providerSlug: "galicia",
              key: "salaryAccount",
              values: [true],
            },
          },
        ],
      },
    ],
  },
  legalText: "Promoción válida en sucursales adheridas.",
  warnings: ["Tope y mínimo sin confirmar en Galicia"],
};
