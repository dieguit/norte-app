// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fns from "@/features/benefits-admin/benefits-explorer.functions";
import { Route as DetailRoute } from "./$id";
import { Route as BrandsRoute } from "./brands";
import { Route as IndexRoute } from "./index";
import { Route as MappingsRoute } from "./mappings";
import { Route as LayoutRoute } from "./route";
import { Route as RunsRoute } from "./runs";
import {
  brands,
  campaign,
  detail,
  mappings,
  modoCampaign,
  overview,
} from "./-components/explorer-fixtures";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/benefits-admin/benefits-explorer.functions", () => ({
  getExplorerCampaigns: vi.fn(),
  getExplorerCampaign: vi.fn(),
  getExplorerOverview: vi.fn(),
  getExplorerBrands: vi.fn(),
  getExplorerMappings: vi.fn(),
  hideExplorerCampaign: vi.fn(),
  saveExplorerAliases: vi.fn(),
  mergeExplorerBrands: vi.fn(),
  saveExplorerMapping: vi.fn(),
}));
const m = vi.mocked(fns);

beforeEach(() => {
  m.getExplorerOverview.mockResolvedValue({
    access: "granted",
    data: overview,
  });
  m.getExplorerCampaigns.mockResolvedValue({
    access: "granted",
    data: {
      items: [campaign, modoCampaign],
      total: 2244,
      page: 1,
      pageSize: 30,
    },
  });
  m.getExplorerCampaign.mockResolvedValue({
    access: "granted",
    data: detail,
  } as never); // raw is typed as JSON on the wire
  m.getExplorerBrands.mockResolvedValue({ access: "granted", data: brands });
  m.getExplorerMappings.mockResolvedValue({
    access: "granted",
    data: mappings,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderAt(path: string) {
  const root = createRootRoute({ component: Outlet });
  const from = (route: { options: object }, extra: object) =>
    createRoute({ ...route.options, ...extra } as never) as ReturnType<
      typeof createRoute
    >;
  const layout = from(LayoutRoute, {
    getParentRoute: () => root,
    path: "/app/admin/benefits",
  });
  const child = (route: { options: object }, path: string) =>
    from(route, { getParentRoute: () => layout, path });
  const router = createRouter({
    routeTree: root.addChildren([
      layout.addChildren([
        child(IndexRoute, "/"),
        child(RunsRoute, "runs"),
        child(BrandsRoute, "brands"),
        child(MappingsRoute, "mappings"),
        child(DetailRoute, "$id"),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
  render(<RouterProvider router={router} />);
  return router;
}

const query = (extra: object = {}) => ({
  data: { status: "all", page: 1, pageSize: 30, ...extra },
});

describe("campaigns", () => {
  it("paginates and filters on the server through the URL", async () => {
    const user = userEvent.setup();
    const router = renderAt("/app/admin/benefits");

    const row = await screen.findByRole("link", {
      name: /Coto: 20% de ahorro/,
    });
    expect(m.getExplorerCampaigns).toHaveBeenCalledWith(query());
    expect(screen.getByRole("link", { name: "Campañas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByText("1–30 de 2.244 campañas")[0]).toHaveAttribute(
      "role",
      "status",
    );
    expect(
      within(row).getByText("20% de ahorro y hasta 18 cuotas sin interés"),
    ).toBeInTheDocument();
    expect(within(row).getByText("Incompleta")).toBeInTheDocument();
    expect(within(row).getByText("Requisitos incompletos")).toBeInTheDocument();
    expect(within(row).queryByText("Disponible")).not.toBeInTheDocument();
    const modo = screen.getByRole("link", { name: /YPF con MODO/ });
    expect(within(modo).getByText("Condiciones sin leer")).toBeInTheDocument();
    expect(
      within(modo).getByText(/Macro, BBVA, santander y 1 más/),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("link", { name: "Página siguiente" })[0],
    );
    await waitFor(() =>
      expect(m.getExplorerCampaigns).toHaveBeenLastCalledWith(
        query({ page: 2 }),
      ),
    );

    await user.click(screen.getByRole("combobox", { name: "Banco" }));
    await user.click(await screen.findByRole("option", { name: "Macro" }));
    await waitFor(() =>
      expect(m.getExplorerCampaigns).toHaveBeenLastCalledWith(
        query({ bank: "macro" }),
      ),
    );

    await user.type(
      screen.getByRole("searchbox", { name: /Buscar por título/ }),
      "coto{Enter}",
    );
    await waitFor(() =>
      expect(m.getExplorerCampaigns).toHaveBeenLastCalledWith(
        query({ bank: "macro", q: "coto" }),
      ),
    );
    expect(router.state.location.search).toEqual({ bank: "macro", q: "coto" });
  });

  it("shows only the no-access state when denied", async () => {
    m.getExplorerOverview.mockResolvedValue({ access: "denied" });
    renderAt("/app/admin/benefits");
    expect(
      await screen.findByRole("heading", { name: "Sin acceso" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Secciones del explorador" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("campaign detail", () => {
  it("shows purchase conditions for the campaign and each bank", async () => {
    const condition = {
      kind: "coupon" as const,
      code: "BANCO",
      instruction: "Ingresalo al pagar",
      evidence: "fuente",
    };
    m.getExplorerCampaign.mockResolvedValue({
      access: "granted",
      data: {
        ...detail,
        terms: { ...detail.terms!, purchaseConditions: [condition] },
        banks: detail.banks.map((bank) => ({
          ...bank,
          terms: bank.terms && {
            ...bank.terms,
            purchaseConditions: [{ ...condition, code: bank.slug }],
          },
        })),
      },
    } as never);
    renderAt(`/app/admin/benefits/${detail.id}`);
    expect(
      await screen.findByText("Cupón BANCO: Ingresalo al pagar"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cupón macro: Ingresalo al pagar"),
    ).toBeInTheDocument();
  });
  it("shows verification, bank branches, warnings and raw data as text", async () => {
    renderAt(`/app/admin/benefits/${detail.id}`);

    expect(
      await screen.findByRole("heading", { level: 1, name: detail.title }),
    ).toBeInTheDocument();
    const verify = screen.getByRole("region", { name: "Verificación" });
    expect(within(verify).getByText("Buscá «Coto»")).toBeInTheDocument();
    expect(within(verify).getByText("GAL-9876")).toBeInTheDocument();
    const link = within(verify).getByRole("link", { name: /Ver en Galicia/ });
    expect(link).toHaveAttribute("href", detail.verifyUrl);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    expect(
      screen.getAllByText(
        "Requisitos incompletos: no se muestra como disponible",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Nivel no reconocido: Selecta 2").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Tope sin confirmar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mínimo sin confirmar").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText("Condiciones propias de este banco"),
    ).toBeInTheDocument();
    expect(screen.getByText("30% de reintegro")).toBeInTheDocument();
    expect(screen.getByText("Niveles: Selecta")).toBeInTheDocument();

    expect(
      screen.getByText(/"titulo": "<script>alert\(1\)<\/script>"/),
    ).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("hides the campaign and moves focus to the status", async () => {
    m.hideExplorerCampaign.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderAt(`/app/admin/benefits/${detail.id}`);

    await user.click(
      await screen.findByRole("button", { name: "Ocultar campaña" }),
    );
    expect(m.hideExplorerCampaign).toHaveBeenCalledWith({
      data: { id: detail.id, hidden: true },
    });
    await waitFor(() => expect(m.getExplorerCampaign).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 2, name: /Estado/ }),
      ).toHaveFocus(),
    );
  });
});

describe("banks and runs", () => {
  it("states coverage honestly per bank", async () => {
    renderAt("/app/admin/benefits/runs");
    const row = (name: string) =>
      screen
        .getByRole("rowheader", { name: new RegExp(`^${name}`) })
        .closest("tr") as HTMLElement;
    await screen.findByRole("table", { name: "Bancos y cobertura" });
    expect(
      within(row("Macro")).getByText(/Solo el hub de PlayDigital/),
    ).toBeInTheDocument();
    expect(
      within(row("Macro")).getByText("Promos MODO + catálogo propio"),
    ).toBeInTheDocument();
    expect(
      within(row("BBVA")).getByText("Solo promos MODO"),
    ).toBeInTheDocument();
    expect(
      within(row("BBVA")).getByText(/Sin corrida propia/),
    ).toBeInTheDocument();
    expect(screen.getByText("1 anomalías")).toBeInTheDocument();
    expect(
      screen.getByText("6.050 vistas de 6.200 informadas"),
    ).toBeInTheDocument();
  });
});

describe("brands", () => {
  it("saves aliases", async () => {
    m.saveExplorerAliases.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderAt("/app/admin/benefits/brands");

    await user.click(
      await screen.findByRole("button", { name: "Editar alias de Coto" }),
    );
    const box = screen.getByRole("textbox", { name: /Alias de Coto/ });
    await waitFor(() => expect(box).toHaveFocus());
    await user.type(box, "\ncoto online\ncoto online");
    await user.click(screen.getByRole("button", { name: "Guardar alias" }));
    expect(m.saveExplorerAliases).toHaveBeenCalledWith({
      data: {
        id: brands.items[0].id,
        aliases: ["coto digital", "coto online"],
      },
    });
  });

  it("merges only after choosing a destination and confirming", async () => {
    m.mergeExplorerBrands.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderAt("/app/admin/benefits/brands");

    await user.click(
      await screen.findByRole("button", { name: "Unir Coto con otra marca" }),
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar marca destino" }),
      "coto{Enter}",
    );
    await waitFor(() =>
      expect(m.getExplorerBrands).toHaveBeenLastCalledWith({
        data: { q: "coto", page: 1, pageSize: 10 },
      }),
    );
    expect(
      screen.queryByRole("radio", { name: /^Coto ·/ }),
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("radio", { name: /Coto Supermercados/ }),
    );
    expect(m.mergeExplorerBrands).not.toHaveBeenCalled();
    expect(screen.getByText(/Vas a mover 12 campañas de/)).toHaveTextContent(
      "Vas a mover 12 campañas de Coto a Coto Supermercados.",
    );

    await user.click(
      screen.getByRole("button", { name: "Unir Coto en Coto Supermercados" }),
    );
    expect(m.mergeExplorerBrands).toHaveBeenCalledWith({
      data: { fromId: brands.items[0].id, intoId: brands.items[1].id },
    });
  });
});

describe("category mappings", () => {
  it("saves a mapping and reports success", async () => {
    m.saveExplorerMapping.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderAt("/app/admin/benefits/mappings");

    expect(
      await screen.findByText("Sin mapear: cuenta como Otros"),
    ).toBeInTheDocument();
    expect(screen.getByText("MODO · 87 campañas")).toBeInTheDocument();
    await user.click(
      screen.getByRole("combobox", { name: "Categoría para pd:44" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "Combustible y autos" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Guardar" })[0]);
    expect(m.saveExplorerMapping).toHaveBeenCalledWith({
      data: { sourceKey: "pd:44", category: "combustible-autos" },
    });
    expect(
      await screen.findByText(/Guardado: Combustible y autos\./),
    ).toHaveAttribute("role", "status");
  });
});
