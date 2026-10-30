import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start/server-only", () => ({}));
vi.mock("../financial/financial.server", () => ({
  callFinancialApi: vi.fn(),
  mutateFinancialApi: vi.fn(),
  throwFinancialApiError: vi.fn(async () => {
    throw new Error("API failure");
  }),
}));
import {
  callFinancialApi,
  mutateFinancialApi,
} from "../financial/financial.server";
import {
  getExplorerCampaignsServer,
  getExplorerCampaignServer,
  getExplorerOverviewServer,
  getExplorerBrandsServer,
  getExplorerMappingsServer,
  hideExplorerCampaignServer,
} from "./benefits-explorer.server";
import { ExplorerQuerySchema } from "@repo/shared-types";

describe("explorer server boundary", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    () => getExplorerCampaignsServer({ data: ExplorerQuerySchema.parse({}) }),
    () => getExplorerCampaignServer({ data: { id: "id" } }),
    () => getExplorerOverviewServer(),
    () => getExplorerBrandsServer({ data: { page: 1, pageSize: 30 } }),
    () => getExplorerMappingsServer(),
  ])("returns denied on forbidden reads", async (read) => {
    vi.mocked(callFinancialApi).mockResolvedValue(
      new Response("", { status: 403 }),
    );
    expect(await read()).toEqual({ access: "denied" });
  });
  it("encodes query and validates the response", async () => {
    vi.mocked(callFinancialApi).mockResolvedValue(
      Response.json({ items: [], total: 0, page: 1, pageSize: 30 }),
    );
    expect(
      await getExplorerCampaignsServer({
        data: ExplorerQuerySchema.parse({ q: "Café & Bar" }),
      }),
    ).toMatchObject({ access: "granted", data: { total: 0 } });
    expect(callFinancialApi).toHaveBeenCalledWith(
      expect.stringContaining("q=Caf%C3%A9+%26+Bar"),
    );
  });
  it("does not convert mutation failure into success", async () => {
    vi.mocked(mutateFinancialApi).mockRejectedValue(new Error("Forbidden"));
    await expect(
      hideExplorerCampaignServer({ data: { id: "id", hidden: true } }),
    ).rejects.toThrow("Forbidden");
  });
});
