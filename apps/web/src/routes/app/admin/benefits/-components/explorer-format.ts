import {
  CATALOG_CATEGORY_LABELS,
  type BenefitCap,
  type CampaignTerms,
  type CardSelector,
  type CatalogCategory,
  type ExplorerCampaign,
  type Requirement,
} from "@repo/shared-types";
import { formatMoney } from "@/lib/format";
import {
  listJoin,
  offersText as formatOffers,
} from "@/features/benefits/benefit-offer-format";

export { safeHttpUrl } from "@/features/benefits/benefit-offer-format";

export const SOURCE_LABELS: Record<ExplorerCampaign["source"], string> = {
  galicia: "Galicia (catálogo propio)",
  playdigital: "MODO (PlayDigital)",
};

export const categoryLabel = (category: CatalogCategory) =>
  CATALOG_CATEGORY_LABELS[category] ?? category;

export const termsOffersText = (terms: CampaignTerms | null) =>
  terms ? formatOffers(terms.offers) : "Condiciones sin leer";

const minorToArs = (minor: number) =>
  formatMoney({ amount: (minor / 100).toFixed(2), currency: "ARS" });

export function minimumSpendText(minor: number | null): string {
  if (minor === null) return "Mínimo sin confirmar";
  if (minor === 0) return "Sin compra mínima";
  return `Compra mínima de ${minorToArs(minor)}`;
}

const CAP_PERIOD: Record<BenefitCap["period"], string> = {
  transaction: "por compra",
  day: "por día",
  week: "por semana",
  month: "por mes",
  campaign: "por campaña",
};
const CAP_SCOPE: Record<NonNullable<BenefitCap["scope"]>, string> = {
  card: "por tarjeta",
  account: "por cuenta",
  person: "por persona",
  bank: "por banco",
  promotion: "por promoción",
};

function capText(cap: BenefitCap): string {
  return [
    cap.amountMinor === null
      ? "Tope de monto sin confirmar"
      : `Tope de ${minorToArs(cap.amountMinor)}`,
    CAP_PERIOD[cap.period],
    cap.scope && CAP_SCOPE[cap.scope],
  ]
    .filter(Boolean)
    .join(" ");
}

export function capsText(terms: Pick<CampaignTerms, "capState" | "caps">) {
  if (terms.capState === "none") return ["Sin tope"];
  if (terms.capState === "unknown") return ["Tope sin confirmar"];
  return terms.caps.map(capText);
}

const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const isoDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export function validityText(validity: CampaignTerms["validity"]): string[] {
  return [
    `Desde ${validity.from ? isoDay(validity.from) : "fecha sin confirmar"} hasta ${validity.to ? isoDay(validity.to) : "fecha sin confirmar"}`,
    validity.weekdays
      ? `Solo ${listJoin(
          validity.weekdays.map((d) => WEEKDAYS[d]),
          "y",
        )}`
      : "Todos los días",
  ];
}

const CHANNELS: Record<string, string> = {
  modo: "MODO",
  qr: "QR",
  nfc: "sin contacto (NFC)",
  online: "online",
  instore: "en el local",
};
export const channelsText = (channels: string[]) =>
  channels.length
    ? `Canales: ${listJoin(
        channels.map((c) => CHANNELS[c] ?? c),
        "o",
      )}`
    : "Canal sin confirmar";

export const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : "Nunca";

const CARD_TYPES: Record<string, string> = {
  credit: "crédito",
  debit: "débito",
  prepaid: "prepaga",
};
const NETWORKS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cabal: "Cabal",
};

function cardSelectorText(card: CardSelector): string {
  return [
    card.instrumentSlugs &&
      `instrumento ${listJoin(card.instrumentSlugs, "o")}`,
    card.issuerProviderSlugs && `de ${listJoin(card.issuerProviderSlugs, "o")}`,
    card.network && `red ${NETWORKS[card.network]}`,
    card.types &&
      listJoin(
        card.types.map((t) => CARD_TYPES[t]),
        "o",
      ),
    card.productLevels && `nivel ${listJoin(card.productLevels, "o")}`,
    card.segments && `segmento ${listJoin(card.segments, "o")}`,
    card.issuerCountries && `emitida en ${listJoin(card.issuerCountries, "o")}`,
    card.excludedIssuerProviderSlugs &&
      `excepto de ${listJoin(card.excludedIssuerProviderSlugs, "o")}`,
  ]
    .filter(Boolean)
    .join(", ");
}

const FACT_KEYS: Record<string, string> = {
  salaryAccount: "cuenta sueldo",
  plan: "plan",
  loyaltyLevel: "nivel",
};

export function requirementLeafText(r: Requirement): string {
  if ("card" in r) return `Tarjeta ${cardSelectorText(r.card)}`;
  if ("membership" in r) return `Usar ${r.membership.instrumentSlug}`;
  if ("providerFact" in r) {
    const { providerSlug, key, values } = r.providerFact;
    const shown = values.map((v) =>
      v === true ? "sí" : v === false ? "no" : v,
    );
    return `${providerSlug}: ${FACT_KEYS[key]} ${listJoin(shown, "o")}`;
  }
  return "";
}

export type CampaignStatus =
  "hidden" | "withdrawn" | "expired" | "incomplete" | "available";

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  available: "Disponible",
  incomplete: "Incompleta",
  hidden: "Oculta",
  withdrawn: "Retirada",
  expired: "Vencida",
};

const todayInArgentina = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

// Same precedence as the API status filter; expiry is derived at read time, never stored.
export function campaignStatus(
  c: Pick<ExplorerCampaign, "hidden" | "withdrawnAt" | "terms">,
  today = todayInArgentina(),
): CampaignStatus {
  if (c.hidden) return "hidden";
  if (c.withdrawnAt) return "withdrawn";
  if (c.terms?.validity.to && c.terms.validity.to < today) return "expired";
  if (!c.terms || c.terms.eligibilityCompleteness !== "complete")
    return "incomplete";
  return "available";
}
