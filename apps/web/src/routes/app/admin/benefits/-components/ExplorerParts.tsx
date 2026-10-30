import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  safeHttpUrl,
  STATUS_LABELS,
  type CampaignStatus,
} from "./explorer-format";

const STATUS_TONE: Record<CampaignStatus, string> = {
  available: "bg-accent-brand-soft text-accent-brand",
  incomplete: "bg-secondary text-secondary-foreground border-input",
  hidden: "border-border text-muted-foreground",
  withdrawn: "bg-negative-soft text-negative",
  expired: "border-border text-subtle-foreground",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-sm", STATUS_TONE[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function WarnBadge({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="rounded-sm border-negative/30 text-negative"
    >
      <TriangleAlert aria-hidden="true" />
      {children}
    </Badge>
  );
}

export function NoAccess() {
  return (
    <div className="flex flex-col items-center gap-1 border-t border-border py-16 text-center xl:mt-10">
      <Lock className="mb-2 size-6 text-accent-brand" aria-hidden="true" />
      <h1 className="m-0 text-title text-foreground">Sin acceso</h1>
      <p className="m-0 max-w-sm text-body-sm text-muted-foreground">
        Esta sección es solo para el equipo que administra beneficios. Si creés
        que deberías verla, pedí acceso.
      </p>
      <Link
        to="/app"
        className="mt-4 text-body-sm font-semibold text-accent-brand"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

export function ExplorerLoading() {
  const pulse = "animate-pulse rounded-sm bg-muted motion-reduce:animate-none";
  return (
    <div className="flex flex-col">
      <p role="status" className="m-0 py-3 text-body-sm text-muted-foreground">
        Cargando…
      </p>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex justify-between gap-6 border-t border-border py-4"
        >
          <div className="flex flex-1 flex-col gap-2">
            <div className={cn("h-5 w-2/3", pulse)} />
            <div className={cn("h-4 w-1/3", pulse)} />
          </div>
          <div className={cn("h-5 w-28", pulse)} />
        </div>
      ))}
    </div>
  );
}

export function ExplorerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-4 flex flex-col items-start gap-3 rounded-md bg-negative-soft p-4"
    >
      <h2 className="m-0 text-heading text-negative">
        No pudimos cargar el explorador
      </h2>
      <button
        type="button"
        className="text-body-sm font-semibold text-foreground underline underline-offset-4"
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}

export function Notice({
  tone = "warn",
  title,
  children,
}: {
  tone?: "warn" | "info";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md px-3.5 py-3",
        tone === "warn" ? "bg-negative-soft" : "bg-surface-sunken",
      )}
    >
      <span
        className={cn(
          "text-body-sm font-semibold",
          tone === "warn" ? "text-negative" : "text-foreground",
        )}
      >
        {title}
      </span>
      {children && (
        <div className="text-body-sm text-foreground">{children}</div>
      )}
    </div>
  );
}

// Only http(s) URLs become anchors; anything else is shown as inert text.
export function SafeLink({
  href,
  children,
  className,
}: {
  href: string | null;
  children: ReactNode;
  className?: string;
}) {
  const safe = safeHttpUrl(href);
  if (!safe)
    return (
      <span className="text-body-sm text-muted-foreground">
        {children} (enlace no válido)
      </span>
    );
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-accent-brand",
        className,
      )}
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden="true" />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

export function FilterSelect({
  id,
  label,
  value,
  items,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string | null;
  placeholder?: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium">
        {label}
      </label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          className="h-11 w-full rounded-md text-[15px]"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const count = (n: number) => n.toLocaleString("es-AR");

export function Pagination({
  page,
  pageSize,
  total,
  noun,
  linkFor,
  bottom = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  noun: [string, string];
  linkFor: (page: number) => LinkProps;
  bottom?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const pager =
    "flex h-11 items-center gap-1 rounded-md border border-border px-3 text-body-sm font-semibold text-foreground no-underline hover:bg-muted";
  const off =
    "flex h-11 items-center gap-1 rounded-md border border-border px-3 text-body-sm text-subtle-foreground opacity-50";
  return (
    <nav
      aria-label={bottom ? "Paginación, final de la lista" : "Paginación"}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p
        role={bottom ? undefined : "status"}
        className="m-0 text-body-sm text-muted-foreground tabular-nums"
      >
        {total
          ? `${count(from)}–${count(to)} de ${count(total)} ${total === 1 ? noun[0] : noun[1]}`
          : `0 ${noun[1]}`}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            {...linkFor(page - 1)}
            className={pager}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
          </Link>
        ) : (
          <span className={off} aria-hidden="true">
            <ChevronLeft className="size-4" /> Anterior
          </span>
        )}
        <span className="text-caption tabular-nums">
          Página {count(page)} de {count(pages)}
        </span>
        {page < pages ? (
          <Link
            {...linkFor(page + 1)}
            className={pager}
            aria-label="Página siguiente"
          >
            Siguiente <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className={off} aria-hidden="true">
            Siguiente <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}

export function SearchForm({
  id,
  label,
  defaultValue,
  placeholder,
  onSearch,
}: {
  id: string;
  label: string;
  defaultValue: string;
  placeholder: string;
  onSearch: (q: string) => void;
}) {
  return (
    <form
      role="search"
      className="flex min-w-0 flex-1 flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(String(new FormData(e.currentTarget).get("q") ?? "").trim());
      }}
    >
      <label htmlFor={id} className="text-caption font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={160}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-md bg-primary px-4 text-body-sm font-semibold text-primary-foreground hover:bg-primary/85"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}

// API (Nest) messages mapped to admin-facing copy; unknown messages pass through.
const API_ERRORS: Record<string, string> = {
  "Brand name or alias already belongs to another brand":
    "Ese nombre o alias ya es de otra marca.",
  "Source identity already belongs to another brand":
    "Esa marca de origen ya está asociada a otra marca.",
  "Aliases must contain a brand name":
    "Los alias tienen que tener al menos un nombre.",
  "Choose two different brands": "Elegí dos marcas distintas.",
  "Brand not found": "No encontramos la marca. Recargá la lista.",
  "Campaign not found": "No encontramos la campaña. Recargá la página.",
};

export function mutationErrorText(
  error: unknown,
  fallback = "No pudimos guardar el cambio.",
) {
  const message = error instanceof Error ? error.message : "";
  return API_ERRORS[message] ?? (message || fallback);
}
