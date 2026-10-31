import { describe, expect, it } from "vitest";
import { purchaseConditionText } from "./purchase-condition-format";

describe("purchaseConditionText", () => {
  it("preserves inclusion and exclusion polarity", () => {
    const condition = {
      kind: "acquirer" as const,
      mode: "include" as const,
      names: ["Payway", "Getnet"],
      evidence: "fuente",
    };
    expect(purchaseConditionText(condition)).toBe("Aplica con Payway, Getnet.");
    expect(purchaseConditionText({ ...condition, mode: "exclude" })).toBe(
      "No aplica con Payway, Getnet.",
    );
  });
});
