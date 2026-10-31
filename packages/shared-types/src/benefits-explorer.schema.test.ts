import { describe, expect, it } from "vitest";
import {
  ExplorerAliasesPatchSchema,
  ExplorerMergeSchema,
  ExplorerQuerySchema,
} from "./benefits-explorer.schema";

describe("benefits explorer boundaries", () => {
  it("bounds and coerces pagination", () => {
    expect(ExplorerQuerySchema.parse({ page: "2" }).page).toBe(2);
    expect(ExplorerQuerySchema.parse({}).pageSize).toBe(30);
    expect(ExplorerQuerySchema.safeParse({ pageSize: 10000 }).success).toBe(
      false,
    );
    expect(ExplorerQuerySchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it("rejects empty aliases and self merges", () => {
    expect(
      ExplorerAliasesPatchSchema.safeParse({ aliases: ["  "] }).success,
    ).toBe(false);
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      ExplorerMergeSchema.safeParse({ fromId: id, intoId: id }).success,
    ).toBe(false);
  });
});
