import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Settings2, Sparkles } from "lucide-react";
import {
  DIGEST_CATEGORIES,
  type BenefitBankList,
  type BenefitProfile,
  type BenefitResult,
  type BenefitSearchQuery,
  type BenefitSearchResult,
  type CatalogCategory,
} from "@repo/shared-types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchBenefits } from "@/features/benefits/benefits.functions";
import { purchaseConditionText } from "@/features/benefits/purchase-condition-format";
import {
  capText,
  categoryLabel,
  daysText,
  listJoin,
  nextDateText,
  offersText,
  usableWithText,
} from "./benefit-format";
import { ChipButton, Notice, VariantSummary } from "./BenefitParts";

export type ListSearch = Partial<
  Pick<BenefitSearchQuery, "q" | "category" | "bank" | "day">
>;
type Banks = BenefitBankList["banks"];

const DAYS = [
  { value: "today", label: "Hoy" },
  { value: "tomorrow", label: "Mañana" },
  { value: "week", label: "Esta semana" },
] as const;
const DAY_PHRASE = { today: "hoy", tomorrow: "mañana", week: "esta semana" };
const ALL = "all";

function BenefitRow({ benefit }: { benefit: BenefitResult }) {
  const next = nextDateText(benefit.nextDate);
  const others = benefit.variants;
  return (
    <Link
      to="/app/finances/benefits/$id"
      params={{ id: benefit.id }}
      className="group -mx-3 flex items-center gap-3 rounded-md px-3 py-4 text-foreground no-underline transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <span className="text-heading">
            {benefit.brandName ?? benefit.title}
          </span>
          <span className="text-[15px] font-semibold text-accent-brand sm:text-right">
            {offersText(benefit.offers)}
          </span>
        </div>
        {benefit.match === "conditional" && (
          <span className="text-caption font-medium text-accent-brand">
            Compatible con tus tarjetas · Condicionado
          </span>
        )}
        {benefit.match !== "needs_tier" && usableWithText(benefit) && (
          <span className="text-body-sm text-foreground">
            {usableWithText(benefit)}
          </span>
        )}
        {benefit.purchaseConditions.map((condition, index) => (
          <span key={index} className="text-caption text-muted-foreground">
            {condition.kind === "legal_purchase"
              ? "Condiciones legales sin interpretar: "
              : ""}
            {purchaseConditionText(condition)}
          </span>
        ))}
        <span className="text-body-sm text-muted-foreground">
          {[next, daysText(benefit.validity), capText(benefit)]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {benefit.tierLabels.length > 0 && benefit.match === "eligible" && (
          <span className="text-caption font-medium text-accent-brand">
            Tu nivel: {listJoin(benefit.tierLabels, "o")}
          </span>
        )}
        {benefit.match === "needs_tier" && (
          <span className="flex items-center gap-1 text-caption font-medium text-foreground">
            <Sparkles
              className="size-3.5 text-accent-brand"
              aria-hidden="true"
            />
            Con tu nivel podrías tener más
          </span>
        )}
        {others.length > 0 && (
          <span className="mt-1 flex flex-col gap-2 border-t border-border pt-2">
            <span className="text-caption font-semibold">Otras opciones</span>
            {others.map((v) => (
              <VariantSummary key={v.variantKey} variant={v} />
            ))}
          </span>
        )}
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}

function Filters({
  search,
  profile,
  banks,
  counts,
  onChange,
}: {
  search: ListSearch;
  profile: BenefitProfile;
  banks: Banks;
  counts: Record<string, number>;
  onChange: (next: ListSearch) => void;
}) {
  const day = search.day ?? "today";
  const mine = profile.categories as CatalogCategory[];
  const ordered = [
    ...mine,
    ...DIGEST_CATEGORIES.filter((c) => !mine.includes(c)),
  ];
  const bankName = (slug: string) =>
    banks.find((b) => b.slug === slug)?.name ?? slug;
  const bankItems = [
    { value: ALL, label: "Todos tus bancos" },
    ...profile.banks.map((b) => ({ value: b.slug, label: bankName(b.slug) })),
  ];
  const count = (c: string) => (counts[c] !== undefined ? ` ${counts[c]}` : "");

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Día" className="flex gap-2">
        {DAYS.map((d) => (
          <ChipButton
            key={d.value}
            pressed={day === d.value}
            onClick={() =>
              onChange({ day: d.value === "today" ? undefined : d.value })
            }
          >
            {d.label}
          </ChipButton>
        ))}
      </div>
      <div
        role="group"
        aria-label="Categoría"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 xl:mx-0 xl:flex-wrap xl:px-0"
      >
        <ChipButton
          pressed={!search.category}
          onClick={() => onChange({ category: undefined })}
        >
          Tus categorías
        </ChipButton>
        {ordered.map((c) => (
          <ChipButton
            key={c}
            pressed={search.category === c}
            onClick={() => onChange({ category: c })}
          >
            {categoryLabel(c)}
            <span className="tabular-nums opacity-70">{count(c)}</span>
          </ChipButton>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          role="search"
          className="flex min-w-0 flex-1 flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(
              new FormData(e.currentTarget).get("q") ?? "",
            ).trim();
            onChange({ q: q || undefined });
          }}
        >
          <label htmlFor="benefit-q" className="text-caption font-medium">
            Buscar por marca
          </label>
          <div className="flex gap-2">
            <input
              key={search.q ?? ""}
              id="benefit-q"
              name="q"
              type="search"
              maxLength={120}
              defaultValue={search.q ?? ""}
              placeholder="Ej.: Coto, YPF"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" className="h-11 rounded-md px-4">
              Buscar
            </Button>
          </div>
        </form>
        {profile.banks.length > 1 && (
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label htmlFor="benefit-bank" className="text-caption font-medium">
              Banco
            </label>
            <Select
              items={bankItems}
              value={search.bank ?? ALL}
              onValueChange={(v) =>
                v && onChange({ bank: v === ALL ? undefined : v })
              }
            >
              <SelectTrigger
                id="benefit-bank"
                aria-label="Banco"
                className="h-11 w-full rounded-md text-[15px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bankItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

function CoverageNotices({
  result,
  profile,
  banks,
  bank,
}: {
  result: BenefitSearchResult;
  profile: BenefitProfile;
  banks: Banks;
  bank?: string;
}) {
  const byslug = new Map(banks.map((b) => [b.slug, b]));
  const name = (slug: string) => byslug.get(slug)?.name ?? slug;
  const modoOnly = profile.banks
    .filter((b) => byslug.get(b.slug)?.coverage === "modo")
    .map((b) => name(b.slug));
  const selected = bank ? byslug.get(bank) : undefined;
  return (
    <>
      {result.staleBanks.length > 0 && (
        <Notice tone="warn">
          La información de {listJoin(result.staleBanks.map(name), "y")} puede
          estar desactualizada.
        </Notice>
      )}
      {!profile.usesModo && modoOnly.length > 0 && (
        <Notice
          tone="warn"
          action={
            <Link
              to="/app/finances/benefits/settings"
              className="text-body-sm font-semibold whitespace-nowrap text-foreground"
            >
              Revisar
            </Link>
          }
        >
          De {listJoin(modoOnly, "y")} solo tenemos promos con MODO y nos
          dijiste que no pagás con MODO, así que no vas a ver beneficios de{" "}
          {modoOnly.length > 1 ? "esos bancos" : "ese banco"}.
        </Notice>
      )}
      {selected?.coverage === "modo" && profile.usesModo && (
        <Notice>
          De {selected.name} mostramos sus promos con MODO; su catálogo propio
          todavía no.
        </Notice>
      )}
    </>
  );
}

function NotConfigured() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-sunken p-5 xl:max-w-xl xl:p-6">
      <h2 className="m-0 text-title text-foreground">
        Contanos con qué bancos pagás
      </h2>
      <p className="m-0 text-body text-muted-foreground">
        Con tus bancos, tarjetas y nivel te mostramos beneficios compatibles con
        tu perfil, con el enlace para verificar sus condiciones.
      </p>
      <Link
        to="/app/finances/benefits/settings"
        className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground no-underline hover:bg-primary/85"
      >
        Configurar mis bancos
      </Link>
    </div>
  );
}

export function BenefitsList({
  result,
  query,
  profile,
  banks,
  onSearchChange,
}: {
  result: BenefitSearchResult;
  query: BenefitSearchQuery;
  profile: BenefitProfile;
  banks: Banks;
  onSearchChange: (next: ListSearch) => void;
}) {
  const [extra, setExtra] = useState<BenefitResult[]>([]);
  const [page, setPage] = useState(result.page);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const items = [...result.items, ...extra];
  const day = query.day;

  if (!result.profileConfigured) return <NotConfigured />;

  const loadMore = async () => {
    setLoading(true);
    setLoadError(false);
    const firstNew = items.length;
    try {
      const next = await searchBenefits({ data: { ...query, page: page + 1 } });
      setExtra((prev) => [...prev, ...next.items]);
      setPage(next.page);
      requestAnimationFrame(() =>
        listRef.current?.querySelectorAll("a")[firstNew]?.focus(),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-body-sm text-muted-foreground">
          Beneficios compatibles con tu perfil, según lo que publica cada banco.
          Revisá las condiciones antes de pagar.
        </p>
        <Link
          to="/app/finances/benefits/settings"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-body-sm font-semibold text-foreground no-underline hover:bg-muted"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          Tus bancos
        </Link>
      </div>
      <Filters
        search={query}
        profile={profile}
        banks={banks}
        counts={result.countsByCategory}
        onChange={onSearchChange}
      />
      <CoverageNotices
        result={result}
        profile={profile}
        banks={banks}
        bank={query.bank}
      />
      <p
        role="status"
        className="m-0 text-body-sm text-muted-foreground tabular-nums"
      >
        {result.total === 1
          ? "1 beneficio"
          : `${result.total.toLocaleString("es-AR")} beneficios`}{" "}
        {DAY_PHRASE[day]}
        {query.category ? ` en ${categoryLabel(query.category)}` : ""}
      </p>
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-border py-8">
          <h2 className="m-0 text-heading text-foreground">
            No encontramos beneficios para {DAY_PHRASE[day]}
            {query.category ? ` en ${categoryLabel(query.category)}` : ""}
          </h2>
          {day !== "week" && (
            <div className="flex flex-wrap gap-2">
              {day === "today" && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md"
                  onClick={() => onSearchChange({ day: "tomorrow" })}
                >
                  Ver mañana
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md"
                onClick={() => onSearchChange({ day: "week" })}
              >
                Ver esta semana
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ul ref={listRef} className="m-0 flex list-none flex-col p-0">
          {items.map((b) => (
            <li key={b.id} className="border-t border-border last:border-b">
              <BenefitRow benefit={b} />
            </li>
          ))}
        </ul>
      )}
      {items.length < result.total && (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-md sm:w-auto sm:px-8"
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading ? "Cargando…" : "Ver más"}
          </Button>
          <span className="text-caption tabular-nums">
            Viendo {items.length} de {result.total.toLocaleString("es-AR")}
          </span>
          {loadError && (
            <p role="alert" className="m-0 text-body-sm text-negative">
              No pudimos cargar más. Probá de nuevo.
            </p>
          )}
        </div>
      )}
      <p className="m-0 text-caption">
        Los bancos pueden cambiar las condiciones. Verificá antes de pagar.
      </p>
    </div>
  );
}
