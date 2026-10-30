import { expect, it } from "vitest";
import {
  CardSelectorSchema,
  RequirementSchema,
  type Requirement,
} from "./benefits.schema";

it("bounds requirement trees and rejects empty selectors", () => {
  const leaf: Requirement = { card: { network: "visa" } };
  const nested = (depth: number): Requirement =>
    depth === 1 ? leaf : { allOf: [nested(depth - 1)] };
  expect(RequirementSchema.safeParse(nested(5)).success).toBe(true);
  expect(RequirementSchema.safeParse(nested(6)).success).toBe(false);
  expect(
    RequirementSchema.safeParse({ anyOf: Array(49).fill(leaf) }).success,
  ).toBe(true);
  expect(
    RequirementSchema.safeParse({ anyOf: Array(50).fill(leaf) }).success,
  ).toBe(false);
  expect(RequirementSchema.safeParse({ allOf: [] }).success).toBe(false);
  expect(CardSelectorSchema.safeParse({}).success).toBe(false);
});
