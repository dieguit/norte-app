import type { ReactNode } from "react";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeHttpUrl } from "./benefit-format";

export function Notice({
  tone = "info",
  children,
  action,
}: {
  tone?: "info" | "warn";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        tone === "warn" ? "bg-negative-soft" : "bg-surface-sunken",
      )}
    >
      <p
        className={cn(
          "m-0 flex gap-2 text-body-sm",
          tone === "warn" ? "text-negative" : "text-foreground",
        )}
      >
        {tone === "warn" && (
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}

// Only http(s) URLs become anchors; anything else is inert text.
export function VerifyLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const safe = safeHttpUrl(href);
  if (!safe)
    return (
      <span className="text-body-sm text-muted-foreground">
        Enlace de verificación no disponible
      </span>
    );
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground no-underline hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      {children}
      <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

const PULSE = "animate-pulse rounded-sm bg-muted motion-reduce:animate-none";

export function BenefitsLoading() {
  return (
    <div className="flex flex-col">
      <p role="status" className="m-0 py-3 text-body-sm text-muted-foreground">
        Cargando beneficios…
      </p>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex flex-col gap-2 border-t border-border py-4"
        >
          <div className={cn("h-5 w-1/2", PULSE)} />
          <div className={cn("h-4 w-3/4", PULSE)} />
          <div className={cn("h-4 w-1/3", PULSE)} />
        </div>
      ))}
    </div>
  );
}

export function BenefitsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md bg-negative-soft p-4"
    >
      <h2 className="m-0 text-heading text-negative">
        No pudimos cargar tus beneficios
      </h2>
      <p className="m-0 text-body-sm text-foreground">
        Puede ser un problema momentáneo. Probá de nuevo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-md bg-primary px-5 text-body-sm font-semibold text-primary-foreground"
      >
        Reintentar
      </button>
    </div>
  );
}

export function ChipButton({
  pressed,
  onClick,
  children,
  disabled,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-body-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50 motion-reduce:transition-none",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
