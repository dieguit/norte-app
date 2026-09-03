import { z } from "zod";

export type ExtraIncome = {
  concepto: string;
  monto: string | number;
  desde: string;
  hasta: string;
  fecha?: string;
};

export type OnboardingAnswer =
  string | number | boolean | string[] | ExtraIncome[];
export type OnboardingAnswers = Record<string, OnboardingAnswer>;

const extraIncomeSchema = z.object({
  concepto: z.string(),
  monto: z.union([z.string(), z.number()]),
  desde: z.string(),
  hasta: z.string(),
  fecha: z.string().optional(),
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
  const amount = numericAnswer(value);
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

function getLegacyFixedOther(
  answers: OnboardingAnswers,
  index: number,
): ExtraIncome | undefined {
  const conceptKey = `fijo_otro${index}_concepto`;
  const amountKey = `fijo_otro${index}_monto`;
  const expiryKey = `fijo_otro${index}_hasta`;
  if (!hasLegacyFixedOther(answers, conceptKey, amountKey, expiryKey)) return undefined;

  const amount = answers[amountKey];
  return {
    concepto: asString(answers[conceptKey]),
    monto: normalizeLegacyAmount(amount),
    desde: "",
    hasta: asString(answers[expiryKey]),
  };
}

function hasLegacyFixedOther(
  answers: OnboardingAnswers,
  conceptKey: string,
  amountKey: string,
  expiryKey: string,
) {
  return [conceptKey, amountKey, expiryKey].some((key) => answers[key] !== undefined);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeLegacyAmount(value: unknown) {
  const numericValue = numericAnswer(value);
  if (typeof numericValue === "number" && Number.isFinite(numericValue)) return numericValue;
  return typeof value === "string" || typeof value === "number" ? value : "";
}

function withInferredFixedExpenseMode(answers: OnboardingAnswers): OnboardingAnswers {
  const normalized = { ...answers };
  if (!Array.isArray(normalized.fijo_otros)) {
    const legacyOthers = [1, 2].flatMap((index) => {
      const item = getLegacyFixedOther(normalized, index);
      return item ? [item] : [];
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

const isDetailedFixedExpense = (answers: OnboardingAnswers) =>
  inferFixedExpenseMode(answers) === "Quiero desglosar";

const hasPositiveOther = (answers: OnboardingAnswers) =>
  Array.isArray(answers.fijo_otros) &&
  (answers.fijo_otros as (string | ExtraIncome)[]).some(
    (item) => {
      if (typeof item !== "object" || item === null) return false;
      const rawMonto = (item as ExtraIncome).monto;
      const monto = numericAnswer(rawMonto);
      return typeof monto === "number" && Number.isFinite(monto) && monto > 0;
    },
  );

function repeatedItems(answers: OnboardingAnswers, id: string): ExtraIncome[] {
  const value = answers[id];
  return Array.isArray(value)
    ? value.filter((item): item is ExtraIncome => typeof item === "object" && item !== null)
    : [];
}

function hasPositiveRepeatedItem(answers: OnboardingAnswers, id: string, index?: number) {
  const items = repeatedItems(answers, id);
  const candidates = index === undefined ? items : [items[index]];
  return candidates.some((item) => hasPositiveAmount({ monto: item?.monto }, "monto"));
}

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

function isCardManualMode(cardNumber: number, answers: OnboardingAnswers) {
  return answers[`t${cardNumber}_cuotas_modo`] === "Copiar el renglón mes a mes";
}

function isCardUploadMode(cardNumber: number, answers: OnboardingAnswers) {
  return answers[`t${cardNumber}_cuotas_modo`] === "Subir foto o archivo";
}

function isCardPostClosingVisible(cardNumber: number, answers: OnboardingAnswers) {
  return isCardManualMode(cardNumber, answers) || isCardUploadMode(cardNumber, answers);
}

function createCardSummaryFields(cardNumber: number): OnboardingField[] {
  const manualMode = (answers: OnboardingAnswers) => isCardManualMode(cardNumber, answers);
  const uploadMode = (answers: OnboardingAnswers) => isCardUploadMode(cardNumber, answers);
  return [
    {
      id: `t${cardNumber}_cuotas_modo`, type: "radio",
      label: "Elegí el camino que te resulte más cómodo",
      options: [
        "Subir foto o archivo", "Copiar el renglón mes a mes",
        "No lo tengo a mano, que Norte me lo pida después por WhatsApp",
      ],
    },
    { id: `t${cardNumber}_upload_url`, type: "upload", label: "Subir foto o archivo", visibleWhen: uploadMode },
    {
      id: `t${cardNumber}_resumen_ars`, type: "number", label: "En pesos ($)",
      helpText: "Cargá el total que figura en tu último resumen, en pesos.", visibleWhen: manualMode,
    },
    {
      id: `t${cardNumber}_resumen_usd`, type: "number", label: "En dólares (USD)",
      helpText: "Cargá el total en dólares si aparece en tu resumen.", visibleWhen: manualMode,
    },
    {
      id: `t${cardNumber}_cierre_dia`, type: "select", label: "Día de cierre", options: dayOptions,
      helpText: "Elegí el día del mes en que cierra esta tarjeta.", visibleWhen: manualMode,
    },
    {
      id: `t${cardNumber}_vto_dia`, type: "select", label: "Día de vencimiento", options: dayOptions,
      helpText: "Elegí el día límite para pagar el resumen.", visibleWhen: manualMode,
    },
  ];
}

function createCardInstallmentFields(cardNumber: number): OnboardingField[] {
  const manualMode = (answers: OnboardingAnswers) => isCardManualMode(cardNumber, answers);
  return [
    ...[1, 2, 3, 4, 5, 6].map((month) => ({
      id: `t${cardNumber}_cuotas_m${month}`, type: "number" as const,
      label: `Mes ${month} ($)`, helpText: `Cargá cuánto te queda pagar en ${month} cuotas.`,
      visibleWhen: manualMode,
    })),
    {
      id: `t${cardNumber}_cuotas_resto`, type: "number",
      label: "¿Y después de eso quedan más cuotas por pagar? ($)",
      helpText: "Cargá el total mensual de cuotas que queda después de estos seis meses.", visibleWhen: manualMode,
    },
    {
      id: `t${cardNumber}_cuotas_resto_hasta`, type: "month",
      label: "¿Hasta cuando tendrías que pagar? (mes/año)",
      helpText: "Elegí el último mes en que vas a pagar esas cuotas.", visibleWhen: manualMode,
    },
    {
      id: `t${cardNumber}_arrastre`, type: "number",
      label: "¿Te quedó algún monto impago del resumen anterior? ($)",
      helpText: "¿Quedó saldo del resumen pasado que no pagaste completo (y la tarjeta te lo está financiando)?",
      visibleWhen: manualMode,
    },
  ];
}

function createCardPostClosingFields(cardNumber: number): OnboardingField[] {
  const postCierreVisible = (answers: OnboardingAnswers) =>
    isCardPostClosingVisible(cardNumber, answers);
  return [
    {
      id: `t${cardNumber}_postcierre`, type: "number",
      label: "Cuánto gastaste desde el cierre hasta ahora? A ojo ($)",
      helpText: "Cargá lo que gastaste desde el cierre del último resumen hasta hoy.", visibleWhen: postCierreVisible,
    },
    {
      id: `t${cardNumber}_postcierre_cuotas`, type: "radio",
      label: "¿Algo de eso fue en cuotas?", options: ["Sí", "No"],
      helpText: "Indicá si dentro de esos gastos hay compras que vas a pagar en cuotas.", visibleWhen: postCierreVisible,
    },
    {
      id: `t${cardNumber}_postcierre_cuotas_cantidad`, type: "select",
      label: "¿En cuántas cuotas?", options: Array.from({ length: 18 }, (_, index) => String(index + 1)),
      helpText: "Elegí en cuántas cuotas se hizo esa compra.",
      visibleWhen: (answers: OnboardingAnswers) =>
        postCierreVisible(answers) && answers[`t${cardNumber}_postcierre_cuotas`] === "Sí",
    },
    {
      id: `t${cardNumber}_postcierre_upload`, type: "upload",
      label: "O subí una captura de los últimos movimientos desde el cierre",
      helpText: "Subí una captura de los movimientos desde el cierre, si te resulta más fácil.",
      visibleWhen: postCierreVisible,
    },
  ];
}

function createCardStatementFields(cardNumber: number): OnboardingField[] {
  return [
    ...createCardSummaryFields(cardNumber),
    ...createCardInstallmentFields(cardNumber),
    ...createCardPostClosingFields(cardNumber),
  ];
}

function createCardStatementStep(cardNumber: number): OnboardingStep {
  return {
    id: `t${cardNumber}_p16`,
    title: `Tarjeta ${cardNumber} - el último resumen`,
    intro: `Tarjeta ${cardNumber}: agarrá el último resumen, o abrí la app del banco, no te vamos a hacer revolver cajones. ¿De cuánto vino?`,
    visibleWhen: (answers) =>
      (numericAnswer(answers.p15_tarjetas) ?? -1) >= cardNumber,
    fields: createCardStatementFields(cardNumber),
  };
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
        id: "var_otros",
        type: "repeated",
        label: "Otros gastos diarios",
        addLabel: "Agregar otro",
        maxItems: 5,
        itemFields: [
          { key: "concepto", type: "text", label: "Concepto", required: true },
          { key: "monto", type: "number", label: "Monto ($)", required: true },
        ],
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
        id: "d_otros",
        type: "repeated",
        label: "Otros gustitos",
        addLabel: "Agregar otro",
        maxItems: 5,
        itemFields: [
          { key: "concepto", type: "text", label: "Concepto", required: true },
          { key: "monto", type: "number", label: "Monto ($)", required: true },
        ],
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
            ? true
            : hasPositiveAmount(answers, answerId),
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `e13_gustito_adicional${index + 1}`,
        type: "radio" as const,
        label: `Gustito adicional ${index + 1}`,
        options: [
          "Lo llevo a cero",
          "Lo reduzco a la mitad",
          "No lo toco ni en crisis",
        ],
        visibleWhen: (answers: OnboardingAnswers) =>
          answers.p12_modo === "Quiero desglosar" &&
          hasPositiveRepeatedItem(answers, "d_otros", index),
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
        id: "compras_necesarias",
        type: "repeated",
        label: "Compras necesarias",
        addLabel: "Agregar compra",
        maxItems: 5,
        itemFields: [
          { key: "concepto", type: "text", label: "Concepto", required: true },
          { key: "monto", type: "number", label: "Monto ($)", required: true },
          { key: "fecha", type: "month", label: "Fecha", required: true },
        ],
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
  ...[1, 2, 3, 4, 5].map(createCardStatementStep),
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

type ValidationErrors = Record<string, string>;

function resolveStep(stepOrIndex: OnboardingStep | number | undefined) {
  return typeof stepOrIndex === "number"
    ? onboardingSteps[stepOrIndex]
    : stepOrIndex;
}

function numericAnswer(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function monthOrder(value: unknown) {
  if (typeof value !== "string") return undefined;
  const [month, year] = value.trim().split("-");
  const monthIndex = monthNames.indexOf(month);
  return monthIndex >= 0 && /^\d{2}$/.test(year ?? "")
    ? Number(year) * 12 + monthIndex
    : undefined;
}

function isSupplied(value: unknown) {
  return value !== undefined && value !== null &&
    (typeof value !== "string" || value.trim() !== "");
}

function validateNumberField(
  field: OnboardingField,
  value: unknown,
): ValidationErrors {
  if (field.type !== "number" || !isSupplied(value)) return {};
  const numberValue = numericAnswer(value);
  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    return { [field.id]: "Ingresá un número válido." };
  }
  return numberValue < 0 ? { [field.id]: "El monto no puede ser negativo." } : {};
}

function validateCheckboxField(
  field: OnboardingField,
  value: unknown,
): ValidationErrors {
  return field.type === "checkbox" && isSupplied(value) && !Array.isArray(value)
    ? { [field.id]: "Elegí una opción válida." }
    : {};
}

function validateValueType(
  field: OnboardingField,
  value: unknown,
): ValidationErrors {
  const scalarField = !["number", "radio", "checkbox", "repeated"].includes(field.type);
  return scalarField && isSupplied(value) && typeof value !== "string"
    ? { [field.id]: "Ingresá un valor válido." }
    : {};
}

function validateOptions(
  field: OnboardingField,
  value: unknown,
): ValidationErrors {
  if (!field.options || value === undefined || value === null || value === "") return {};
  return isValidOption(field, value) ? {} : { [field.id]: "Elegí una opción válida." };
}

function isValidOption(field: OnboardingField, value: unknown) {
  if (Array.isArray(value)) {
    return field.type === "checkbox" && value.every((option) => isAllowedOption(field, option));
  }
  return field.type !== "checkbox" && typeof value === "string" && field.options?.includes(value);
}

function isAllowedOption(field: OnboardingField, option: unknown) {
  return typeof option === "string" && field.options?.includes(option);
}

function validateRequired(
  field: OnboardingField,
  value: unknown,
): ValidationErrors {
  return field.required && (!isSupplied(value) || (Array.isArray(value) && value.length === 0))
    ? { [field.id]: field.requiredMessage ?? "Este campo es requerido." }
    : {};
}

function validateField(
  field: OnboardingField,
  answers: OnboardingAnswers,
): ValidationErrors {
  const value = answers[field.id];
  return {
    ...validateNumberField(field, value),
    ...validateCheckboxField(field, value),
    ...validateValueType(field, value),
    ...validateOptions(field, value),
    ...validateRequired(field, value),
  };
}

function validateVisibleFields(
  step: OnboardingStep,
  answers: OnboardingAnswers,
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const field of getVisibleFields(step, answers)) {
    Object.assign(errors, validateField(field, answers));
  }

  return errors;
}

function validateRepeatedExpenses(
  answers: OnboardingAnswers,
  id: string,
): ValidationErrors {
  const errors: ValidationErrors = {};
  repeatedItems(answers, id).forEach((item, index) => Object.assign(
    errors,
    validateRepeatedExpense(item, id, index),
  ));
  return errors;
}

function validateRepeatedAmount(
  rawAmount: unknown,
  id: string,
  index: number,
): ValidationErrors {
  if (!isSupplied(rawAmount)) return {};
  const amount = numericAnswer(rawAmount);
  if (typeof amount !== "number") {
    return { [`${id}.${index}.monto`]: "Ingresá un número válido." };
  }
  return amount < 0
    ? { [`${id}.${index}.monto`]: "El monto no puede ser negativo." }
    : {};
}

function validateRepeatedConcept(
  item: ExtraIncome,
  id: string,
  index: number,
): ValidationErrors {
  const amount = numericAnswer(item.monto);
  if (typeof amount !== "number" || amount <= 0) return {};
  return typeof item.concepto === "string" && item.concepto.trim() !== ""
    ? {}
    : { [`${id}.${index}.concepto`]: "Ingresá el concepto." };
}

function validateRepeatedExpense(
  item: ExtraIncome,
  id: string,
  index: number,
): ValidationErrors {
  return {
    ...validateRepeatedAmount(item.monto, id, index),
    ...validateRepeatedConcept(item, id, index),
  };
}

function validateBasicStep(stepId: string, answers: OnboardingAnswers): ValidationErrors {
  if (stepId === "p1" && !answers.p1_pesa) {
    return { p1_pesa: "Elegí una opción para continuar." };
  }
  if (stepId === "p4" && !isSupplied(answers.ing_total)) {
    return { ing_total: "Este campo es requerido." };
  }
  return {};
}

function validateFixedExpenses(answers: OnboardingAnswers): ValidationErrors {
  const errors: ValidationErrors = {};
  const mode = inferFixedExpenseMode(answers);
  if (mode === "Tengo el total en la cabeza") {
    const amount = numericAnswer(answers.fijo_total_directo);
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      errors.fijo_total_directo = "Ingresá un total aproximado mayor a cero.";
    }
  }
  if (mode === "Quiero desglosar") {
    const detailKeys = [
      "fijo_alquiler", "fijo_colegio", "fijo_prepaga", "fijo_prestamos",
      "fijo_servicios", "fijo_seguros", "fijo_ayuda", ...legacyFixedOtherAmountIds,
    ];
    if (!detailKeys.some((key) => hasPositiveAmount(answers, key)) && !hasPositiveOther(answers)) {
      errors.fijo_alquiler = "Ingresá al menos un gasto fijo.";
    }
    Object.assign(errors, validateRepeatedExpenses(answers, "fijo_otros"));
  }
  return errors;
}

type ExpenseGroupValidation = {
  mode: string;
  directTotalId: string;
  detailIds: readonly string[];
  repeatedId: string;
  emptyDetailId: string;
  emptyDetailMessage: string;
};

function validateExpenseGroup(
  answers: OnboardingAnswers,
  config: ExpenseGroupValidation,
): ValidationErrors {
  const errors: ValidationErrors = {};
  const mode = answers[config.mode];
  if (mode === "Tengo el total en la cabeza" && !hasPositiveAmount(answers, config.directTotalId)) {
    errors[config.directTotalId] = "Ingresá un total aproximado mayor a cero.";
  }
  if (
    mode === "Quiero desglosar" &&
    !config.detailIds.some((id) => hasPositiveAmount(answers, id)) &&
    !hasPositiveRepeatedItem(answers, config.repeatedId)
  ) {
    errors[config.emptyDetailId] = config.emptyDetailMessage;
  }
  if (mode === "Quiero desglosar") {
    Object.assign(errors, validateRepeatedExpenses(answers, config.repeatedId));
  }
  return errors;
}

function validatePurchases(answers: OnboardingAnswers): ValidationErrors {
  if (answers.p14_tiene_compras !== "Sí") return {};
  const items = repeatedItems(answers, "compras_necesarias");
  if (items.length === 0) {
    return { compras_necesarias: 'Agregá una compra o elegí "No".' };
  }

  const errors = validateRepeatedExpenses(answers, "compras_necesarias");
  items.forEach((item, index) => {
    if (typeof item.concepto !== "string" || item.concepto.trim() === "") {
      errors[`compras_necesarias.${index}.concepto`] = "Este campo es requerido.";
    }
    if (!isSupplied(item.monto)) {
      errors[`compras_necesarias.${index}.monto`] = "Este campo es requerido.";
    }
    if (typeof item.fecha !== "string" || item.fecha.trim() === "") {
      errors[`compras_necesarias.${index}.fecha`] = "Este campo es requerido.";
    }
  });
  return errors;
}

function validateExtraIncomeItem(rawItem: unknown, index: number): ValidationErrors {
  const item = typeof rawItem === "object" && rawItem !== null
    ? rawItem as Partial<ExtraIncome>
    : {};
  const requiredErrors = Object.fromEntries(
    (["concepto", "desde"] as const)
      .filter((field) => typeof item[field] !== "string" || item[field]!.trim() === "")
      .map((field) => [`ingresos_extra.${index}.${field}`, "Este campo es requerido."]),
  );
  const errors: ValidationErrors = {};
  Object.assign(errors, requiredErrors);
  if (!isSupplied(item.monto)) {
    errors[`ingresos_extra.${index}.monto`] = "Este campo es requerido.";
  }
  Object.assign(errors, validateRepeatedAmount(item.monto, "ingresos_extra", index));
  const startMonth = monthOrder(item.desde);
  const endMonth = monthOrder(item.hasta);
  if (startMonth !== undefined && endMonth !== undefined && endMonth < startMonth) {
    errors[`ingresos_extra.${index}.hasta`] = "Elegí un mes igual o posterior al de inicio.";
  }
  return errors;
}

function validateExtraIncome(answers: OnboardingAnswers): ValidationErrors {
  if (answers.extra_tiene !== "Sí") return {};
  const rawItems = answers.ingresos_extra;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ingresos_extra: 'Agregá un ingreso extra o elegí "No".' };
  }
  return Object.assign(
    {},
    ...rawItems.map((rawItem, index) => validateExtraIncomeItem(rawItem, index)),
  );
}

function validateCardStatement(
  stepId: string,
  answers: OnboardingAnswers,
): ValidationErrors {
  const prefix = stepId.split("_")[0];
  const mode = answers[`${prefix}_cuotas_modo`];
  if (!mode) return { [`${prefix}_cuotas_modo`]: "Elegí una opción para continuar." };
  const uploadUrl = answers[`${prefix}_upload_url`];
  if (mode === "Subir foto o archivo" &&
    (typeof uploadUrl !== "string" || uploadUrl.trim() === "")) {
    return { [`${prefix}_upload_url`]: "Subí el resumen para continuar." };
  }
  if (mode !== "Copiar el renglón mes a mes") return {};

  const errors: ValidationErrors = {};
  if (typeof numericAnswer(answers[`${prefix}_resumen_ars`]) !== "number") {
    errors[`${prefix}_resumen_ars`] = "Ingresá el monto de la tarjeta.";
  }
  const hasMonth = [1, 2, 3, 4, 5, 6].some(
    (month) => typeof numericAnswer(answers[`${prefix}_cuotas_m${month}`]) === "number",
  );
  if (!hasMonth) errors[`${prefix}_cuotas_m1`] = "Completá al menos una cuota mensual.";
  return errors;
}

function validateContact(answers: OnboardingAnswers): ValidationErrors {
  const errors: ValidationErrors = {};
  const email = answers.email;
  if (answers.contacto_canal === "Email" && typeof email === "string" && email.trim() && !/.+@.+\..+/.test(email)) {
    errors.email = "El formato del email no es válido.";
  }
  const phone = answers.whatsapp;
  if (answers.contacto_canal === "WhatsApp" && typeof phone === "string" && phone.trim() && !/^(?=.*\d)[0-9+\s\-()]{6,}$/.test(phone)) {
    errors.whatsapp = "El formato del teléfono no es válido.";
  }
  return errors;
}

function validateCardCount(answers: OnboardingAnswers): ValidationErrors {
  const count = numericAnswer(answers.p15_tarjetas);
  return typeof count === "number" && Number.isInteger(count) && count >= 0 && count <= 5
    ? {}
    : { p15_tarjetas: "Ingresá un número entero entre 0 y 5." };
}

type StepValidator = (answers: OnboardingAnswers) => ValidationErrors;

const specificStepValidators: Record<string, StepValidator> = {
  p1: (answers) => validateBasicStep("p1", answers),
  p4: (answers) => validateBasicStep("p4", answers),
  p9: validateFixedExpenses,
  p11: (answers) => validateExpenseGroup(answers, {
    mode: "p11_modo", directTotalId: "var_total_directo",
    detailIds: ["var_comida", "var_transporte", "var_farmacia"],
    repeatedId: "var_otros", emptyDetailId: "var_comida",
    emptyDetailMessage: "Completá al menos un gasto de vida diaria.",
  }),
  p12: (answers) => validateExpenseGroup(answers, {
    mode: "p12_modo", directTotalId: "d_total_directo",
    detailIds: ["d_salidas", "d_ropa", "d_delivery", "d_susc", "d_hobbies"],
    repeatedId: "d_otros", emptyDetailId: "d_salidas",
    emptyDetailMessage: "Completá al menos un gasto de gustitos.",
  }),
  p14: validatePurchases,
  p7: validateExtraIncome,
  p15: validateCardCount,
  p23: validateContact,
};

function validateStepSpecific(step: OnboardingStep, answers: OnboardingAnswers): ValidationErrors {
  const validator = specificStepValidators[step.id];
  if (validator) return validator(answers);
  return step.id.endsWith("_p16") ? validateCardStatement(step.id, answers) : {};
}

export function validateStep(
  stepOrIndex: OnboardingStep | number | undefined,
  answers: OnboardingAnswers,
): ValidationErrors {
  const step = resolveStep(stepOrIndex);
  if (!step) return {};
  const normalizedAnswers = withInferredFixedExpenseMode(answers);
  return {
    ...validateVisibleFields(step, normalizedAnswers),
    ...validateStepSpecific(step, normalizedAnswers),
  };
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
