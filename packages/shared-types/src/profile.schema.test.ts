import { describe, expect, it } from "vitest";
import { ProfileResponseSchema } from "./profile.schema";

describe("ProfileResponseSchema", () => {
  it("preserves the full home payload and permits absent optional values", () => {
    const response = {
      profile: "present",
      home: {
        income: { amount: "1200.00", currency: "ARS" },
        expensesKnowledge: "unknown",
        plan: {
          fundingMethod: "save",
          destinationCurrency: "USD",
          monthlyCommitment: { amount: "100.00", currency: "ARS" },
          destinationAmount: { amount: "0.07", currency: "USD" },
          effectiveMonth: "2026-10",
          allocationPercentage: "100.00",
        },
        goal: {
          type: "emergency_fund",
          name: "Fondo",
          currentAmount: { amount: "0.00", currency: "USD" },
        },
        previousMonthShortfalls: [],
      },
    };

    expect(ProfileResponseSchema.parse(response)).toEqual(response);
    expect(ProfileResponseSchema.parse({ profile: "missing" })).toEqual({
      profile: "missing",
    });
  });
});
