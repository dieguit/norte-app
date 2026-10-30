import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, Inbox } from "lucide-react";
import {
  CATALOG_CATEGORIES,
  type ExplorerCampaignList,
  type ExplorerOverview,
  type ExplorerQuery,
} from "@repo/shared-types";
import {
  campaignStatus,
  categoryLabel,
  formatDateTime,
  termsOffersText,
  SOURCE_LABELS,
} from "./explorer-format";
import {
  FilterSelect,
  Pagination,
  SearchForm,
  StatusBadge,
  WarnBadge,
} from "./ExplorerParts";

export type CampaignSearch = Partial<Omit<ExplorerQuery, "pageSize">>;
const ALL = "all";

const STATUS_FILTER = [
  { value: ALL, label: "Todos los estados" },
  { value: "available", label: "Disponibles" },
  { value: "incomplete", label: "Incompletas" },
  { value: "hidden", label: "Ocultas" },
  { value: "withdrawn", label: "Retiradas" },
  { value: "expired", label: "Vencidas" },
];
const SOURCE_FILTER = [
  { value: ALL, label: "Todas las fuentes" },
  ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];
const CATEGORY_FILTER = [
  { value: ALL, label: "Todas las categorías" },
  ...CATALOG_CATEGORIES.map((value) => ({
    value,
    label: categoryLabel(value),
  })),
];

function tierItems(overview: ExplorerOverview, bank: string | undefined) {
  const bankName = (slug: string) =>
    overview.banks.find((b) => b.slug === slug)?.name ?? slug;
  const entries = Object.entries(overview.tiers).filter(
    ([slug]) => !bank || slug === bank,
  );
  const seen = new Set<string>();
  const items = entries.flatMap(([slug, tiers]) =>
    tiers
      .filter((t) => !seen.has(t.code) && seen.add(t.code))
      .map((t) => ({
        value: t.code,
        label: bank ? t.label : `${bankName(slug)} · ${t.label}`,
      })),
  );
  return [{ value: ALL, label: "Todos los niveles" }, ...items];
}

export function CampaignsPage({
  list,
  search,
  overview,
  onSearchChange,
  linkForPage,
}: {
  list: ExplorerCampaignList;
  search: CampaignSearch;
  overview: ExplorerOverview;
  onSearchChange: (next: CampaignSearch) => void;
  linkForPage: (page: number) => LinkProps;
}) {
  const bankNames = new Map(overview.banks.map((b) => [b.slug, b.name]));
  const bankItems = [
    { value: ALL, label: "Todos los bancos" },
    ...[...overview.banks]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((b) => ({ value: b.slug, label: b.name })),
  ];
  const pick = (key: keyof CampaignSearch) => (value: string) =>
    onSearchChange({ [key]: value === ALL ? undefined : value });

  return (
    <section aria-label="Campañas" className="flex flex-col gap-5">
      <SearchForm
        key={search.q ?? ""}
        id="campaign-q"
        label="Buscar por título, marca o ID externo"
        placeholder="Ej.: Coto, 20%, 12345"
        defaultValue={search.q ?? ""}
        onSearch={(q) => onSearchChange({ q: q || undefined })}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <FilterSelect
          id="filter-status"
          label="Estado"
          value={search.status ?? ALL}
          items={STATUS_FILTER}
          onChange={pick("status")}
        />
        <FilterSelect
          id="filter-source"
          label="Fuente"
          value={search.source ?? ALL}
          items={SOURCE_FILTER}
          onChange={pick("source")}
        />
        <FilterSelect
          id="filter-bank"
          label="Banco"
          value={search.bank ?? ALL}
          items={bankItems}
          onChange={(v) =>
            onSearchChange({ bank: v === ALL ? undefined : v, tier: undefined })
          }
        />
        <FilterSelect
          id="filter-tier"
          label="Nivel"
          value={search.tier ?? ALL}
          items={tierItems(overview, search.bank)}
          onChange={pick("tier")}
        />
        <FilterSelect
          id="filter-category"
          label="Categoría"
          value={search.category ?? ALL}
          items={CATEGORY_FILTER}
          onChange={pick("category")}
        />
      </div>
      <Pagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        noun={["campaña", "campañas"]}
        linkFor={linkForPage}
      />
      {list.items.length === 0 ? (
        <div className="flex flex-col items-center gap-1 border-t border-border py-12 text-center">
          <Inbox className="mb-2 size-6 text-accent-brand" aria-hidden="true" />
          <h2 className="m-0 text-heading text-foreground">
            No hay campañas con estos filtros
          </h2>
          <p className="m-0 text-body-sm text-muted-foreground">
            Probá con otra búsqueda o sacá algún filtro.
          </p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {list.items.map((c) => {
            const banks = c.bankSlugs.map((s) => bankNames.get(s) ?? s);
            return (
              <li key={c.id} className="border-t border-border last:border-b">
                <Link
                  to="/app/admin/benefits/$id"
                  params={{ id: c.id }}
                  className="group -mx-3 flex flex-col gap-x-6 gap-y-2 rounded-md px-3 py-4 text-foreground no-underline transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none sm:grid sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-heading">{c.title}</span>
                    <span className="text-body-sm text-muted-foreground">
                      {[
                        c.brandName ?? "Sin marca",
                        c.categories.map(categoryLabel).join(", ") ||
                          "Sin categoría",
                      ].join(" · ")}
                    </span>
                    <span className="text-caption">
                      {SOURCE_LABELS[c.source]} · ID {c.externalId} ·{" "}
                      {banks.length
                        ? banks.length > 3
                          ? `${banks.slice(0, 3).join(", ")} y ${banks.length - 3} más`
                          : banks.join(", ")
                        : "Sin bancos vigentes"}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={campaignStatus(c)} />
                      {c.terms?.eligibilityCompleteness === "incomplete" && (
                        <WarnBadge>Requisitos incompletos</WarnBadge>
                      )}
                      {c.detailStale && (
                        <WarnBadge>Detalle desactualizado</WarnBadge>
                      )}
                      {c.unpublishableReason && (
                        <WarnBadge>No publicable</WarnBadge>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 sm:items-end sm:text-right">
                      <span className="text-[15px] font-semibold">
                        {termsOffersText(c.terms)}
                      </span>
                      <span className="text-caption">
                        Visto: {formatDateTime(c.lastSeenAt)}
                      </span>
                    </div>
                    <ChevronRight
                      className="size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {list.total > list.pageSize && (
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          noun={["campaña", "campañas"]}
          linkFor={linkForPage}
          bottom
        />
      )}
    </section>
  );
}
