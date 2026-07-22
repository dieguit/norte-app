import { z } from "zod";

export type ExtraIncome = {
  concepto: string;
  monto: string | number;
  desde: string;
  hasta: string;
};

export type OnboardingAnswer =
  string | number | boolean | string[] | ExtraIncome[];
export type OnboardingAnswers = Record<string, OnboardingAnswer>;

const extraIncomeSchema = z.object({
  concepto: z.string(),
  monto: z.union([z.string(), z.number()]),
  desde: z.string(),
  hasta: z.string(),
});

export const onboardingAnswerSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(extraIncomeSchema),
]);

export type VisibleWhen = (answers: OnboardingAnswers) => boolean;

export type RepeatedItemField = {
  key: keyof ExtraIncome;
  type: "text" | "number" | "month";
  label: string;
  required?: boolean;
  helpText?: string;
};

export type OnboardingField = {
  id: string;
  type:
    | "radio"
    | "checkbox"
    | "text"
    | "number"
    | "month"
    | "email"
    | "tel"
    | "upload"
    | "select"
    | "currency"
    | "repeated";
  label: string;
  maxSelections?: number;
  options?: readonly string[];
  helpText?: string;
  required?: boolean;
  requiredMessage?: string;
  visibleWhen?: VisibleWhen;
  disabledOptions?: readonly string[];
  itemFields?: readonly RepeatedItemField[];
  addLabel?: string;
  maxItems?: number;
  itemTitleKey?: keyof ExtraIncome;
  itemTitlePrefix?: string;
  itemVisibleWhen?: (item: ExtraIncome) => boolean;
  allowAdd?: boolean;
  allowRemove?: boolean;
};

const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));

const monthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function getMonthlyDateOptions(now = new Date()): string[] {
  return Array.from({ length: 18 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${monthNames[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
  });
}

export type OnboardingStep = {
  id: string;
  title: string;
  titleWithName?: string;
  intro?: string;
  introWithName?: string;
  fields: readonly OnboardingField[];
  visibleWhen?: VisibleWhen;
};

const fixedExpenseExpiryFields = [
  ["fijo_alquiler", "fijo_alquiler_hasta", "Alquiler / vivienda"],
  ["fijo_colegio", "fijo_colegio_hasta", "Colegio"],
  ["fijo_prepaga", "fijo_prepaga_hasta", "Prepaga / salud"],
  ["fijo_prestamos", "fijo_prestamos_hasta", "Préstamos (cuotas mensuales)"],
  [
    "fijo_servicios",
    "fijo_servicios_hasta",
    "Servicios (luz, gas, internet, celular)",
  ],
  ["fijo_seguros", "fijo_seguros_hasta", "Seguros"],
  ["fijo_ayuda", "fijo_ayuda_hasta", "Ayuda a familiares"],
] as const;

function hasPositiveAmount(answers: OnboardingAnswers, id: string) {
  const value = answers[id];
  const amount =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0;
}

const legacyFixedOtherAmountIds = ["fijo_otro1_monto", "fijo_otro2_monto"];

function inferFixedExpenseMode(answers: OnboardingAnswers) {
  if (
    answers.p9_modo === "Tengo el total en la cabeza" ||
    answers.p9_modo === "Quiero desglosar"
  ) {
    return answers.p9_modo;
  }
  if (hasPositiveAmount(answers, "fijo_total_directo")) {
    return "Tengo el total en la cabeza";
  }
  if (
    fixedExpenseExpiryFields.some(([amountId]) =>
      hasPositiveAmount(answers, amountId),
    ) ||
    legacyFixedOtherAmountIds.some((id) => hasPositiveAmount(answers, id)) ||
    hasPositiveOther(answers)
  ) {
    return "Quiero desglosar";
  }
  return undefined;
}

function withInferredFixedExpenseMode(answers: OnboardingAnswers) {
  const normalized = { ...answers };
  if (!Array.isArray(normalized.fijo_otros)) {
    const legacyOthers = [1, 2].flatMap((index) => {
      const conceptKey = `fijo_otro${index}_concepto`;
      const amountKey = `fijo_otro${index}_monto`;
      const expiryKey = `fijo_otro${index}_hasta`;
      if (
        normalized[conceptKey] === undefined &&
        normalized[amountKey] === undefined &&
        normalized[expiryKey] === undefined
      ) {
        return [];
      }
      const amount = normalized[amountKey];
      const numericAmount =
        typeof amount === "string" && amount.trim() !== ""
          ? Number(amount)
          : amount;
      return [{
        concepto: typeof normalized[conceptKey] === "string"
          ? normalized[conceptKey]
          : "",
        monto: typeof numericAmount === "number" && Number.isFinite(numericAmount)
          ? numericAmount
          : typeof amount === "string" || typeof amount === "number"
            ? amount
          : "",
        desde: "",
        hasta: typeof normalized[expiryKey] === "string"
          ? normalized[expiryKey]
          : "",
      } satisfies ExtraIncome];
    });
    if (legacyOthers.length > 0) normalized.fijo_otros = legacyOthers;
  }
  for (const index of [1, 2]) {
    delete normalized[`fijo_otro${index}_concepto`];
    delete normalized[`fijo_otro${index}_monto`];
    delete normalized[`fijo_otro${index}_hasta`];
  }

  const p9Mode = inferFixedExpenseMode(normalized);

  return {
    ...normalized,
    ...(p9Mode && normalized.p9_modo === undefined ? { p9_modo: p9Mode } : {}),
  };
}

export const isDetailedFixedExpense = (answers: OnboardingAnswers) =>
  inferFixedExpenseMode(answers) === "Quiero desglosar";

export const hasPositiveOther = (answers: OnboardingAnswers) =>
  Array.isArray(answers.fijo_otros) &&
  (answers.fijo_otros as (string | ExtraIncome)[]).some(
    (item) => {
      if (typeof item !== "object" || item === null) return false;
      const rawMonto = (item as ExtraIncome).monto;
      const monto =
        typeof rawMonto === "string" && rawMonto.trim() !== ""
          ? Number(rawMonto)
          : rawMonto;
      return typeof monto === "number" && Number.isFinite(monto) && monto > 0;
    },
  );

function hasDetailedFixedExpense(answers: OnboardingAnswers) {
  return isDetailedFixedExpense(answers);
}

const incomeSourceExpiryFields = [
  ["Sueldo fijo (relación de dependencia)", "ing_sueldo_fijo_hasta"],
  [
    "Trabajos propios (freelance, clases, negocio, honorarios)",
    "ing_trabajos_propios_hasta",
  ],
  [
    "Aportes de un tercero (cuota alimentaria, alquiler que cobrás, ayuda familiar)",
    "ing_aportes_tercero_hasta",
  ],
  ["Jubilación / pensión", "ing_jubilacion_pension_hasta"],
  ["Otro", "ing_otro_hasta"],
] as const;

function hasSelectedIncomeSource(answers: OnboardingAnswers, source: string) {
  return (
    Array.isArray(answers.p5_fuentes) &&
    (answers.p5_fuentes as string[]).includes(source)
  );
}

export const onboardingSteps: readonly OnboardingStep[] = [
  {
    id: "p0",
    title: "¿Cómo te llamás?",
    fields: [{ id: "nombre", type: "text", label: "Nombre", required: true }],
  },
  {
    id: "p23",
    title: "¿A dónde te mandamos tu informe?",
    titleWithName: "¡Un gusto, {name}! ¿A dónde te mandamos tu informe?",
    fields: [
      {
        id: "contacto_canal",
        type: "radio",
        label: "Elegí cómo querés recibirlo",
        options: ["WhatsApp", "Email"],
        required: true,
      },
      {
        id: "whatsapp",
        type: "tel",
        label: "WhatsApp (número)",
        required: true,
        visibleWhen: (answers) => answers.contacto_canal === "WhatsApp",
      },
      {
        id: "email",
        type: "email",
        label: "Email",
        required: true,
        visibleWhen: (answers) => answers.contacto_canal === "Email",
      },
    ],
  },
  {
    id: "p1",
    title: "¿Qué te está pesando más hoy con la plata?",
    fields: [
      {
        id: "p1_pesa",
        type: "radio",
        label: "Selecciona una opción",
        options: [
          "Arrastro deudas de tarjeta que no logro cortar",
          "Las cuotas se me acumularon y me comen el sueldo",
          "Llego justo a fin de mes, sin margen para nada",
          "Gano bien pero no sé a dónde se va la plata",
          "Quiero ahorrar para algo concreto (viaje, casa, auto) y no arranco",
          "Me siento al día, pero sin colchón si pasa algo",
          "Estoy bien, quiero ver mi situación con otros ojos",
          "Otra",
        ],
      },
      {
        id: "p1_otra",
        type: "text",
        label: "Otra (texto corto, opcional)",
      },
    ],
  },
  {
    id: "p2",
    title:
      "Si tuvieses que cortar todos estos gastos, ¿cuál sería el último?",
    fields: [
      {
        id: "p2_ultimo",
        type: "radio",
        label: "Elegí una opción",
        required: true,
        requiredMessage: "Elegí una opción para continuar.",
        options: [
          "Colegio privado de mis hijos (pasarlo a uno público)",
          "Actividades extraescolares de mis hijos (dejarlas por ahora)",
          "Alquiler (mudarme a algo más chico)",
          "Comida (comprar más barato)",
          "Prepaga (atenderme por el plan básico)",
          "Terapias (espaciarlas o pausarlas)",
          "Mis actividades (dejar gym, deporte o hobbies)",
          "Salidas con amigos el finde",
          "Ayuda a familiares (reducirla por un tiempo)",
          "Suscripciones y servicios digitales (dar de baja los que no uso)",
          "Ropa (comprar solo si hace falta)",
          "Cuidado personal (hacerlo en casa o espaciarlo)",
        ],
      },
    ],
  },
  {
    id: "p3",
    title: "Si tuvieses que cortar todos estos gastos, ¿cuál sería el primero?",
    fields: [
      {
        id: "p3_primero",
        type: "radio",
        label: "Elegí una opción",
        required: true,
        requiredMessage: "Elegí una opción para continuar.",
        options: [
          "Colegio privado de mis hijos (pasarlo a uno público)",
          "Actividades extraescolares de mis hijos (dejarlas por ahora)",
          "Alquiler (mudarme a algo más chico)",
          "Comida (comprar más barato)",
          "Prepaga (atenderme por el plan básico)",
          "Terapias (espaciarlas o pausarlas)",
          "Mis actividades (dejar gym, deporte o hobbies)",
          "Salidas con amigos el finde",
          "Ayuda a familiares (reducirla por un tiempo)",
          "Suscripciones y servicios digitales (dar de baja los que no uso)",
          "Ropa (comprar solo si hace falta)",
          "Cuidado personal (hacerlo en casa o espaciarlo)",
        ],
      },
    ],
  },
  {
    id: "p4",
    title: "¿Cuánta plata entra en tu casa en un mes normal, sumando todo?",
    intro: "Un número redondo está perfecto, no hace falta precisión.",
    introWithName:
      "{name}, un número redondo está perfecto, no hace falta precisión.",
    fields: [
      {
        id: "ing_total",
        type: "number",
        label: "Monto mensual ($)",
      },
    ],
  },
  {
    id: "p5",
    title: "¿De dónde viene ese ingreso?",
    fields: [
      {
        id: "p5_fuentes",
        type: "checkbox",
        label: "Selecciona los orígenes de tus ingresos",
        options: [
          "Sueldo fijo (relación de dependencia)",
          "Trabajos propios (freelance, clases, negocio, honorarios)",
          "Aportes de un tercero (cuota alimentaria, alquiler que cobrás, ayuda familiar)",
          "Jubilación / pensión",
          "Otro",
        ],
        required: true,
      },
    ],
  },
  {
    id: "p6",
    title:
      "Dijiste que recibís ingresos de un tercero. ¿Puede fallar o atrasarse?",
    visibleWhen: (answers) => {
      const fuentes = answers.p5_fuentes;
      if (Array.isArray(fuentes)) {
        return fuentes.some(
          (f) => typeof f === "string" && f.includes("Aportes de un tercero"),
        );
      }
      return false;
    },
    fields: [
      {
        id: "ing_tercero_falla",
        type: "radio",
        label: "¿Puede fallar o atrasarse?",
        options: ["Sí, a veces falla o se atrasa", "No, es confiable"],
      },
      {
        id: "ing_tercero_monto",
        type: "number",
        label: "¿De cuánto es, aproximado? ($)",
        visibleWhen: (answers) =>
          answers.ing_tercero_falla === "Sí, a veces falla o se atrasa",
      },
    ],
  },
  {
    id: "p8a",
    title: "¿Alguno de tus ingresos tiene fecha de vencimiento?",
    intro: "¿Hasta cuándo los recibís?",
    fields: [
      {
        id: "p8a_tiene_vencimiento",
        type: "radio",
        label: "¿Tiene vencimiento?",
        options: ["Sí", "No"],
        required: true,
      },
      ...incomeSourceExpiryFields.map(([source, id]) => ({
        id,
        type: "month" as const,
        label: `¿Hasta cuándo recibís ${source}?`,
        visibleWhen: (answers: OnboardingAnswers) =>
          answers.p8a_tiene_vencimiento === "Sí" &&
          hasSelectedIncomeSource(answers, source),
      })),
    ],
  },
  {
    id: "p8",
    title: "¿Cada cuánto suele aumentar tu ingreso principal? (opcional)",
    fields: [
      {
        id: "aumento_tipo",
        type: "radio",
        label: "¿Tiene aumentos periódicos?",
        options: ["Tiene aumentos periódicos", "No aumenta / no sé"],
      },
      {
        id: "aumento_meses",
        type: "number",
        label: "Cada cuántos meses",
        visibleWhen: (answers) =>
          answers.aumento_tipo === "Tiene aumentos periódicos",
      },
      {
        id: "aumento_pct",
        type: "number",
        label: "Porcentaje aproximado (%)",
        visibleWhen: (answers) =>
          answers.aumento_tipo === "Tiene aumentos periódicos",
      },
      {
        id: "aumento_proximo",
        type: "month",
        label: "Próximo aumento esperado en",
        visibleWhen: (answers) =>
          answers.aumento_tipo === "Tiene aumentos periódicos",
      },
    ],
  },
  {
    id: "p7",
    title: "¿Tenés algún ingreso extra YA definido para los próximos 12 meses?",
    intro:
      "Por ejemplo: aguinaldo, bono por resultados, una clase extra, una venta.",
    fields: [
      {
        id: "extra_tiene",
        type: "radio",
        label: "Seleccioná una opción",
        options: ["No", "Sí"],
        required: true,
      },
      {
        id: "ingresos_extra",
        type: "repeated",
        label: "Ingresos extra",
        addLabel: "Agregar Ingreso",
        maxItems: 10,
        itemFields: [
          { key: "concepto", type: "text", label: "Concepto", required: true },
          {
            key: "monto",
            type: "number",
            label: "Monto mensual ($)",
            required: true,
          },
          {
            key: "desde",
            type: "month",
            label: "Desde cuándo",
            helpText: "Elegí el primer mes en que lo vas a recibir.",
            required: true,
          },
          {
            key: "hasta",
            type: "month",
            label: "Hasta cuándo",
            helpText:
              "Elegí el último mes. Si elegís el mismo que en Desde cuándo, cuenta solo para ese mes.",
          },
        ],
        visibleWhen: (answers) => answers.extra_tiene === "Sí",
      },
    ],
  },
  {
    id: 'p8b',
    title: 'Ahora vamos a los gastos',
    intro:
      'Los vamos a mirar en tres grupos:\n\n**Pagos fijos**: los que tenés que pagar sí o sí todos los meses, como el alquiler o el colegio.\n\n**Gastos necesarios**: los que cambian según el mes y tus decisiones, pero siempre están, como la comida o la nafta.\n\n**Gustitos**: esos vienen después.',
    fields: [],
  },
  {
    id: "p9",
    title: "Lo que pagás sí o sí todos los meses",
    intro:
      "Vamos a lo que pagás sí o sí todos los meses. Eso que no elegís: te toca. Completá lo que aplique, o si sos de los que tienen el número total en la cabeza, saltá directo al final. Sin contar inflación, el número de hoy alcanza.",
    introWithName:
      "{name}, vamos a lo que pagás sí o sí todos los meses. Eso que no elegís: te toca. Completá lo que aplique, o si sos de los que tienen el número total en la cabeza, saltá directo al final. Sin contar inflación, el número de hoy alcanza.",
    fields: [
      {
        id: "p9_modo",
        type: "radio",
        label: "¿total en la cabeza o desglosás?",
        options: ["Tengo el total en la cabeza", "Quiero desglosar"],
        required: true,
      },
      {
        id: "fijo_alquiler",
        type: "number",
        label: "Alquiler / vivienda ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_colegio",
        type: "number",
        label: "Colegio ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_prepaga",
        type: "number",
        label: "Prepaga / salud ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_prestamos",
        type: "number",
        label: "Préstamos (cuotas mensuales) ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_servicios",
        type: "number",
        label: "Servicios (luz, gas, internet, celular) ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_seguros",
        type: "number",
        label: "Seguros ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_ayuda",
        type: "number",
        label: "Ayuda a familiares ($)",
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_otros",
        type: "repeated",
        label: "Otros gastos fijos",
        addLabel: "Agregar otro",
        maxItems: 5,
        helpText: "No hace falta que llenes todos",
        itemFields: [
          { key: "concepto", type: "text", label: "Concepto", required: true },
          { key: "monto", type: "number", label: "Monto ($)", required: true },
        ],
        visibleWhen: (answers) => answers.p9_modo === "Quiero desglosar",
      },
      {
        id: "fijo_total_directo",
        type: "number",
        label: "Total aproximado ($)",
        visibleWhen: (answers) =>
          answers.p9_modo === "Tengo el total en la cabeza",
      },
    ],
  },
  {
    id: "p10",
    title: "¿Alguno tiene fecha de vencimiento final?",
    intro:
      "De esos pagos obligatorios, ¿alguno tiene fecha de vencimiento final? O sea: en algún momento se termina y esa plata deja de salir de tu bolsillo. Un préstamo al que le quedan cuotas, el colegio que en enero no se paga.",
    fields: [
      {
        id: "p10_tiene_vencimiento",
        type: "radio",
        label: "¿Tiene vencimiento final?",
        options: [
          "Sí",
          "No, si pienso en el próximo año, todos son permanentes: van a estar ahí mes a mes.",
        ],
      },
      ...fixedExpenseExpiryFields.map((item) => {
        const amountId = item[0];
        const hastaId = item[1];
        const label = item[2];
        return {
          id: hastaId,
          type: "month" as const,
          label: `¿Cuándo termina ${label}?`,
          visibleWhen: (answers: OnboardingAnswers) =>
            answers.p10_tiene_vencimiento === "Sí" &&
            hasDetailedFixedExpense(answers) &&
            hasPositiveAmount(answers, amountId),
        };
      }),
      {
        id: "fijo_otros",
        type: "repeated",
        label: "Vencimientos de otros gastos",
        itemTitleKey: "concepto",
        itemTitlePrefix: "¿Cuándo termina",
        itemVisibleWhen: ({ monto }) => {
          const amount =
            typeof monto === "string" && monto.trim() !== ""
              ? Number(monto)
              : monto;
          return typeof amount === "number" && Number.isFinite(amount) && amount > 0;
        },
        allowAdd: false,
        allowRemove: false,
        itemFields: [{ key: "hasta", type: "month", label: "¿Cuándo termina?" }],
        visibleWhen: (answers) =>
          answers.p10_tiene_vencimiento === "Sí" &&
          isDetailedFixedExpense(answers) &&
          hasPositiveOther(answers),
      },
      ...(["fin1", "fin2", "fin3", "fin4"] as const).flatMap(
        (prefix, index) => [
          {
            id: `${prefix}_concepto`,
            type: "text" as const,
            label: `Concepto ${index + 1}`,
            helpText:
              index === 0 ? "No hace falta que llenes todos" : undefined,
            visibleWhen: (answers: OnboardingAnswers) =>
              answers.p10_tiene_vencimiento === "Sí" &&
              !hasDetailedFixedExpense(answers),
          },
          {
            id: `${prefix}_cuota`,
            type: "number" as const,
            label: "Cuota mensual ($)",
            visibleWhen: (answers: OnboardingAnswers) =>
              answers.p10_tiene_vencimiento === "Sí" &&
              !hasDetailedFixedExpense(answers),
          },
          {
            id: `${prefix}_hasta`,
            type: "month" as const,
            label: "¿Cuándo termina?",
            visibleWhen: (answers: OnboardingAnswers) =>
              answers.p10_tiene_vencimiento === "Sí" &&
              !hasDetailedFixedExpense(answers),
          },
        ],
      ),
    ],
  },
  {
    id: "p11",
    title: "La vida de todos los días",
    intro:
      "Ahora la vida de todos los días. Cosas necesarias, más variables que las fijas de arriba, pero que siempre están. Y no te preocupes: los gustitos vienen después, no los mezcles acá.",
    fields: [
      {
        id: "p11_modo",
        type: "radio",
        label: "¿total en la cabeza o desglosás?",
        options: ["Tengo el total en la cabeza", "Quiero desglosar"],
        required: true,
      },
      {
        id: "var_comida",
        type: "number",
        label: "Comida / súper ($)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_transporte",
        type: "number",
        label: "Nafta / transporte ($)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_farmacia",
        type: "number",
        label: "Farmacia ($)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_otro1_concepto",
        type: "text",
        label: "Otro 1 (concepto)",
        helpText: "No hace falta que llenes todos",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_otro1_monto",
        type: "number",
        label: "Otro 1 ($)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_otro2_concepto",
        type: "text",
        label: "Otro 2 (concepto)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_otro2_monto",
        type: "number",
        label: "Otro 2 ($)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_otro3_concepto",
        type: "text",
        label: "Otro 3 (concepto)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_otro3_monto",
        type: "number",
        label: "Otro 3 ($)",
        visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar",
      },
      {
        id: "var_total_directo",
        type: "number",
        label: "Total aproximado ($)",
        visibleWhen: (answers) =>
          answers.p11_modo === "Tengo el total en la cabeza",
      },
    ],
  },
  {
    id: "p12",
    title: "Los gustitos",
    intro:
      "Ahora sí: los gustitos pecaminosos. Esos que te das porque te los merecés, y está perfecto. Solo queremos saber cuánto pesan. Acá nadie te reta.",
    fields: [
      {
        id: "p12_modo",
        type: "radio",
        label: "¿total en la cabeza o desglosás?",
        options: ["Tengo el total en la cabeza", "Quiero desglosar"],
        required: true,
      },
      {
        id: "d_salidas",
        type: "number",
        label: "Salidas ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_ropa",
        type: "number",
        label: "Ropa ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_delivery",
        type: "number",
        label: "Delivery ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_susc",
        type: "number",
        label: "Suscripciones ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_hobbies",
        type: "number",
        label: "Hobbies / actividades propias ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_otro1_concepto",
        type: "text",
        label: "Otro 1 (concepto)",
        helpText: "No hace falta que llenes todos",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_otro1_monto",
        type: "number",
        label: "Otro 1 ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_otro2_concepto",
        type: "text",
        label: "Otro 2 (concepto)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_otro2_monto",
        type: "number",
        label: "Otro 2 ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_otro3_concepto",
        type: "text",
        label: "Otro 3 (concepto)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_otro3_monto",
        type: "number",
        label: "Otro 3 ($)",
        visibleWhen: (answers) => answers.p12_modo === "Quiero desglosar",
      },
      {
        id: "d_total_directo",
        type: "number",
        label: "Total aproximado ($)",
        visibleWhen: (answers) =>
          answers.p12_modo === "Tengo el total en la cabeza",
      },
    ],
  },
  {
    id: "p13",
    title: "¿Qué harías con cada gustito si hubiera que reducir gastos?",
    intro:
      "De esos gustitos: si mañana hiciera falta apretar en serio, ¿qué harías con cada uno? Y no me mientas, porque no me mentís a mí, te mentís a vos mismo.",
    fields: [
      ...(
        [
          ["e13_salidas", "Salidas", "d_salidas"],
          ["e13_ropa", "Ropa", "d_ropa"],
          ["e13_delivery", "Delivery", "d_delivery"],
          ["e13_susc", "Suscripciones", "d_susc"],
          ["e13_hobbies", "Hobbies", "d_hobbies"],
          ["e13_otro1", "Otro 1", "d_otro1_monto"],
          ["e13_otro2", "Otro 2", "d_otro2_monto"],
          ["e13_otro3", "Otro 3", "d_otro3_monto"],
        ] as const
      ).map(([id, label, answerId]) => ({
        id,
        type: "radio" as const,
        label,
        options: [
          "Lo llevo a cero",
          "Lo reduzco a la mitad",
          "No lo toco ni en crisis",
        ],
        visibleWhen: (answers: OnboardingAnswers) =>
          answers.p12_modo === "Tengo el total en la cabeza"
            ? !id.startsWith("e13_otro")
            : hasPositiveAmount(answers, answerId),
      })),
    ],
  },
  {
    id: "p14",
    title: "Compras necesarias que tarde o temprano van a llegar",
    intro:
      "¿Hay alguna compra que sabés que va a caer en los próximos 12 meses, aunque no sepas cuándo? No un gusto, una de esas que no se negocian: el auto que ya hace ruiditos, los anteojos, el lavarropas que agoniza.",
    fields: [
      {
        id: "p14_tiene_compras",
        type: "radio",
        label: "¿Tiene compras previstas?",
        options: ["Sí", "No"],
      },
      {
        id: "n1_concepto",
        type: "text",
        label: "Concepto 1",
        helpText: "No hace falta que llenes todos",
        visibleWhen: (answers) => answers.p14_tiene_compras === "Sí",
      },
      {
        id: "n1_monto",
        type: "number",
        label: "Monto aproximado 1 ($)",
        visibleWhen: (answers) => answers.p14_tiene_compras === "Sí",
      },
      {
        id: "n2_concepto",
        type: "text",
        label: "Concepto 2",
        visibleWhen: (answers) => answers.p14_tiene_compras === "Sí",
      },
      {
        id: "n2_monto",
        type: "number",
        label: "Monto aproximado 2 ($)",
        visibleWhen: (answers) => answers.p14_tiene_compras === "Sí",
      },
      {
        id: "n3_concepto",
        type: "text",
        label: "Concepto 3",
        visibleWhen: (answers) => answers.p14_tiene_compras === "Sí",
      },
      {
        id: "n3_monto",
        type: "number",
        label: "Monto aproximado 3 ($)",
        visibleWhen: (answers) => answers.p14_tiene_compras === "Sí",
      },
    ],
  },
  {
    id: "p15",
    title: "¿Usás tarjeta de crédito?",
    fields: [
      {
        id: "p15_tarjetas",
        type: "number",
        label: "¿Cuántas tarjetas usás? (0 a 5)",
      },
    ],
  },
  ...[1, 2, 3, 4, 5].flatMap((n): OnboardingStep[] => {
    const manualMode = (answers: OnboardingAnswers) =>
      answers[`t${n}_cuotas_modo`] === "Copiar el renglón mes a mes";
    const uploadMode = (answers: OnboardingAnswers) =>
      answers[`t${n}_cuotas_modo`] === "Subir foto o archivo";

    return [
      {
        id: `t${n}_p16`,
        title: `Tarjeta ${n} - el último resumen`,
        intro: `Tarjeta ${n}: agarrá el último resumen, o abrí la app del banco, no te vamos a hacer revolver cajones. ¿De cuánto vino?`,
        visibleWhen: (answers: OnboardingAnswers) => {
          const cards = answers.p15_tarjetas;
          return typeof cards === "number" && cards >= n;
        },
        fields: [
          {
            id: `t${n}_cuotas_modo`,
            type: "radio",
            label: "Elegí el camino que te resulte más cómodo",
            options: [
              "Subir foto o archivo",
              "Copiar el renglón mes a mes",
              "No lo tengo a mano, que Norte me lo pida después por WhatsApp",
            ],
          },
          {
            id: `t${n}_upload_url`,
            type: "upload",
            label: "Subir foto o archivo",
            visibleWhen: uploadMode,
          },
          {
            id: `t${n}_resumen_ars`,
            type: "number",
            label: "En pesos ($)",
            helpText: "Cargá el total que figura en tu último resumen, en pesos.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_resumen_usd`,
            type: "number",
            label: "En dólares (US$)",
            helpText: "Cargá el total en dólares si aparece en tu resumen.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_cierre_dia`,
            type: "select",
            label: "Día de cierre",
            options: dayOptions,
            helpText: "Elegí el día del mes en que cierra esta tarjeta.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_vto_dia`,
            type: "select",
            label: "Día de vencimiento",
            options: dayOptions,
            helpText: "Elegí el día límite para pagar el resumen.",
            visibleWhen: manualMode,
          },
          ...[1, 2, 3, 4, 5, 6].map((month) => ({
            id: `t${n}_cuotas_m${month}`,
            type: "number" as const,
            label: `Mes ${month} ($)`,
            helpText: `Cargá cuánto te queda pagar en ${month} cuotas.`,
            visibleWhen: manualMode,
          })),
          {
            id: `t${n}_cuotas_resto`,
            type: "number",
            label: "¿Y después de eso quedan más cuotas por pagar? ($)",
            helpText: "Cargá el total mensual de cuotas que queda después de estos seis meses.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_cuotas_resto_hasta`,
            type: "month",
            label: "¿Hasta cuando tendrías que pagar? (mes/año)",
            helpText: "Elegí el último mes en que vas a pagar esas cuotas.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_arrastre`,
            type: "number",
            label: "¿Te quedó algún monto impago del resumen anterior? ($)",
            helpText: "¿Quedó saldo del resumen pasado que no pagaste completo (y la tarjeta te lo está financiando)?",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_postcierre`,
            type: "number",
            label: "Cuánto gastaste desde el cierre hasta ahora? A ojo ($)",
            helpText: "Cargá lo que gastaste desde el cierre del último resumen hasta hoy.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_postcierre_cuotas`,
            type: "radio",
            label: "¿Algo de eso fue en cuotas?",
            options: ["Sí", "No"],
            helpText: "Indicá si dentro de esos gastos hay compras que vas a pagar en cuotas.",
            visibleWhen: manualMode,
          },
          {
            id: `t${n}_postcierre_cuotas_cantidad`,
            type: "select",
            label: "¿En cuántas cuotas?",
            options: Array.from({ length: 18 }, (_, index) => String(index + 1)),
            helpText: "Elegí en cuántas cuotas se hizo esa compra.",
            visibleWhen: (answers: OnboardingAnswers) =>
              manualMode(answers) &&
              answers[`t${n}_postcierre_cuotas`] === "Sí",
          },
          {
            id: `t${n}_postcierre_upload`,
            type: "upload",
            label:
              "O subí una captura de los últimos movimientos desde el cierre",
            helpText: "Subí una captura de los movimientos desde el cierre, si te resulta más fácil.",
            visibleWhen: manualMode,
          },
        ],
      },
    ];
  }),
];

export function getActiveSteps(
  answers: OnboardingAnswers,
): readonly OnboardingStep[] {
  return onboardingSteps.flatMap((step) =>
    step.visibleWhen?.(answers) === false ? [] : [step],
  );
}

const definedAnswerIds = new Set(
  onboardingSteps.flatMap((step) => step.fields.map((field) => field.id)),
);

export function filterAnswersForActiveSteps(
  answers: OnboardingAnswers,
): OnboardingAnswers {
  const normalizedAnswers = withInferredFixedExpenseMode(answers);
  const activeAnswerIds = new Set(
    getActiveSteps(normalizedAnswers).flatMap((step) =>
      getVisibleFields(step, normalizedAnswers).map((field) => field.id),
    ),
  );

  const filteredAnswers = Object.fromEntries(
    Object.entries(normalizedAnswers).filter(
      ([key]) => !definedAnswerIds.has(key) || activeAnswerIds.has(key),
    ),
  ) as OnboardingAnswers;

  if (Array.isArray(filteredAnswers.fijo_otros)) {
    return {
      ...filteredAnswers,
      fijo_otros: (filteredAnswers.fijo_otros as ExtraIncome[]).map((item) => ({
        ...item,
        hasta: hasPositiveOther({ fijo_otros: [item] }) ? item.hasta : "",
      })),
    };
  }

  return filteredAnswers;
}

export function getInactiveAnswerIds(answers: OnboardingAnswers): string[] {
  const activeAnswerIds = new Set(
    getActiveSteps(answers).flatMap((step) =>
      getVisibleFields(step, answers).map((field) => field.id),
    ),
  );

  return [...definedAnswerIds].filter(
    (id) => answers[id] !== undefined && !activeAnswerIds.has(id),
  );
}

export function getVisibleFields(
  step: OnboardingStep | undefined,
  answers: OnboardingAnswers,
): readonly OnboardingField[] {
  if (!step) return [];
  const normalizedAnswers = withInferredFixedExpenseMode(answers);
  return step.fields.filter(
    (field) => field.visibleWhen?.(normalizedAnswers) !== false,
  );
}

export function validateStep(
  stepOrIndex: OnboardingStep | number | undefined,
  answers: OnboardingAnswers,
): Record<string, string> {
  let step: OnboardingStep | undefined;
  if (typeof stepOrIndex === "number") {
    step = onboardingSteps[stepOrIndex];
  } else {
    step = stepOrIndex;
  }
  if (!step) return {};

  const normalizedAnswers = withInferredFixedExpenseMode(answers);
  const errors: Record<string, string> = {};

  // 1. Generic non-negative validator for any field of type 'number' in the step
  const otherPairsMap: Record<string, string> = {
    var_otro1_monto: "var_otro1_concepto",
    var_otro2_monto: "var_otro2_concepto",
    var_otro3_monto: "var_otro3_concepto",
    d_otro1_monto: "d_otro1_concepto",
    d_otro2_monto: "d_otro2_concepto",
    d_otro3_monto: "d_otro3_concepto",
    n1_monto: "n1_concepto",
    n2_monto: "n2_concepto",
    n3_monto: "n3_concepto",
  };

  for (const field of getVisibleFields(step, normalizedAnswers)) {
    const val = normalizedAnswers[field.id];
    const numVal =
      typeof val === "string" && val.trim() !== "" ? Number(val) : val;
    const hasSuppliedValue =
      val !== undefined &&
      val !== null &&
      (typeof val !== "string" || val.trim() !== "");
    if (field.type === "number" && hasSuppliedValue) {
      if (typeof numVal !== "number" || !Number.isFinite(numVal)) {
        errors[field.id] = "Ingresá un número válido.";
      } else if (numVal < 0) {
        errors[field.id] = "El monto no puede ser negativo.";
      }
    }

    if (field.type === "checkbox" && hasSuppliedValue && !Array.isArray(val)) {
      errors[field.id] = "Elegí una opción válida.";
    }
    if (
      field.type !== "number" &&
      field.type !== "radio" &&
      field.type !== "checkbox" &&
      field.type !== "repeated" &&
      hasSuppliedValue &&
      typeof val !== "string"
    ) {
      errors[field.id] = "Ingresá un valor válido.";
    }

    if (field.options && val !== undefined && val !== null && val !== "") {
      const isValidOption = Array.isArray(val)
        ? field.type === "checkbox" &&
          val.every(
            (option) =>
              typeof option === "string" && field.options!.includes(option),
          )
        : field.type !== "checkbox" &&
          typeof val === "string" &&
          field.options.includes(val);
      if (!isValidOption) errors[field.id] = "Elegí una opción válida.";
    }

    const conceptId = otherPairsMap[field.id];
    if (conceptId) {
      const isAmtProvided =
        typeof numVal === "number" && !isNaN(numVal) && numVal > 0;
      const conceptVal = answers[conceptId];
      if (
        isAmtProvided &&
        (typeof conceptVal !== "string" || conceptVal.trim() === "")
      ) {
        errors[conceptId] = "Debe ingresar el concepto.";
      }
    }
    if (
      field.required &&
      (val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (Array.isArray(val) && val.length === 0))
    ) {
      errors[field.id] = field.requiredMessage ?? "Este campo es requerido.";
    }
  }

  // 2. Specific validations per step ID:
  if (step.id === "p1") {
    const val = answers.p1_pesa;
    if (!val) {
      errors.p1_pesa = "Elegí una opción para continuar.";
    }
  }

  if (step.id === "p4") {
    const val = answers.ing_total;
    if (
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim() === "")
    ) {
      errors.ing_total = "Este campo es requerido.";
    }
  }

  if (step.id === "p9") {
    const modo = inferFixedExpenseMode(normalizedAnswers);
    if (modo === "Tengo el total en la cabeza") {
      const totalDirecto = normalizedAnswers.fijo_total_directo;
      const numVal =
        typeof totalDirecto === "string" && totalDirecto.trim() !== ""
          ? Number(totalDirecto)
          : totalDirecto;
      if (
        typeof numVal !== "number" ||
        !Number.isFinite(numVal) ||
        numVal <= 0
      ) {
        errors.fijo_total_directo =
          "Ingresá un total aproximado mayor a cero.";
      }
    } else if (modo === "Quiero desglosar") {
      const detailKeys = [
        "fijo_alquiler",
        "fijo_colegio",
        "fijo_prepaga",
        "fijo_prestamos",
        "fijo_servicios",
        "fijo_seguros",
        "fijo_ayuda",
        ...legacyFixedOtherAmountIds,
      ];
      const hasPositiveCategory = detailKeys.some((key) => {
        const val = normalizedAnswers[key];
        const numVal =
          typeof val === "string" && val.trim() !== "" ? Number(val) : val;
        return typeof numVal === "number" && Number.isFinite(numVal) && numVal > 0;
      });
      const hasPositiveOther =
        Array.isArray(normalizedAnswers.fijo_otros) &&
        (normalizedAnswers.fijo_otros as ExtraIncome[]).some((item) => {
          const numVal =
            typeof item?.monto === "string" && item.monto.trim() !== ""
              ? Number(item.monto)
              : item?.monto;
          return (
            typeof numVal === "number" && Number.isFinite(numVal) && numVal > 0
          );
        });

      if (!hasPositiveCategory && !hasPositiveOther) {
        errors.fijo_alquiler = "Ingresá al menos un gasto fijo.";
      }

      if (Array.isArray(normalizedAnswers.fijo_otros)) {
        (normalizedAnswers.fijo_otros as ExtraIncome[]).forEach((item, index) => {
          const rawAmount = item?.monto;
          const hasAmount =
            rawAmount !== undefined &&
            rawAmount !== null &&
            (typeof rawAmount !== "string" || rawAmount.trim() !== "");
          const numVal =
            typeof rawAmount === "string" && rawAmount.trim() !== ""
              ? Number(rawAmount)
              : rawAmount;
          if (hasAmount && (typeof numVal !== "number" || !Number.isFinite(numVal))) {
            errors[`fijo_otros.${index}.monto`] = "Ingresá un número válido.";
          } else if (
            hasAmount &&
            typeof numVal === "number" &&
            numVal < 0
          ) {
            errors[`fijo_otros.${index}.monto`] = "El monto no puede ser negativo.";
          }
          const isPos =
            typeof numVal === "number" && Number.isFinite(numVal) && numVal > 0;
          if (isPos && (!item.concepto || item.concepto.trim() === "")) {
            errors[`fijo_otros.${index}.concepto`] =
              "Debe ingresar el concepto.";
          }
        });
      }
    }
  }

  if (step.id === "p11") {
    const mode = normalizedAnswers.p11_modo;
    const detailKeys = [
      "var_comida",
      "var_transporte",
      "var_farmacia",
      "var_otro1_monto",
      "var_otro2_monto",
      "var_otro3_monto",
    ];
    if (
      mode === "Tengo el total en la cabeza" &&
      !hasPositiveAmount(normalizedAnswers, "var_total_directo")
    ) {
      errors.var_total_directo = "Ingresá un total aproximado mayor a cero.";
    } else if (
      mode === "Quiero desglosar" &&
      !detailKeys.some((key) => hasPositiveAmount(normalizedAnswers, key))
    ) {
      errors.var_comida = "Completá al menos un gasto de vida diaria.";
    }
  }

  if (step.id === "p12") {
    const mode = normalizedAnswers.p12_modo;
    const detailKeys = [
      "d_salidas",
      "d_ropa",
      "d_delivery",
      "d_susc",
      "d_hobbies",
      "d_otro1_monto",
      "d_otro2_monto",
      "d_otro3_monto",
    ];
    if (
      mode === "Tengo el total en la cabeza" &&
      !hasPositiveAmount(normalizedAnswers, "d_total_directo")
    ) {
      errors.d_total_directo = "Ingresá un total aproximado mayor a cero.";
    } else if (
      mode === "Quiero desglosar" &&
      !detailKeys.some((key) => hasPositiveAmount(normalizedAnswers, key))
    ) {
      errors.d_salidas = "Completá al menos un gasto de gustitos.";
    }
  }

  if (step.id === "p15") {
    const val = answers.p15_tarjetas;
    const cardCount =
      typeof val === "string" && val.trim() !== "" ? Number(val) : val;
    if (
      typeof cardCount !== "number" ||
      !Number.isInteger(cardCount) ||
      cardCount < 0 ||
      cardCount > 5
    ) {
      errors.p15_tarjetas = "Ingresá un número entero entre 0 y 5.";
    }
  }

  if (step.id.endsWith("_p16")) {
    const prefix = step.id.split("_")[0];
    const mode = answers[`${prefix}_cuotas_modo`];
    if (!mode) {
      errors[`${prefix}_cuotas_modo`] = "Elegí una opción para continuar.";
    } else if (mode === "Subir foto o archivo") {
      if (!answers[`${prefix}_upload_url`])
        errors[`${prefix}_upload_url`] = "Subí el resumen para continuar.";
    } else if (mode === "Copiar el renglón mes a mes") {
      if (typeof answers[`${prefix}_resumen_ars`] !== "number") {
        errors[`${prefix}_resumen_ars`] =
          "Debe ingresar el monto de la tarjeta.";
      }
      const months = [1, 2, 3, 4, 5, 6].map(
        (month) => `${prefix}_cuotas_m${month}`,
      );
      if (!months.some((key) => typeof answers[key] === "number")) {
        errors[`${prefix}_cuotas_m1`] = "Completá al menos una cuota mensual.";
      }
      if (
        answers[`${prefix}_postcierre_cuotas`] === "Sí" &&
        !answers[`${prefix}_postcierre_cuotas_cantidad`]
      ) {
        errors[`${prefix}_postcierre_cuotas_cantidad`] =
          "Elegí una opción para continuar.";
      }
    }
  }

  if (step.id === "p23") {
    const emailVal = answers.email;
    if (
      answers.contacto_canal === "Email" &&
      typeof emailVal === "string" &&
      emailVal.trim().length > 0
    ) {
      if (!/.+@.+\..+/.test(emailVal)) {
        errors.email = "El formato del email no es válido.";
      }
    }
    const phoneVal = answers.whatsapp;
    if (
      answers.contacto_canal === "WhatsApp" &&
      typeof phoneVal === "string" &&
      phoneVal.trim().length > 0
    ) {
      if (!/^(?=.*\d)[0-9+\s\-()]{6,}$/.test(phoneVal)) {
        errors.whatsapp = "El formato del teléfono no es válido.";
      }
    }
  }

  return errors;
}

export function getFirstIncompleteStep(answers: OnboardingAnswers): number {
  const activeSteps = getActiveSteps(answers);
  return activeSteps.findIndex(
    (step) => Object.keys(validateStep(step, answers)).length > 0,
  );
}

export const saveDraftInput = z.object({
  deviceId: z.uuid(),
  answers: z.record(z.string(), onboardingAnswerSchema),
  completed: z.boolean(),
});
