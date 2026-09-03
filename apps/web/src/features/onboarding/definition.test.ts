import { describe, expect, it } from "vitest";
import {
  getActiveSteps,
  onboardingSteps,
  type OnboardingAnswers,
  validateStep,
} from "./definition";

describe("onboarding validation groups", () => {
  it.each([1, 2, 3, 4, 5])(
    "requires the selected upload for card %s",
    (cardNumber) => {
      const step = onboardingSteps.find(
        ({ id }) => id === `t${cardNumber}_p16`,
      );

      expect(validateStep(step, {
        [`t${cardNumber}_cuotas_modo`]: "Subir foto o archivo",
      })).toEqual({
        [`t${cardNumber}_upload_url`]: "Subí el resumen para continuar.",
      });
    },
  );

  it.each([
    ["p11", "var_total_directo", "Completá al menos un gasto de vida diaria."],
    ["p12", "d_total_directo", "Completá al menos un gasto de gustitos."],
  ] as const)(
    "keeps detailed expense validation for %s in its selected mode",
    (stepId, errorId, detailMessage) => {
      const step = onboardingSteps.find(({ id }) => id === stepId);

      expect(validateStep(step, {
        [`${stepId}_modo`]: "Tengo el total en la cabeza",
      })).toEqual({
        [errorId]: "Ingresá un total aproximado mayor a cero.",
      });
      expect(validateStep(step, {
        [`${stepId}_modo`]: "Quiero desglosar",
      })).toEqual({
        [stepId === "p11" ? "var_comida" : "d_salidas"]: detailMessage,
      });
    },
  );

  it.each([
    ["missing concepto", { monto: 500, desde: "", hasta: "" }],
    ["non-string concepto", { concepto: 42, monto: 500, desde: "", hasta: "" }],
  ] as const)(
    "returns a concept error for a repeated item with %s",
    (_label, item) => {
      const step = onboardingSteps.find(({ id }) => id === "p11")!;

      expect(validateStep(step, {
        p11_modo: "Quiero desglosar",
        var_otros: [item],
      } as unknown as OnboardingAnswers)).toEqual({
        "var_otros.0.concepto": "Ingresá el concepto.",
      });
    },
  );

});

describe("onboarding malformed repeated inputs", () => {

  it("preserves blank and whitespace repeated amount behavior", () => {
    const step = onboardingSteps.find(({ id }) => id === "p11")!;
    const validateAmount = (monto: string) => validateStep(step, {
      p11_modo: "Quiero desglosar",
      var_comida: 1000,
      var_otros: [{ concepto: "Otro", monto, desde: "", hasta: "" }],
    });

    const blankErrors = validateAmount("");
    expect(blankErrors).toEqual({});
    expect(validateAmount("   ")).toEqual(blankErrors);
  });

});

describe("onboarding repeated input normalization", () => {

  it.each([
    ["concepto missing", { monto: 1000, fecha: "ene-27" }, "concepto"],
    ["concepto non-string", { concepto: 42, monto: 1000, fecha: "ene-27" }, "concepto"],
    ["fecha missing", { concepto: "Auto", monto: 1000 }, "fecha"],
    ["fecha non-string", { concepto: "Auto", monto: 1000, fecha: 2027 }, "fecha"],
  ] as const)(
    "returns a required error for a purchase with %s",
    (_label, item, field) => {
      const step = onboardingSteps.find(({ id }) => id === "p14")!;

      expect(validateStep(step, {
        p14_tiene_compras: "Sí",
        compras_necesarias: [item],
      } as unknown as OnboardingAnswers)).toEqual({
        [`compras_necesarias.0.${field}`]: "Este campo es requerido.",
      });
    },
  );

  it("treats whitespace purchase amounts like blank amounts", () => {
    const step = onboardingSteps.find(({ id }) => id === "p14")!;
    const validateAmount = (monto: string) => validateStep(step, {
      p14_tiene_compras: "Sí",
      compras_necesarias: [{ concepto: "Auto", monto, fecha: "ene-27" }],
    } as unknown as OnboardingAnswers);

    const blankErrors = validateAmount("");
    expect(blankErrors).toEqual({
      "compras_necesarias.0.monto": "Este campo es requerido.",
    });
    expect(validateAmount("   ")).toEqual(blankErrors);
  });

});

describe("onboarding extra income validation", () => {

  it.each([
    ["missing", undefined],
    ["non-array", "no es un array"],
    ["empty", []],
  ] as const)("requires at least one extra income when the answer is %s", (_label, ingresos_extra) => {
    const step = onboardingSteps.find(({ id }) => id === "p7")!;

    expect(validateStep(step, {
      extra_tiene: "Sí",
      ...(ingresos_extra === undefined ? {} : { ingresos_extra }),
    } as unknown as OnboardingAnswers)).toEqual({
      ingresos_extra: 'Agregá un ingreso extra o elegí "No".',
    });
  });

  it("validates every required ingresos_extra item field", () => {
    const step = onboardingSteps.find(({ id }) => id === "p7")!;

    expect(validateStep(step, {
      extra_tiene: "Sí",
      ingresos_extra: [{ concepto: "", monto: "", desde: "", hasta: "" }],
    })).toEqual({
      "ingresos_extra.0.concepto": "Este campo es requerido.",
      "ingresos_extra.0.monto": "Este campo es requerido.",
      "ingresos_extra.0.desde": "Este campo es requerido.",
    });
  });

});

describe("onboarding extra income date validation", () => {

  it.each([
    ["junk", "no es un número", "Ingresá un número válido."],
    ["negative", -1, "El monto no puede ser negativo."],
  ] as const)("rejects an ingresos_extra amount that is %s", (_label, monto, error) => {
    const step = onboardingSteps.find(({ id }) => id === "p7")!;

    expect(validateStep(step, {
      extra_tiene: "Sí",
      ingresos_extra: [{ concepto: "Bono", monto, desde: "ene-27", hasta: "" }],
    } as unknown as OnboardingAnswers)).toEqual({
      "ingresos_extra.0.monto": error,
    });
  });

  it("rejects an ingresos_extra end date earlier than its start date", () => {
    const step = onboardingSteps.find(({ id }) => id === "p7")!;

    expect(validateStep(step, {
      extra_tiene: "Sí",
      ingresos_extra: [{ concepto: "Bono", monto: 100, desde: "ene-27", hasta: "dic-26" }],
    })).toEqual({
      "ingresos_extra.0.hasta": "Elegí un mes igual o posterior al de inicio.",
    });
  });

  it.each([
    ["equal months", "ene-27", "ene-27"],
    ["cross-year boundary", "dic-27", "ene-28"],
    ["open-ended", "ene-27", ""],
  ] as const)("accepts ingresos_extra with %s", (_label, desde, hasta) => {
    const step = onboardingSteps.find(({ id }) => id === "p7")!;

    expect(validateStep(step, {
      extra_tiene: "Sí",
      ingresos_extra: [{ concepto: "Bono", monto: 100, desde, hasta }],
    })).toEqual({});
  });

});

describe("onboarding card input normalization", () => {

  it("normalizes finite numeric strings for card visibility and validation", () => {
    const cardStep = onboardingSteps.find(({ id }) => id === "t1_p16")!;
    const activeIds = getActiveSteps({ p15_tarjetas: "2" }).map(({ id }) => id);

    expect(activeIds).toContain("t1_p16");
    expect(activeIds).toContain("t2_p16");
    expect(activeIds).not.toContain("t3_p16");
    expect(validateStep(cardStep, {
      t1_cuotas_modo: "Copiar el renglón mes a mes",
      t1_resumen_ars: "100",
      t1_cuotas_m1: "100",
    })).toEqual({});
    expect(validateStep(onboardingSteps.find(({ id }) => id === "p15")!, {
      p15_tarjetas: "junk",
    })).toEqual({ p15_tarjetas: "Ingresá un número entero entre 0 y 5." });
    expect(validateStep(onboardingSteps.find(({ id }) => id === "p15")!, {
      p15_tarjetas: "",
    })).toEqual({ p15_tarjetas: "Ingresá un número entero entre 0 y 5." });
  });

  it("rejects upload keys that are empty after trimming", () => {
    const step = onboardingSteps.find(({ id }) => id === "t1_p16")!;

    expect(validateStep(step, {
      t1_cuotas_modo: "Subir foto o archivo",
      t1_upload_url: "   ",
    })).toEqual({
      t1_upload_url: "Subí el resumen para continuar.",
    });
  });
});
