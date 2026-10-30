import {
  CATALOG_CATEGORY_LABELS,
  type BenefitCard,
  type BenefitResult,
  type CampaignOffer,
  type CardSelector,
  type CatalogCategory,
  type Requirement,
} from "@repo/shared-types";
import { listJoin, offersText } from "@/features/benefits/benefit-offer-format";

export {
  listJoin,
  offersText,
  safeHttpUrl,
} from "@/features/benefits/benefit-offer-format";

const AR = "es-AR";
const TZ = "America/Argentina/Buenos_Aires";

export const categoryLabel = (c: CatalogCategory) =>
  CATALOG_CATEGORY_LABELS[c] ?? c;

const ars = (minor: number) =>
  `$ ${(minor / 100).toLocaleString(AR, { maximumFractionDigits: minor % 100 ? 2 : 0, minimumFractionDigits: minor % 100 ? 2 : 0 })}`;

const CAP_PERIOD = {
  transaction: "por compra",
  day: "por día",
  week: "por semana",
  month: "por mes",
  campaign: "en toda la promo",
};

export function capText(b: Pick<BenefitResult, "capState" | "caps">): string {
  if (b.capState === "none") return "Sin tope";
  if (b.capState === "unknown" || !b.caps.length) return "Tope sin confirmar";
  return b.caps
    .map((cap) =>
      cap.amountMinor === null
        ? `Tope sin confirmar ${CAP_PERIOD[cap.period]}`
        : `Tope ${ars(cap.amountMinor)} ${CAP_PERIOD[cap.period]}`,
    )
    .join(" · ");
}

export function minimumText(minor: number | null): string {
  if (minor === null) return "Mínimo sin confirmar";
  return minor === 0 ? "Sin compra mínima" : `Compra mínima ${ars(minor)}`;
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

const shortDay = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
};

export function daysText(validity: BenefitResult["validity"]): string {
  const days = validity.weekdays
    ? validity.weekdays.length === 7
      ? "Todos los días"
      : capitalize(
          listJoin(
            validity.weekdays.map((d) => WEEKDAYS[d]),
            "y",
          ),
        )
    : "Todos los días";
  return validity.to
    ? `${days} · hasta ${shortDay(validity.to)}`
    : `${days} · sin fecha de fin confirmada`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const todayInArgentina = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: TZ });

export function nextDateText(
  nextDate: string,
  today = todayInArgentina(),
): string | null {
  if (nextDate <= today) return null;
  const day = WEEKDAYS[new Date(`${nextDate}T12:00:00Z`).getUTCDay()];
  return `Próximo: ${day} ${shortDay(nextDate)}`;
}

export function updatedText(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(AR, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
  const day = date.toLocaleDateString("en-CA", { timeZone: TZ });
  if (day === now.toLocaleDateString("en-CA", { timeZone: TZ }))
    return `Actualizado: hoy ${time}`;
  return `Actualizado: ${date.toLocaleDateString(AR, { day: "numeric", month: "numeric", timeZone: TZ })} ${time}`;
}

const CARD_TYPES = {
  credit: "crédito",
  debit: "débito",
  prepaid: "prepaga",
} as const;
const NETWORKS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cabal: "Cabal",
} as const;
export const CARD_TYPE_LABELS = CARD_TYPES;
export const NETWORK_LABELS = NETWORKS;

const cardText = (card: BenefitCard) =>
  `${NETWORKS[card.network]} ${CARD_TYPES[card.type]}`;

export function usableWithText(
  b: Pick<BenefitResult, "usableWith" | "requiresModo">,
): string {
  const ways = b.usableWith.map((u) =>
    u.card ? `${u.bankName} ${cardText(u.card)}` : u.bankName,
  );
  const parts = [
    ways.length ? `Con ${listJoin([...new Set(ways)], "o")}` : null,
    b.requiresModo ? "pagando con MODO" : null,
  ].filter(Boolean);
  return parts.length ? capitalize(parts.join(", ")) : "";
}

const CHANNELS: Record<string, string> = {
  modo: "con MODO",
  qr: "con QR",
  nfc: "sin contacto",
  online: "online",
  instore: "en el local",
};
export const channelsText = (channels: string[]) =>
  channels.length
    ? capitalize(
        listJoin(
          channels.map((c) => CHANNELS[c] ?? c),
          "o",
        ),
      )
    : null;

type Names = (slug: string) => string;

function cardRequirement(card: CardSelector, bankName: Names): string {
  const types = card.types
    ? ` de ${listJoin(
        card.types.map((t) => CARD_TYPES[t]),
        "o",
      )}`
    : "";
  const network = card.network ? ` ${NETWORKS[card.network]}` : "";
  const issuers = card.issuerProviderSlugs
    ? ` de ${listJoin(card.issuerProviderSlugs.map(bankName), "o")}`
    : "";
  const level =
    card.segments || card.productLevels
      ? ` nivel ${listJoin([...(card.segments ?? []), ...(card.productLevels ?? [])], "o")}`
      : "";
  const except = card.excludedIssuerProviderSlugs
    ? ` (salvo de ${listJoin(card.excludedIssuerProviderSlugs.map(bankName), "o")})`
    : "";
  return `una tarjeta${types}${network}${issuers}${level}${except}`;
}

function leafText(r: Requirement, bankName: Names): string {
  if ("card" in r) return cardRequirement(r.card, bankName);
  if ("membership" in r)
    return r.membership.instrumentSlug === "modo"
      ? "pagar con MODO"
      : `tener ${r.membership.instrumentSlug}`;
  if ("providerFact" in r) {
    const { providerSlug, key, values } = r.providerFact;
    if (key === "salaryAccount")
      return values.includes(false)
        ? `no cobrar el sueldo en ${bankName(providerSlug)}`
        : `cobrar el sueldo en ${bankName(providerSlug)}`;
    return `${key === "plan" ? "plan" : "nivel"} ${listJoin(values.map(String), "o")} en ${bankName(providerSlug)}`;
  }
  return "";
}

function requirementSentence(
  r: Requirement,
  bankName: Names,
  nested = false,
): string {
  if (!("allOf" in r) && !("anyOf" in r)) return leafText(r, bankName);
  const all = "allOf" in r;
  const parts = (all ? r.allOf : r.anyOf).map((c) =>
    requirementSentence(c, bankName, true),
  );
  const text = listJoin(parts, all ? "y" : "o");
  return nested && parts.length > 1 ? `(${text})` : text;
}

export function requirementsText(
  eligibility: Requirement,
  requiresModo: boolean,
  bankName: Names,
): string {
  const sentence = requirementSentence(eligibility, bankName);
  const modo =
    requiresModo && !sentence.includes("MODO") ? " y pagar con MODO" : "";
  return `Necesitás ${sentence}${modo}.`;
}

export function variantText(v: {
  offers: CampaignOffer[];
  tierLabels: string[];
}): string {
  return v.tierLabels.length
    ? `Con ${listJoin(v.tierLabels, "o")}: ${offersText(v.offers)}`
    : offersText(v.offers);
}

export const SOURCE_NAMES = {
  galicia: "Galicia",
  playdigital: "MODO",
} as const;
