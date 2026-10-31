import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

it.each(["benefits.server.ts"])("keeps %s server-only", async (filename) => {
  const source = await readFile(
    new URL(`./${filename}`, import.meta.url),
    "utf8",
  );

  expect(source).toMatch(/^import ['"]@tanstack\/react-start\/server-only['"]/);
});

it("exports only the v3 server functions", async () => {
  const source = await readFile(
    new URL("./benefits.functions.ts", import.meta.url),
    "utf8",
  );
  expect(
    [...source.matchAll(/export const (\w+)/g)].map((match) => match[1]),
  ).toEqual([
    "getBenefitSettings",
    "saveBenefitProfile",
    "setBenefitDigestEnabled",
    "searchBenefits",
    "getBenefit",
  ]);
  expect(source).not.toContain("callFinancialApi");
});
