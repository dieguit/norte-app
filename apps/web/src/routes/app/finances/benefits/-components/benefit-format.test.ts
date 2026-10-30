import { describe, expect, it } from "vitest";
import { coto, jumbo } from "./benefit-fixtures";
import {
  capText,
  daysText,
  minimumText,
  nextDateText,
  requirementsText,
  updatedText,
  usableWithText,
} from "./benefit-format";

const name = (slug: string) =>
  ({ galicia: "Galicia", macro: "Macro" })[slug] ?? slug;

describe("benefit format", () => {
  it("shows missing caps and minimums as unconfirmed", () => {
    expect(capText(jumbo)).toBe("Tope sin confirmar");
    expect(capText({ capState: "none", caps: [] })).toBe("Sin tope");
    expect(capText(coto)).toBe("Tope $ 15.000 por mes");
    expect(minimumText(null)).toBe("Mínimo sin confirmar");
    expect(minimumText(0)).toBe("Sin compra mínima");
    expect(minimumText(500_050)).toBe("Compra mínima $ 5.000,50");
  });

  it("writes requirements in plain language and adds MODO only once", () => {
    const card = {
      card: {
        issuerProviderSlugs: ["macro"],
        types: ["debit" as const],
        segments: ["selecta"],
      },
    };
    expect(requirementsText(card, true, name)).toBe(
      "Necesitás una tarjeta de débito de Macro nivel selecta y pagar con MODO.",
    );
    expect(
      requirementsText(
        { allOf: [card, { membership: { instrumentSlug: "modo" } }] },
        true,
        name,
      ),
    ).toBe(
      "Necesitás una tarjeta de débito de Macro nivel selecta y pagar con MODO.",
    );
  });

  it("formats days, next date and who can use it", () => {
    expect(daysText(coto.validity)).toBe("Jueves · hasta 30/11");
    expect(daysText({ from: null, to: null, weekdays: null })).toBe(
      "Todos los días · sin fecha de fin confirmada",
    );
    expect(nextDateText("2026-11-05", "2026-11-01")).toBe(
      "Próximo: jueves 5/11",
    );
    expect(nextDateText("2026-11-01", "2026-11-01")).toBeNull();
    expect(usableWithText({ usableWith: [], requiresModo: true })).toBe(
      "Pagando con MODO",
    );
    expect(
      updatedText(
        "2026-10-31T06:00:00.000Z",
        new Date("2026-10-31T15:00:00.000Z"),
      ),
    ).toBe("Actualizado: hoy 03:00");
  });
});
