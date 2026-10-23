import { describe, expect, it } from "vitest";
import { UpdateBenefitPreferencesSchema } from "./benefits.schema";
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
