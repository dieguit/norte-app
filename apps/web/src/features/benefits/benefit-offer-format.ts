import type { CampaignOffer } from "@repo/shared-types";

export function listJoin(items: string[], word: "y" | "o"): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${word} ${items.at(-1)}`;
}

const percent = (bps: number) =>
  `${(bps / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;

// Galicia says "ahorro" without telling discount from cashback: never guess.
const PERCENT_MODE = {
  discount: "de descuento",
  cashback: "de reintegro",
  unspecified: "de ahorro",
};

function offerText(offer: CampaignOffer): string {
  if (offer.kind === "percent")
    return `${percent(offer.percentageBps)} ${PERCENT_MODE[offer.mode]}`;
  return `${offer.upTo ? "hasta " : ""}${offer.count} cuotas sin interés`;
}

export const offersText = (offers: CampaignOffer[]) =>
  listJoin(offers.map(offerText), "y");

export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
