import { describe, expect, it } from "vitest";
import {
  BenefitRulesSchema,
  CardSelectorSchema,
  RequirementSchema,
  UpdateBenefitPreferencesSchema,
  type Requirement,
} from "./benefits.schema";
import { NOTIFICATION_TYPES } from "./notification.schema";

describe("benefit preferences schema", () => {
  it("accepts known categories and at least one instrument", () => {
    expect(
      UpdateBenefitPreferencesSchema.safeParse({
        instrumentSlugs: ["galicia-visa-credito"],
        categories: ["cine"],
      }).success,
    ).toBe(true);
  });
  it.each([
    { instrumentSlugs: [], categories: ["cine"] },
    { instrumentSlugs: ["x"], categories: [] },
    { instrumentSlugs: ["x"], categories: ["casino"] },
  ])("rejects %j", (input) => {
    expect(UpdateBenefitPreferencesSchema.safeParse(input).success).toBe(false);
  });
  it("registers the savings digest notification type", () => {
    expect(NOTIFICATION_TYPES).toContain("savings_digest");
  });
});

describe("benefit rule contracts", () => {
  const leaf: Requirement = { card: { network: "visa" } };
  const nested = (depth: number): Requirement =>
    depth === 1 ? leaf : { allOf: [nested(depth - 1)] };
  const rules = {
    eligibility: leaf,
    eligibilityCompleteness: "complete",
    unresolved: [],
    offer: { type: "discount", percentageBps: 1000 },
    currency: "ARS",
    minimumSpendMinor: null,
    capState: "none",
    caps: [],
    validity: {
      from: "2026-10-01",
      to: "2026-10-31",
      weekdays: null,
      monthDays: null,
    },
    channels: { allowed: [], excluded: [] },
    requiredActions: [],
    stackable: "unknown",
    recurrence: "campaign",
  };
  it("limits requirement depth and nodes inclusively", () => {
    expect(RequirementSchema.safeParse(nested(5)).success).toBe(true);
    expect(RequirementSchema.safeParse(nested(6)).success).toBe(false);
    expect(
      RequirementSchema.safeParse({ anyOf: Array(49).fill(leaf) }).success,
    ).toBe(true);
    expect(
      RequirementSchema.safeParse({ anyOf: Array(50).fill(leaf) }).success,
    ).toBe(false);
  });
  it("rejects empty groups and selectors", () => {
    expect(RequirementSchema.safeParse({ allOf: [] }).success).toBe(false);
    expect(RequirementSchema.safeParse({ anyOf: [] }).success).toBe(false);
    expect(CardSelectorSchema.safeParse({}).success).toBe(false);
  });
  it("enforces cap state consistency without treating unknown amounts as no cap", () => {
    const cap = { amountMinor: null, period: "month", scope: "account" };
    expect(BenefitRulesSchema.safeParse(rules).success).toBe(true);
    expect(
      BenefitRulesSchema.safeParse({ ...rules, capState: "known" }).success,
    ).toBe(false);
    expect(
      BenefitRulesSchema.safeParse({ ...rules, caps: [cap] }).success,
    ).toBe(false);
    expect(
      BenefitRulesSchema.safeParse({ ...rules, capState: "known", caps: [cap] })
        .success,
    ).toBe(true);
    expect(
      BenefitRulesSchema.safeParse({
        ...rules,
        capState: "unknown",
        caps: [cap],
      }).success,
    ).toBe(true);
  });
  it.each([
    "2026-02-31",
    "2026-13-01",
    "2026-99-01",
    "2026-02-29",
    "2026-04-31",
  ])("rejects impossible calendar date %s", (day) => {
    expect(
      BenefitRulesSchema.safeParse({
        ...rules,
        validity: { ...rules.validity, from: day, to: null },
      }).success,
    ).toBe(false);
  });
  it("accepts leap dates and distinguishes unknown, zero and negative minimums", () => {
    expect(
      BenefitRulesSchema.safeParse({
        ...rules,
        validity: { ...rules.validity, from: "2028-02-29", to: null },
      }).success,
    ).toBe(true);
    for (const minimumSpendMinor of [null, 0, 1]) {
      expect(
        BenefitRulesSchema.safeParse({ ...rules, minimumSpendMinor }).success,
      ).toBe(true);
    }
    expect(
      BenefitRulesSchema.safeParse({ ...rules, minimumSpendMinor: -1 }).success,
    ).toBe(false);
  });
  it("rejects inverted validity", () => {
    expect(
      BenefitRulesSchema.safeParse({
        ...rules,
        validity: { ...rules.validity, from: "2026-11-01" },
      }).success,
    ).toBe(false);
  });
});
