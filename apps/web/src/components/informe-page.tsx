import { useState } from "react";
import type { Report } from "../admin/report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from "recharts";

const formatMoney = (value: number) =>
  `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`;
const formatMillions = (value: number) =>
  `$${(value / 1_000_000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;

type MonthlyPieItem = {
  key: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
};

function MonthlyBreakdownLegend({ items }: { items: MonthlyPieItem[] }) {
  return (
    <ul
      data-testid="monthly-breakdown-legend"
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
    >
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3"
        >
          <span
            className="mt-1.5 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--sea-ink)]">
              {item.label}
            </p>
            <p className="text-sm text-[var(--sea-ink-soft)]">
              {formatMoney(item.amount)} ({(item.percentage * 100).toFixed(1)}%)
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function InformePage({ report: data }: { report: Report }) {
  const [reduction, setReduction] = useState(0);

  const monthlyBreakdown = [
    {
      key: "fixed",
      label: "Compromisos fijos que no se tocan",
      amount: data.bloque2.P_monto,
      percentage: data.bloque2.P_pct,
      color: "#047857",
      fill: "#047857",
    },
    {
      key: "daily",
      label: "Vida de todos los días (y que quizás puedas ajustar)",
      amount: data.bloque2.V_monto,
      percentage: data.bloque2.V_pct,
      color: "#0D9488",
      fill: "#0D9488",
    },
    {
      key: "discretionary",
      label: "Cosas que podrías recortar — incluso hasta cero",
      amount: data.bloque2.D_monto,
      percentage: data.bloque2.D_pct,
      color: "#D97706",
      fill: "#D97706",
    },
    {
      key: "free",
      label: "Lo que te queda libre",
      amount: data.bloque2.margen_monto,
      percentage: data.bloque2.margen_pct,
      color: "#0284C7",
      fill: "#0284C7",
    },
  ];
  const monthlyTotal = monthlyBreakdown.reduce(
    (total, item) => total + item.amount,
    0,
  );
  const monthlyChartConfig = Object.fromEntries(
    monthlyBreakdown.map((item) => [
      item.key,
      { label: item.label, color: item.color },
    ]),
  ) satisfies ChartConfig;
  const projectionChartConfig = {
    baseline: { label: "Sin tocar nada", color: "#B03A2E" },
    selected: { label: "Tu ajuste", color: "#047857" },
    maximum: { label: "Máximo posible", color: "#0284C7" },
  } satisfies ChartConfig;
  const [gastoConcepto, gastoMontoRaw] =
    data.bloque1.gastoN_concepto.split(" — ");
  const gastoMonto = gastoMontoRaw
    ? Number(gastoMontoRaw.replace(/[^0-9]/g, ""))
    : 0;
  const horizon = data.bloque3.meses.length;
  const curve = data.bloque3.acum_A.map(
    (current, index) =>
      current + (data.bloque3.acum_C[index] - current) * (reduction / 100),
  );
  const monthlySavings = data.bloque2.D_monto * (reduction / 100);
  const arrival = curve.findIndex(
    (amount) => amount >= data.bloque3.colchon_objetivo,
  );
  const estimatedArrival =
    arrival === -1 && monthlySavings > 0
      ? horizon +
        Math.ceil(
          (data.bloque3.colchon_objetivo - curve[curve.length - 1]) /
            monthlySavings,
        )
      : null;
  const arrivalLabel =
    arrival === -1
      ? estimatedArrival
        ? `Mes ${estimatedArrival} (estimado)`
        : "No llegás con este recorte"
      : `Mes ${arrival + 1} · ${data.bloque3.meses[arrival]}`;
  const projectionData = data.bloque3.meses.map((month, index) => ({
    month,
    baseline: data.bloque3.acum_A[index],
    selected: curve[index],
    maximum: data.bloque3.acum_C[index],
  }));
  const projectionValues = projectionData.flatMap((point) => [
    point.baseline,
    point.selected,
    point.maximum,
    data.bloque3.colchon_objetivo,
  ]);
  const projectionMin = Math.min(0, ...projectionValues);
  const projectionMax = Math.max(0, ...projectionValues);
  const projectionPadding = Math.max((projectionMax - projectionMin) * 0.1, 1);

  return (
    <main id="main" className="page-wrap py-8 sm:py-12 space-y-10">
      {/* Header / Apertura */}
      <section className="demo-panel space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <span className="island-kicker">Informe inicial de claridad</span>
          <span className="text-xs font-semibold text-[var(--sea-ink-soft)]">
            {data.meta.nombre} — {data.meta.fecha}
          </span>
        </div>
        <p className="text-xl font-medium leading-relaxed text-[var(--sea-ink)]">
          {data.apertura.frase_apertura}
        </p>
        <p className="text-base leading-relaxed text-[var(--sea-ink-soft)]">
          {data.apertura.frase_sub}
        </p>
      </section>

      {/* Bloque 1: Tu posición real */}
      <section aria-labelledby="posicion-real" className="demo-panel space-y-6">
        <h2
          id="posicion-real"
          className="text-2xl font-bold text-[var(--sea-ink)]"
        >
          Tu posición real
        </h2>

        <p className="text-base leading-relaxed text-[var(--sea-ink-soft)]">
          La información financiera generalmente está dispersa entre recibos,
          cuentas y resúmenes. Acá, todo en un solo lugar, mirando el año
          completo:
        </p>

        <div className="space-y-4">
          <div className="rounded-xl p-4 border border-[rgba(45,122,79,0.25)] bg-[rgba(45,122,79,0.12)] space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2D7A4F]">
              Todo lo que vas a ganar este año
            </span>
            <p className="text-2xl font-bold text-[#2D7A4F]">
              {formatMillions(data.bloque1.ingreso_anual)}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              {data.bloque1.ingreso_anual_detalle}
            </p>
          </div>

          <div className="rounded-xl p-4 border border-[rgba(176,58,46,0.2)] bg-[rgba(176,58,46,0.08)] space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B03A2E]">
              Lo que tenés que pagar sí o sí
            </span>
            <p className="text-2xl font-bold text-[#B03A2E]">
              {formatMillions(data.bloque1.pagar_anual)}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              {data.bloque1.pagar_anual_desc}
            </p>
          </div>

          <div className="rounded-xl p-4 border border-[rgba(180,83,9,0.25)] bg-[#FEF3C7] space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
              Cosas que podrías ajustar si quisieras
            </span>
            <p className="text-2xl font-bold text-[#B45309]">
              {formatMillions(data.bloque1.ajustable_anual)}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              {data.bloque1.ajustable_desc}
            </p>
          </div>

          <div className="rounded-xl p-4 border border-[rgba(176,58,46,0.2)] bg-[rgba(176,58,46,0.08)] space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B03A2E]">
              Un gasto necesario que ya sabés que viene
            </span>
            <p className="text-2xl font-bold text-[#B03A2E]">
              {formatMillions(gastoMonto)}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              {gastoConcepto}
            </p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-[var(--sea-ink)] bg-[var(--surface-strong)] p-4 space-y-1 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink)]">
            Lo que posiblemente te quedás libre en el año
          </p>
          <p className="text-2xl font-extrabold text-[var(--sea-ink)]">
            {formatMoney(data.bloque1.libre_anual_pre_tc)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 space-y-3">
          <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            Pero hay algo más a tener en cuenta: también tenés compromisos de
            tarjeta que ya existen y pueden ser de cualquier origen.{" "}
            <em>
              Lo más probable es que ni vos te acordés en detalle — pero
              existen.
            </em>
          </p>
          <div className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[#B03A2E]">
              Total comprometido en tarjeta este año
            </span>
            <strong className="block text-2xl font-bold text-[#B03A2E]">
              {formatMoney(data.bloque1.tarjeta_anual)}
            </strong>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
          {data.bloque1.texto_contexto}
        </p>
      </section>

      {/* Bloque 2: Radiografía */}
      <section
        aria-labelledby="radiografia-mes"
        className="demo-panel space-y-6"
      >
        <p className="island-kicker">2 · Radiografía</p>
        <h2
          id="radiografia-mes"
          className="text-2xl font-bold text-[var(--sea-ink)]"
        >
          La radiografía de tu mes
        </h2>
        <p className="text-base leading-relaxed text-[var(--sea-ink-soft)]">
          {data.bloque2.subtitulo}
        </p>

        <Tabs defaultValue="cards" className="space-y-4">
          <TabsList
            aria-label="Visualización de la radiografía mensual"
            className="w-full sm:w-fit"
          >
            <TabsTrigger value="cards">Opción 1</TabsTrigger>
            <TabsTrigger value="pie">Opción 2</TabsTrigger>
            <TabsTrigger value="donut">Opción 3</TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            <div className="space-y-4">
              {monthlyBreakdown.map((item) => (
                <div key={item.key} className="demo-card space-y-2">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <span className="text-sm font-medium text-[var(--sea-ink)]">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                      <span>{formatMoney(item.amount)}</span>
                      <span className="text-xs font-normal text-[var(--sea-ink-soft)]">
                        ({(item.percentage * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface-strong)]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: item.color,
                        width: `${Math.max(0.5, item.percentage * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pie">
            <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <ChartContainer
                data-testid="monthly-solid-pie"
                config={monthlyChartConfig}
                className="mx-auto aspect-square max-h-80 w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="label"
                        formatter={(value) => formatMoney(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={monthlyBreakdown}
                    dataKey="amount"
                    nameKey="label"
                    isAnimationActive={false}
                    outerRadius="78%"
                  />
                </PieChart>
              </ChartContainer>
              <MonthlyBreakdownLegend items={monthlyBreakdown} />
            </div>
          </TabsContent>

          <TabsContent value="donut">
            <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <div className="relative">
                <ChartContainer
                  data-testid="monthly-donut"
                  config={monthlyChartConfig}
                  className="mx-auto aspect-square max-h-80 w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="label"
                          formatter={(value) => formatMoney(Number(value))}
                        />
                      }
                    />
                    <Pie
                      data={monthlyBreakdown}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius="48%"
                      isAnimationActive={false}
                      outerRadius="78%"
                    />
                  </PieChart>
                </ChartContainer>
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold text-[var(--sea-ink)]">
                  {formatMoney(monthlyTotal)}
                </p>
              </div>
              <MonthlyBreakdownLegend items={monthlyBreakdown} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--sea-ink)]">
            Margen libre ({formatMoney(data.bloque2.margen_monto)}) vs.
            Compromisos próximo mes ({formatMoney(data.bloque2.comp_prox_mes)})
          </p>
          <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            {data.bloque2.texto_analisis}
          </p>
        </div>
      </section>

      {/* Bloque 3: Tu camino */}
      <section
        aria-labelledby="camino-colchon"
        className="demo-panel space-y-6"
      >
        <p className="island-kicker">3 · Tu camino</p>
        <h2
          id="camino-colchon"
          className="text-2xl font-bold text-[var(--sea-ink)]"
        >
          Tu camino al colchón
        </h2>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 space-y-3">
          <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            Para este cálculo usamos un colchón de <strong>3 meses</strong> de
            tus compromisos fijos y variables. Partimos del supuesto de que hoy
            tenés cero ahorros — puede ser verdad o no, pero es el punto de
            partida más conservador.
          </p>
          <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
            <span className="text-xs text-[var(--sea-ink-soft)]">
              Tu colchón objetivo:
            </span>
            <strong className="text-xl font-bold text-[var(--sea-ink)]">
              {formatMoney(data.bloque3.colchon_objetivo)}
            </strong>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="discretionary-reduction"
              className="font-semibold text-[var(--sea-ink)]"
            >
              ¿Cuánto recortás tus gustitos?
            </label>
            <output className="shrink-0 whitespace-nowrap font-mono text-lg font-bold text-[var(--palm)]">
              {reduction}%
            </output>
          </div>

          <input
            id="discretionary-reduction"
            aria-label="Recorte de gastos discrecionales"
            type="range"
            min="0"
            max="100"
            value={reduction}
            onChange={(event) => setReduction(Number(event.target.value))}
            className="w-full accent-[var(--palm)] cursor-pointer"
          />

          <div className="flex justify-between text-xs text-[var(--sea-ink-soft)]">
            <span>Sin cambios</span>
            <span>Todo a cero</span>
          </div>

          <p
            aria-live="polite"
            className="text-sm font-medium text-[var(--sea-ink)]"
          >
            Ahorrarías {formatMoney(monthlySavings)} por mes con este recorte
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
            <span className="text-sm text-[var(--sea-ink-soft)]">
              ¿Cuándo llegás al colchón?
            </span>
            <p
              aria-live="polite"
              className={
                arrival === -1
                  ? "text-right text-lg font-bold text-[#B03A2E]"
                  : "text-right text-lg font-bold text-[var(--palm)]"
              }
            >
              {arrivalLabel}
            </p>
          </div>
        </div>

        <ChartContainer
          data-testid="projection-chart"
          config={projectionChartConfig}
          className="h-64 w-full"
        >
          <LineChart
            data={projectionData}
            margin={{ top: 12, right: 12, left: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={88}
              domain={[
                projectionMin - projectionPadding,
                projectionMax + projectionPadding,
              ]}
              tickFormatter={formatMoney}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="month"
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <ReferenceLine
              y={data.bloque3.colchon_objetivo}
              stroke="var(--palm)"
              strokeDasharray="4 4"
            />
            <Line
              dataKey="baseline"
              type="monotone"
              stroke="var(--color-baseline)"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="selected"
              type="monotone"
              stroke="var(--color-selected)"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="maximum"
              type="monotone"
              stroke="var(--color-maximum)"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--sea-ink-soft)]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-b border-dashed border-[var(--sea-ink-soft)]" />
            <span>Sin tocar nada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-[var(--palm)]" />
            <span>Tu ajuste (slider)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-b border-solid border-[var(--lagoon)]" />
            <span>Máximo posible</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)] border-t border-[var(--line)] pt-4">
          {data.bloque3.texto_hitos}
        </p>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] leading-relaxed">
          <p>
            <strong>ℹ️ Informe ilustrativo.</strong> Estamos desarrollando Norte
            y este prototipo puede contener errores. Los datos ingresados son
            aproximados — los resultados son orientativos, no asesoramiento
            financiero.
          </p>
        </div>
      </section>

      {/* Bloque 4: Qué es Norte */}
      <section aria-labelledby="vision-norte" className="demo-panel space-y-6">
        <p className="island-kicker">4 · Qué es Norte</p>
        <h2
          id="vision-norte"
          className="text-2xl font-bold leading-snug text-[var(--sea-ink)]"
        >
          Esto que acabás de ver es solo una pequeña muestra.
        </h2>
        <div className="space-y-4 text-base leading-relaxed text-[var(--sea-ink-soft)]">
          <p>
            Querés construir un colchón financiero, viajar, cambiar el auto,
            comprar una casa o empezar a planificar tu retiro. El problema es
            que esas metas suelen quedar separadas de las decisiones que tomás
            todos los días.
          </p>
          <p>
            Entre ingresos, gastos, cuotas, inflación, dólar e imprevistos, el
            plan cambia todo el tiempo. Norte lo mantiene actualizado por vos:
          </p>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6 md:col-start-1">
            <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
              Tus finanzas se actualizan solas
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]">
              Incorpora tus ingresos, gastos y cuotas para que no tengas que
              registrar cada movimiento.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6 md:col-start-1">
            <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
              Todos tus objetivos, en una sola hoja de ruta
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]">
              Ves qué estás construyendo, cuánto avanzaste y cómo se conectan
              tus distintos objetivos.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6 md:col-start-1">
            <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
              Tu camino cambia cuando cambia tu vida
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]">
              Si aparece un gasto, cambia un ingreso o modificás una prioridad,
              Norte ajusta automáticamente tu hoja de ruta.
            </p>
          </article>
          <div className="flex justify-center rounded-2xl bg-[var(--sand)] p-4 md:col-start-2 md:row-start-1 md:row-span-3">
            <img
              src="/images/roadmap2.webp"
              alt="Hoja de ruta financiera de Norte"
              className="mx-auto w-full max-w-sm rounded-2xl md:max-h-[550px] md:w-auto md:max-w-full"
            />
          </div>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6 md:col-start-1">
            <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
              Podés probar antes de decidir
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]">
              Simulá qué pasa con tu hoja de ruta si hacés una compra, tomás
              cuotas, ahorrás más o aparece un gasto inesperado.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6 md:col-start-1">
            <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
              Podés preguntarle antes de gastar
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]">
              Escribile a Norte por WhatsApp y entendé qué impacto tendría sobre
              tus objetivos.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6 md:col-start-1">
            <h3 className="text-lg font-semibold text-[var(--sea-ink)]">
              Recibí alertas inteligentes en tu WhatsApp
            </h3>
            <p className="mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]">
              Norte te avisa cuando una decisión, un ingreso o un vencimiento
              puede cambiar tu plan.
            </p>
          </article>
          <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-gray-700 bg-[#0b141a] p-4 text-white shadow-lg md:col-start-2 md:row-start-4 md:row-span-3">
            <div className="text-center">
              <span className="rounded-full bg-gray-800 px-3 py-1 text-[10px] text-gray-400">
                Diciembre 2026
              </span>
            </div>
            <div className="mr-auto max-w-[85%] rounded-xl bg-[#202c33] p-3 text-gray-100 shadow">
              <p className="text-sm leading-relaxed">
                <strong>Norte:</strong> Hoy entra tu aguinaldo — $4.500.000.
                Antes de que se mezcle con el mes, te propongo separar
                $2.800.000 directo al colchón. ¿Lo hacemos antes de las fiestas?
              </p>
              <span className="mt-1 block text-right text-[10px] text-gray-400">
                09:15
              </span>
            </div>
            <div className="ml-auto max-w-[85%] rounded-xl bg-[#005c4b] p-3 text-emerald-50 shadow">
              <p className="text-sm leading-relaxed">
                Ay, pero quiero comprar algo para las fiestas. ¿Puedo?
              </p>
              <span className="mt-1 block text-right text-[10px] text-emerald-200">
                18:40
              </span>
            </div>
            <div className="mr-auto max-w-[85%] rounded-xl bg-[#202c33] p-3 text-gray-100 shadow">
              <p className="text-sm leading-relaxed">
                <strong>Norte:</strong> Con tu foto de hoy: si destinás
                $2.800.000 al colchón y guardás $700.000 para fiestas, llegás
                igual en septiembre. Si lo mezclás todo, se corre un mes. Vos
                decidís — ahora con los números adelante.
              </p>
              <span className="mt-1 block text-right text-[10px] text-gray-400">
                18:42
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 text-center space-y-2">
          <p className="font-serif text-xl font-semibold text-[var(--sea-ink)]">
            Todo esto por lo que cuesta una pizza al mes.
          </p>
          <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            Estamos preparando el primer lanzamiento de Norte con cupos
            limitados. Sumate a la lista de espera para ser de los primeros en
            acceder.
          </p>
        </div>
        <div className="pt-2 text-center">
          <button
            type="button"
            className="demo-button w-full px-6 py-3 text-base sm:w-auto"
          >
            Quiero ser de los primeros en usar Norte →
          </button>
        </div>
      </section>
    </main>
  );
}
