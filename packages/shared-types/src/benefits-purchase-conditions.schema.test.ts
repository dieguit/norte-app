import { expect, it } from "vitest";
import {
  CampaignTermsSchema,
  PurchaseConditionSchema,
} from "./benefits-catalog.schema";
import {
  BenefitDetailSchema,
  BenefitResultSchema,
} from "./benefits-consumer.schema";

const evidence = "conditions.schedule";
it("bounds purchase conditions and validates exact non-overnight Argentine times", () => {
  const daily = {
    kind: "daily_time",
    from: "10:00:00",
    to: "20:00:00",
    timezone: "America/Argentina/Buenos_Aires",
    evidence,
  };
  expect(PurchaseConditionSchema.safeParse(daily).success).toBe(true);
  for (const changes of [
    { from: "9:00:00" },
    { to: "25:00:00" },
    { to: "09:00:00" },
    { timezone: "UTC" },
    { evidence: "" },
  ])
    expect(
      PurchaseConditionSchema.safeParse({ ...daily, ...changes }).success,
    ).toBe(false);
  expect(
    PurchaseConditionSchema.safeParse({
      kind: "participating_locations",
      instruction: "x".repeat(501),
      evidence,
    }).success,
  ).toBe(false);
  expect(
    PurchaseConditionSchema.safeParse({
      kind: "legal_purchase",
      text: "x".repeat(2001),
      evidence,
    }).success,
  ).toBe(false);
  expect(
    PurchaseConditionSchema.safeParse({
      kind: "acquirer",
      mode: "exclude",
      names: Array(21).fill("ACQUIRER"),
      evidence,
    }).success,
  ).toBe(false);
  expect(
    PurchaseConditionSchema.safeParse({
      kind: "coupon",
      code: null,
      instruction: "Ingresá el cupón indicado por el comercio.",
      evidence: "coupon",
    }).success,
  ).toBe(true);
});

it("defaults old terms without blessing existing unresolved eligibility", () => {
  const parsed = CampaignTermsSchema.parse({
    offers: [{ kind: "percent", percentageBps: 2000, mode: "cashback" }],
    eligibility: { card: { network: "visa" } },
    eligibilityCompleteness: "incomplete",
    unresolved: ["offer segmentation: whitelist"],
    capState: "unknown",
    caps: [],
    minimumSpendMinor: null,
    validity: { from: null, to: null, weekdays: null },
    channels: [],
    where: null,
    legalText: null,
    warnings: [],
  });
  expect(parsed.purchaseConditions).toEqual([]);
  expect(parsed.eligibilityCompleteness).toBe("incomplete");
  expect(parsed.unresolved).toEqual(["offer segmentation: whitelist"]);
});

it("requires explicit variant eligibility and defaults purchase conditions", () => {
  const variant = BenefitResultSchema.shape.variants.element.parse({
    id: "00000000-0000-4000-8000-000000000001",
    offers: [],
    tierLabels: [],
    match: "conditional",
    variantKey: "stable-variant",
    usableWith: [
      {
        bankSlug: "galicia",
        bankName: "Galicia",
        card: { type: "credit", network: "visa" },
      },
    ],
    channels: ["qr"],
    minimumSpendMinor: 10000,
    where: "Locales adheridos",
    capState: "known",
    caps: [{ amountMinor: 20000, period: "month", scope: null }],
    requiresModo: true,
    validity: { from: null, to: null, weekdays: [3] },
    nextDate: "2026-10-21",
  });
  expect(variant).toMatchObject({
    match: "conditional",
    purchaseConditions: [],
  });
  for (const field of [
    "variantKey",
    "usableWith",
    "channels",
    "minimumSpendMinor",
    "where",
    "capState",
    "caps",
    "requiresModo",
    "validity",
    "nextDate",
  ] as const) {
    const missing = { ...variant } as Partial<typeof variant>;
    delete missing[field];
    expect(
      BenefitResultSchema.shape.variants.element.safeParse(missing).success,
      field,
    ).toBe(false);
  }
  expect(
    BenefitResultSchema.shape.variants.element.safeParse({
      id: variant.id,
      offers: [],
      tierLabels: [],
    }).success,
  ).toBe(false);
  expect(BenefitResultSchema.shape.purchaseConditions.parse(undefined)).toEqual(
    [],
  );
  expect(BenefitResultSchema.shape.match.parse("conditional")).toBe(
    "conditional",
  );
  expect(BenefitDetailSchema.shape.match.parse("ineligible")).toBe(
    "ineligible",
  );
  expect(
    CampaignTermsSchema.shape.purchaseConditions.safeParse(
      Array(21).fill({
        kind: "legal_purchase",
        text: "Locales adheridos",
        evidence,
      }),
    ).success,
  ).toBe(false);
});
