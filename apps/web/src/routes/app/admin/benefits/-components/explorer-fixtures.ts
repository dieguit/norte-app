import type {
  CampaignTerms,
  ExplorerBrandList,
  ExplorerCampaign,
  ExplorerCampaignDetail,
  ExplorerMappingList,
  ExplorerOverview,
} from "@repo/shared-types";

const galiciaTerms: CampaignTerms = {
  offers: [
    { kind: "percent", percentageBps: 2000, mode: "unspecified" },
    { kind: "installments", count: 18, upTo: true },
  ],
  eligibility: {
    anyOf: [
      {
        card: {
          issuerProviderSlugs: ["galicia"],
          types: ["credit"],
          segments: ["eminent"],
        },
      },
      { card: { issuerProviderSlugs: ["galicia"], types: ["debit"] } },
    ],
  },
  eligibilityCompleteness: "incomplete",
  unresolved: ["Nivel no reconocido: Selecta 2"],
  purchaseConditions: [],
  capState: "unknown",
  caps: [],
  minimumSpendMinor: null,
  validity: { from: "2026-10-01", to: "2099-12-31", weekdays: [4] },
  channels: ["instore"],
  where: "Consultá los locales adheridos",
  legalText: null,
  warnings: [],
};

export const campaign: ExplorerCampaign = {
  id: "11111111-1111-4111-8111-111111111111",
  source: "galicia",
  externalId: "GAL-9876",
  title: "Coto: 20% de ahorro y hasta 18 cuotas",
  brandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  brandName: "Coto",
  categories: ["supermercados"],
  terms: galiciaTerms,
  unpublishableReason: null,
  bankSlugs: ["galicia"],
  hidden: false,
  withdrawnAt: null,
  lastSeenAt: "2026-10-31T06:00:00.000Z",
  detailFetchedAt: "2026-10-31T06:01:00.000Z",
  detailStale: true,
  verifyUrl: "https://www.galicia.ar/personas/buscador-de-promociones",
  verifyHint: "Buscá «Coto»",
};

export const modoCampaign: ExplorerCampaign = {
  ...campaign,
  id: "22222222-2222-4222-8222-222222222222",
  source: "playdigital",
  externalId: "pd-555",
  title: "YPF con MODO",
  brandName: null,
  categories: [],
  terms: null,
  unpublishableReason: "Oferta sin porcentaje",
  bankSlugs: ["macro", "bbva", "santander", "nacion"],
  detailStale: false,
  verifyUrl: "https://www.modo.com.ar/promos/ypf",
  verifyHint: null,
};

export const detail: ExplorerCampaignDetail = {
  ...campaign,
  raw: {
    listing: { titulo: "<script>alert(1)</script>", id: "GAL-9876" },
    detail: null,
  },
  rawTierSignal: "eminent",
  banks: [
    {
      slug: "galicia",
      terms: galiciaTerms,
      tierCodes: ["eminent"],
      withdrawnAt: null,
      lastSeenAt: "2026-10-31T06:00:00.000Z",
    },
    {
      slug: "macro",
      terms: {
        ...galiciaTerms,
        offers: [{ kind: "percent", percentageBps: 3000, mode: "cashback" }],
        eligibilityCompleteness: "complete",
        unresolved: [],
        capState: "known",
        caps: [{ amountMinor: 1_500_000, period: "month", scope: "card" }],
      },
      tierCodes: ["selecta"],
      withdrawnAt: null,
      lastSeenAt: "2026-10-30T06:00:00.000Z",
    },
  ],
};

export const overview: ExplorerOverview = {
  banks: [
    {
      slug: "galicia",
      name: "Galicia",
      playdigitalId: "pd-gal",
      ownCatalog: true,
      ownCatalogScope: "Catálogo propio de la API de Galicia",
    },
    {
      slug: "macro",
      name: "Macro",
      playdigitalId: "pd-macro",
      ownCatalog: true,
      ownCatalogScope:
        "Solo el hub de PlayDigital; las secciones Selecta separadas no están confirmadas",
    },
    {
      slug: "bbva",
      name: "BBVA",
      playdigitalId: "pd-bbva",
      ownCatalog: false,
      ownCatalogScope: null,
    },
  ],
  runs: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      source: "playdigital",
      bankSlug: "macro",
      startedAt: "2026-10-31T06:00:00.000Z",
      completedAt: "2026-10-31T06:05:00.000Z",
      outcome: "partial",
      complete: false,
      totalReported: 6200,
      rawRowCount: 6100,
      observedCount: 6050,
      upserted: 6000,
      unpublishable: 50,
      anomalies: [
        { kind: "unknown_tier", detail: "Selecta 2", externalId: "pd-1" },
      ],
      error: null,
    },
  ],
  tiers: {
    galicia: [{ code: "eminent", label: "Éminent" }],
    macro: [{ code: "selecta", label: "Selecta" }],
  },
};

export const brands: ExplorerBrandList = {
  items: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Coto",
      aliases: ["coto digital"],
      campaignCount: 12,
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Coto Supermercados",
      aliases: [],
      campaignCount: 3,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 30,
};

export const mappings: ExplorerMappingList = {
  items: [
    {
      sourceKey: "pd:44",
      category: null,
      affectedCampaigns: 87,
      updatedBy: null,
    },
    {
      sourceKey: "galicia:Supermercados",
      category: "supermercados",
      affectedCampaigns: 140,
      updatedBy: "clerk:user_1",
    },
  ],
};
