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
import * as fns from "@/features/benefits/benefits.functions";
import { Route as DetailRoute } from "./$id";
import { Route as IndexRoute } from "./index";
import { Route as LayoutRoute } from "./route";
import { Route as SettingsRoute } from "./settings";
import {
  banks,
  coto,
  detail,
  emptyProfile,
  jumbo,
  profile,
  searchResult,
} from "./-components/benefit-fixtures";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/benefits/benefits.functions", () => ({
  getBenefitSettings: vi.fn(),
  saveBenefitProfile: vi.fn(),
  setBenefitDigestEnabled: vi.fn(),
  searchBenefits: vi.fn(),
  getBenefit: vi.fn(),
}));
const m = vi.mocked(fns);

beforeEach(() => {
  m.getBenefitSettings.mockResolvedValue({ banks, profile });
  m.searchBenefits.mockResolvedValue(searchResult);
  m.getBenefit.mockResolvedValue(detail);
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
    path: "/app/finances/benefits",
  });
  const child = (route: { options: object }, path: string) =>
    from(route, { getParentRoute: () => layout, path });
  const router = createRouter({
    routeTree: root.addChildren([
      layout.addChildren([
        child(IndexRoute, "/"),
        child(SettingsRoute, "settings"),
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
  data: { day: "today", page: 1, pageSize: 20, ...extra },
});

describe("benefits listing", () => {
  it("shows today's benefits with honest coverage and filters through the URL", async () => {
    const user = userEvent.setup();
    const router = renderAt("/app/finances/benefits");

    const cotoRow = await screen.findByRole("link", { name: /Coto/ });
    expect(m.searchBenefits).toHaveBeenCalledWith(query());
    expect(within(cotoRow).getByText("20% de reintegro")).toBeInTheDocument();
    expect(
      within(cotoRow).getByText("Con Galicia Visa crédito, pagando con MODO"),
    ).toBeInTheDocument();
    expect(
      within(cotoRow).getByText(
        /Jueves · hasta 30\/11 · Tope \$ 15\.000 por mes/,
      ),
    ).toBeInTheDocument();
    const jumboRow = screen.getByRole("link", { name: /Jumbo/ });
    expect(
      within(jumboRow).getByText("20% de ahorro y hasta 6 cuotas sin interés"),
    ).toBeInTheDocument();
    expect(
      within(jumboRow).getByText(/Tope sin confirmar/),
    ).toBeInTheDocument();
    expect(
      within(jumboRow).getByText("Con tu nivel podrías tener más"),
    ).toBeInTheDocument();
    expect(
      within(jumboRow).getByText("También: 10% de ahorro"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La información de Macro puede estar desactualizada."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /De BBVA solo tenemos promos con MODO y nos dijiste que no pagás con MODO/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("3 beneficios hoy")).toBeInTheDocument();
    expect(screen.queryByText(/garantizad/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mañana" }));
    await waitFor(() =>
      expect(m.searchBenefits).toHaveBeenLastCalledWith(
        query({ day: "tomorrow" }),
      ),
    );
    await user.click(
      await screen.findByRole("button", { name: /^Gastronomía/ }),
    );
    await waitFor(() =>
      expect(m.searchBenefits).toHaveBeenLastCalledWith(
        query({ day: "tomorrow", category: "gastronomia" }),
      ),
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar por marca" }),
      "coto{Enter}",
    );
    await waitFor(() =>
      expect(m.searchBenefits).toHaveBeenLastCalledWith(
        query({ day: "tomorrow", category: "gastronomia", q: "coto" }),
      ),
    );
    expect(router.state.location.search).toEqual({
      day: "tomorrow",
      category: "gastronomia",
      q: "coto",
    });
  });

  it("preselects the category from a digest link and loads more incrementally", async () => {
    const more = {
      ...jumbo,
      id: "44444444-4444-4444-8444-444444444444",
      brandName: "Disco",
    };
    const user = userEvent.setup();
    renderAt("/app/finances/benefits?category=supermercados");

    expect(
      await screen.findByRole("button", { name: /^Supermercados/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(m.searchBenefits).toHaveBeenCalledWith(
      query({ category: "supermercados" }),
    );
    expect(screen.getByText("Viendo 2 de 3")).toBeInTheDocument();

    m.searchBenefits.mockResolvedValueOnce({
      ...searchResult,
      items: [more],
      page: 2,
    });
    await user.click(screen.getByRole("button", { name: "Ver más" }));
    expect(m.searchBenefits).toHaveBeenLastCalledWith(
      query({ category: "supermercados", page: 2 }),
    );
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Disco/ })).toHaveFocus(),
    );
    expect(
      screen.queryByRole("button", { name: "Ver más" }),
    ).not.toBeInTheDocument();
  });

  it("invites unconfigured users to set up their banks", async () => {
    m.getBenefitSettings.mockResolvedValue({ banks, profile: emptyProfile });
    m.searchBenefits.mockResolvedValue({
      ...searchResult,
      profileConfigured: false,
      items: [],
      total: 0,
    });
    renderAt("/app/finances/benefits");
    expect(
      await screen.findByRole("link", { name: "Configurar mis bancos" }),
    ).toHaveAttribute("href", "/app/finances/benefits/settings");
    expect(screen.queryByText(/No encontramos/)).not.toBeInTheDocument();
  });

  it("suggests other days when there is nothing today", async () => {
    m.searchBenefits.mockResolvedValue({
      ...searchResult,
      items: [],
      total: 0,
      staleBanks: [],
    });
    const user = userEvent.setup();
    renderAt("/app/finances/benefits?category=gastronomia");
    expect(
      await screen.findByRole("heading", {
        name: "No encontramos beneficios para hoy en Gastronomía",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver esta semana" }));
    await waitFor(() =>
      expect(m.searchBenefits).toHaveBeenLastCalledWith(
        query({ category: "gastronomia", day: "week" }),
      ),
    );
  });

  it("recovers from a load error", async () => {
    m.searchBenefits.mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderAt("/app/finances/benefits");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar tus beneficios",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("link", { name: /Coto/ }),
    ).toBeInTheDocument();
  });
});

describe("benefit settings", () => {
  it("validates before saving", async () => {
    m.getBenefitSettings.mockResolvedValue({ banks, profile: emptyProfile });
    const user = userEvent.setup();
    renderAt("/app/finances/benefits/settings");

    await user.click(
      await screen.findByRole("button", { name: "Guardar y activar aviso" }),
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Elegí al menos un banco.");
    expect(alert).toHaveTextContent("Contanos si pagás con MODO.");
    expect(alert).toHaveTextContent("Elegí al menos una categoría.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(m.saveBenefitProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText("Se activa cuando guardás tu configuración."),
    ).toBeInTheDocument();
  });

  it("configures banks, tier, cards, MODO and categories", async () => {
    m.getBenefitSettings.mockResolvedValue({ banks, profile: emptyProfile });
    m.saveBenefitProfile.mockResolvedValue({ ...profile, enabled: true });
    const user = userEvent.setup();
    const router = renderAt("/app/finances/benefits/settings");

    await user.type(
      await screen.findByRole("searchbox", { name: "Agregar banco" }),
      "mac",
    );
    const options = screen.getByRole("list", { name: "Bancos disponibles" });
    expect(within(options).queryByText("BBVA")).not.toBeInTheDocument();
    await user.click(within(options).getByRole("button", { name: /Macro/ }));
    const mine = screen.getByRole("list", { name: "Tus bancos" });
    expect(
      within(mine).getByText("Promos MODO + catálogo propio"),
    ).toBeInTheDocument();
    expect(within(mine).getByRole("radio", { name: "No sé" })).toBeChecked();
    await user.click(within(mine).getByRole("radio", { name: "Selecta" }));
    await user.click(
      within(mine).getByRole("checkbox", { name: "Visa crédito" }),
    );

    await user.clear(screen.getByRole("searchbox", { name: "Agregar banco" }));
    await user.click(
      within(
        screen.getByRole("list", { name: "Bancos disponibles" }),
      ).getByRole("button", { name: /BBVA/ }),
    );
    expect(
      within(screen.getByRole("list", { name: "Tus bancos" })).getByText(
        "Solo promos con MODO",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Tu nivel en BBVA" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Sí" }));
    await user.click(screen.getByRole("button", { name: "Supermercados" }));
    await user.click(
      screen.getByRole("button", { name: "Guardar y activar aviso" }),
    );

    expect(m.saveBenefitProfile).toHaveBeenCalledWith({
      data: {
        banks: [
          {
            slug: "macro",
            tier: "selecta",
            cards: [{ type: "credit", network: "visa" }],
          },
          { slug: "bbva", tier: null, cards: [] },
        ],
        usesModo: true,
        categories: ["supermercados"],
      },
    });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/app/finances/benefits"),
    );
  });
});

describe("benefit detail", () => {
  it("explains requirements, variants and how to verify", async () => {
    renderAt(`/app/finances/benefits/${detail.id}`);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Jumbo" }),
    ).toBeInTheDocument();
    expect(m.getBenefit).toHaveBeenCalledWith({ data: { id: detail.id } });
    expect(
      screen.getByText(
        "Necesitás una tarjeta de crédito Visa de Galicia y (pagar con MODO o cobrar el sueldo en Galicia).",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Con tu nivel podrías tener más.", { exact: false }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Según el nivel" })).getByText(
        "10% de ahorro",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Tope sin confirmar")).toBeInTheDocument();
    expect(screen.getByText("Mínimo sin confirmar")).toBeInTheDocument();
    expect(screen.queryByText(/Lo podés usar/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Si tenés el nivel requerido, lo podrías usar/),
    ).toBeInTheDocument();

    const verify = screen.getByRole("region", {
      name: "Verificá antes de pagar",
    });
    const link = within(verify).getByRole("link", { name: /Ver en Galicia/ });
    expect(link).toHaveAttribute("href", detail.verifyUrl);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(verify).getByText("Buscá «Jumbo»")).toBeInTheDocument();
    expect(within(verify).getByText(/^Actualizado:/)).toBeInTheDocument();
  });

  it("never renders a non-http verification link", async () => {
    m.getBenefit.mockResolvedValue({
      ...detail,
      ...coto,
      eligibility: detail.eligibility,
      legalText: null,
      warnings: [],
      verifyUrl: "javascript:alert(1)",
    });
    renderAt(`/app/finances/benefits/${detail.id}`);
    expect(
      await screen.findByText("Enlace de verificación no disponible"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Ver en MODO/ }),
    ).not.toBeInTheDocument();
  });
});
