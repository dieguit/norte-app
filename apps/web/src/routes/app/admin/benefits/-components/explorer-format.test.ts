import { describe, expect, it } from "vitest";
import { campaign } from "./explorer-fixtures";
import {
  campaignStatus,
  capsText,
  minimumSpendText,
  offersText,
  safeHttpUrl,
} from "./explorer-format";

const terms = campaign.terms!;

describe("explorer format", () => {
  it("never invents discount or cashback for unspecified percents and joins combined offers", () => {
    expect(offersText(terms)).toBe(
      "20% de ahorro y hasta 18 cuotas sin interés",
    );
    expect(
      offersText({
        ...terms,
        offers: [
          { kind: "percent", percentageBps: 1250, mode: "cashback" },
          { kind: "installments", count: 6, upTo: false },
        ],
      }),
    ).toBe("12,5% de reintegro y 6 cuotas sin interés");
    expect(offersText(null)).toBe("Condiciones sin leer");
  });

  it("shows unknown caps and minimums as unconfirmed", () => {
    expect(capsText(terms)).toEqual(["Tope sin confirmar"]);
    expect(capsText({ capState: "none", caps: [] })).toEqual(["Sin tope"]);
    expect(
      capsText({
        capState: "known",
        caps: [{ amountMinor: null, period: "transaction", scope: null }],
      }),
    ).toEqual(["Tope de monto sin confirmar por compra"]);
    expect(minimumSpendText(null)).toBe("Mínimo sin confirmar");
    expect(minimumSpendText(0)).toBe("Sin compra mínima");
  });

  it("derives status with hidden > withdrawn > expired > incomplete", () => {
    const complete = { ...terms, eligibilityCompleteness: "complete" as const };
    expect(campaignStatus({ ...campaign, terms: complete }, "2026-11-01")).toBe(
      "available",
    );
    expect(campaignStatus(campaign, "2026-11-01")).toBe("incomplete");
    expect(campaignStatus({ ...campaign, terms: null }, "2026-11-01")).toBe(
      "incomplete",
    );
    expect(
      campaignStatus(
        {
          ...campaign,
          terms: {
            ...complete,
            validity: { ...complete.validity, to: "2026-10-31" },
          },
        },
        "2026-11-01",
      ),
    ).toBe("expired");
    expect(
      campaignStatus({ ...campaign, hidden: true, withdrawnAt: "x" }),
    ).toBe("hidden");
  });

  it("only allows http(s) links", () => {
    expect(safeHttpUrl("https://www.modo.com.ar/promos/x")).toBe(
      "https://www.modo.com.ar/promos/x",
    );
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,hi")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});
