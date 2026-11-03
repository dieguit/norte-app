import { expect, it } from "vitest";
import { purchaseConditionText } from "./purchase-condition-format";

it("shows the payroll condition", () => {
  expect(purchaseConditionText({ kind: "payroll", bankSlug: "galicia" })).toBe(
    "Requiere cobrar el sueldo en Galicia.",
  );
});
