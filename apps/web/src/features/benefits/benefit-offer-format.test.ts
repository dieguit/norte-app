import { describe, expect, it } from "vitest";
import { listJoin, offersText, safeHttpUrl } from "./benefit-offer-format";

describe("benefit offer format", () => {
  it("preserves offer wording and joins combined offers", () => {
    for (const count of [6, 18]) {
      expect(
        offersText([
          { kind: "percent", percentageBps: 2000, mode: "unspecified" },
          { kind: "installments", count, upTo: true },
        ]),
      ).toBe(`20% de ahorro y hasta ${count} cuotas sin interés`);
    }
    expect(
      offersText([
        { kind: "percent", percentageBps: 1250, mode: "cashback" },
        { kind: "installments", count: 6, upTo: false },
      ]),
    ).toBe("12,5% de reintegro y 6 cuotas sin interés");
    expect(offersText([{ kind: "installments", count: 3, upTo: false }])).toBe(
      "3 cuotas sin interés",
    );
    expect(
      offersText([{ kind: "percent", percentageBps: 2000, mode: "discount" }]),
    ).toBe("20% de descuento");
  });

  it("joins lists with the requested conjunction", () => {
    expect(listJoin([], "y")).toBe("");
    expect(listJoin(["a"], "o")).toBe("a");
    expect(listJoin(["a", "b", "c"], "o")).toBe("a, b o c");
  });

  it("only allows http(s) links", () => {
    expect(safeHttpUrl("https://www.modo.com.ar/promos/x")).toBe(
      "https://www.modo.com.ar/promos/x",
    );
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "not a url",
      "",
      null,
      undefined,
    ]) {
      expect(safeHttpUrl(url)).toBeNull();
    }
  });
});
