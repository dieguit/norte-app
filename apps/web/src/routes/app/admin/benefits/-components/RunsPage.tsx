import type { ExplorerOverview } from "@repo/shared-types";
import { cn } from "@/lib/utils";
import { formatDateTime, SOURCE_LABELS } from "./explorer-format";
import { Notice } from "./ExplorerParts";

type Bank = ExplorerOverview["banks"][number];
type Run = ExplorerOverview["runs"][number];

function coverage(bank: Bank) {
  if (bank.playdigitalId && bank.ownCatalog)
    return "Promos MODO + catálogo propio";
  if (bank.playdigitalId) return "Solo promos MODO";
  if (bank.ownCatalog) return "Solo catálogo propio";
  return "Sin fuente";
}

const OUTCOME: Record<Run["outcome"], [string, string]> = {
  ok: ["Completa", "text-positive"],
  partial: ["Parcial", "text-muted-foreground"],
  failed: ["Falló", "text-negative"],
};

function RunOutcome({ run }: { run: Run }) {
  const [label, tone] = OUTCOME[run.outcome];
  return (
    <span className={cn("text-body-sm font-semibold", tone)}>
      {label}
      {run.outcome === "ok" && !run.complete && " (catálogo incompleto)"}
    </span>
  );
}

const n = (value: number | null) =>
  value === null ? "?" : value.toLocaleString("es-AR");

function RunsTable({
  runs,
  bankName,
}: {
  runs: Run[];
  bankName: (slug: string) => string;
}) {
  if (!runs.length)
    return (
      <p className="m-0 border-t border-border py-8 text-center text-body-sm text-muted-foreground">
        Todavía no hay corridas registradas.
      </p>
    );
  return (
    <div className="-mx-5 overflow-x-auto px-5 xl:mx-0 xl:px-0">
      <table className="w-full min-w-[60rem] border-collapse text-left">
        <caption className="sr-only">
          Últimas corridas de los adaptadores
        </caption>
        <thead>
          <tr className="text-overline text-muted-foreground">
            {[
              "Inicio",
              "Fuente y banco",
              "Resultado",
              "Conteos",
              "Anomalías y errores",
            ].map((h) => (
              <th
                key={h}
                scope="col"
                className="py-3 pr-6 font-semibold last:pr-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-border align-top">
              <th
                scope="row"
                className="py-3.5 pr-6 text-left text-body-sm font-normal whitespace-nowrap"
              >
                {formatDateTime(run.startedAt)}
              </th>
              <td className="py-3.5 pr-6 text-body-sm">
                <span className="block font-semibold">
                  {SOURCE_LABELS[run.source]}
                </span>
                <span className="text-caption">
                  {run.bankSlug
                    ? bankName(run.bankSlug)
                    : "Todos los bancos de la fuente"}
                </span>
              </td>
              <td className="py-3.5 pr-6">
                <RunOutcome run={run} />
              </td>
              <td className="py-3.5 pr-6 text-body-sm tabular-nums">
                <span className="block">
                  {n(run.observedCount)} vistas de {n(run.totalReported)}{" "}
                  informadas
                </span>
                <span className="text-caption">
                  {n(run.rawRowCount)} filas · {n(run.upserted)} guardadas ·{" "}
                  {n(run.unpublishable)} no publicables
                </span>
              </td>
              <td className="py-3.5 text-body-sm">
                {run.error && (
                  <p className="m-0 mb-1 text-negative">{run.error}</p>
                )}
                {run.anomalies.length ? (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">
                      {run.anomalies.length} anomalías
                    </summary>
                    <ul className="m-0 mt-1 flex flex-col gap-0.5 pl-4 text-caption">
                      {run.anomalies.map((a, i) => (
                        <li key={i}>
                          <span className="font-semibold">{a.kind}</span>:{" "}
                          {a.detail}
                          {a.externalId && ` (ID ${a.externalId})`}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  !run.error && (
                    <span className="text-caption">Sin anomalías</span>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RunsPage({ overview }: { overview: ExplorerOverview }) {
  const runs = [...overview.runs].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  const banks = [...overview.banks].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const bankName = (slug: string) =>
    overview.banks.find((b) => b.slug === slug)?.name ?? slug;
  const lastRun = (slug: string) => runs.find((r) => r.bankSlug === slug);

  return (
    <div className="flex flex-col gap-8">
      <Notice
        tone="info"
        title="La cobertura no es la misma en todos los bancos"
      >
        De la mayoría de los bancos solo leemos sus promos con MODO. El catálogo
        propio se lee solo donde lo indica la columna Cobertura, y con el
        alcance que se aclara en cada caso.
      </Notice>
      <section aria-labelledby="banks-title" className="flex flex-col gap-3">
        <h2 id="banks-title" className="m-0 text-title text-foreground">
          Bancos{" "}
          <span className="text-body-sm font-normal text-muted-foreground tabular-nums">
            ({banks.length})
          </span>
        </h2>
        <div className="-mx-5 overflow-x-auto px-5 xl:mx-0 xl:px-0">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <caption className="sr-only">Bancos y cobertura</caption>
            <thead>
              <tr className="text-overline text-muted-foreground">
                {[
                  "Banco",
                  "Cobertura",
                  "Alcance relevado",
                  "Última corrida (entre las últimas 50)",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="py-3 pr-6 font-semibold last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {banks.map((bank) => {
                const run = lastRun(bank.slug);
                return (
                  <tr
                    key={bank.slug}
                    className="border-t border-border align-top"
                  >
                    <th scope="row" className="py-3 pr-6 text-left font-normal">
                      <span className="block text-body-sm font-semibold">
                        {bank.name}
                      </span>
                      <span className="text-caption">{bank.slug}</span>
                    </th>
                    <td className="py-3 pr-6 text-body-sm">{coverage(bank)}</td>
                    <td className="py-3 pr-6 text-body-sm text-muted-foreground">
                      {bank.ownCatalogScope ?? "—"}
                    </td>
                    <td className="py-3 text-body-sm">
                      {run ? (
                        <>
                          <RunOutcome run={run} />
                          <span className="block text-caption">
                            {formatDateTime(run.startedAt)}
                          </span>
                        </>
                      ) : (
                        <span className="text-caption">
                          Sin corrida propia; puede estar incluido en una
                          corrida general
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="runs-title" className="flex flex-col gap-3">
        <h2 id="runs-title" className="m-0 text-title text-foreground">
          Últimas corridas
        </h2>
        <p className="m-0 text-body-sm text-muted-foreground">
          Se muestran las 50 más recientes.
        </p>
        <RunsTable runs={runs} bankName={bankName} />
      </section>
      <section
        aria-labelledby="cli-title"
        className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4"
      >
        <h2 id="cli-title" className="m-0 text-heading text-foreground">
          Correr un adaptador
        </h2>
        <p className="m-0 text-body-sm text-muted-foreground">
          Por ahora se corre desde la terminal. En seco no guarda nada:
        </p>
        <pre className="m-0 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs text-foreground">
          {
            "pnpm --filter @repo/api benefits:ingest --source playdigital --bank macro --dry-run\npnpm --filter @repo/api benefits:ingest --source galicia --commit"
          }
        </pre>
      </section>
    </div>
  );
}
