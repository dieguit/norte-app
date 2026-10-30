import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { BenefitBankList, BenefitDetail } from "@repo/shared-types";
import {
  capText,
  categoryLabel,
  channelsText,
  daysText,
  listJoin,
  minimumText,
  offersText,
  requirementsText,
  SOURCE_NAMES,
  updatedText,
  usableWithText,
  variantText,
} from "./benefit-format";
import { Notice, VerifyLink } from "./BenefitParts";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border py-3 sm:flex-row sm:gap-6">
      <dt className="text-body-sm text-muted-foreground sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="m-0 text-body-sm text-foreground">{children}</dd>
    </div>
  );
}

export function BenefitDetailView({
  benefit,
  banks,
}: {
  benefit: BenefitDetail;
  banks: BenefitBankList["banks"];
}) {
  const bankName = (slug: string) =>
    banks.find((b) => b.slug === slug)?.name ?? slug;
  const others = benefit.variants.filter((v) => v.id !== benefit.id);
  const channels = channelsText(benefit.channels);
  const usable = usableWithText(benefit);

  return (
    <article
      aria-labelledby="benefit-title"
      className="flex flex-col gap-6 xl:max-w-3xl"
    >
      <Link
        to="/app/finances/benefits"
        className="inline-flex h-11 items-center gap-1.5 self-start text-body-sm font-semibold text-accent-brand no-underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Todos los beneficios
      </Link>
      <header className="flex flex-col gap-2">
        <p className="m-0 text-overline text-accent-brand">
          {benefit.categories.map(categoryLabel).join(" · ") || "Beneficio"}
        </p>
        <h2
          id="benefit-title"
          className="m-0 text-display text-foreground xl:text-[32px]"
        >
          {benefit.brandName ?? benefit.title}
        </h2>
        <p className="m-0 font-serif text-[22px] leading-tight font-semibold text-accent-brand">
          {offersText(benefit.offers)}
        </p>
        {benefit.brandName && (
          <p className="m-0 text-body-sm text-muted-foreground">
            {benefit.title}
          </p>
        )}
      </header>

      {benefit.match === "ineligible" && (
        <Notice tone="warn">
          Con los bancos y tarjetas que configuraste, este beneficio no te
          corresponde.
        </Notice>
      )}
      {benefit.match === "needs_tier" && (
        <Notice
          action={
            <Link
              to="/app/finances/benefits/settings"
              className="text-body-sm font-semibold whitespace-nowrap text-foreground"
            >
              Elegir nivel
            </Link>
          }
        >
          <Sparkles
            className="mr-1 inline size-4 text-accent-brand"
            aria-hidden="true"
          />
          Este beneficio depende de tu nivel en el banco. Con tu nivel podrías
          tener más.
        </Notice>
      )}

      <section aria-labelledby="req-title" className="flex flex-col gap-2">
        <h3 id="req-title" className="m-0 text-heading text-foreground">
          Qué necesitás
        </h3>
        <p className="m-0 text-body text-foreground">
          {requirementsText(
            benefit.eligibility,
            benefit.requiresModo,
            bankName,
          )}
        </p>
        {usable && (
          <p className="m-0 text-body-sm text-accent-brand">
            {benefit.match === "eligible"
              ? "Lo podés usar: "
              : "Si tenés el nivel requerido, lo podrías usar: "}
            {usable.charAt(0).toLowerCase() + usable.slice(1)}
          </p>
        )}
      </section>

      <dl className="m-0 flex flex-col">
        <Row label="Cuándo">{daysText(benefit.validity)}</Row>
        {channels && <Row label="Cómo pagar">{channels}</Row>}
        {benefit.where && <Row label="Dónde">{benefit.where}</Row>}
        <Row label="Tope">{capText(benefit)}</Row>
        <Row label="Compra mínima">
          {minimumText(benefit.minimumSpendMinor)}
        </Row>
        {benefit.tierLabels.length > 0 && (
          <Row label="Nivel">{listJoin(benefit.tierLabels, "o")}</Row>
        )}
      </dl>

      {others.length > 0 && (
        <section
          aria-labelledby="variants-title"
          className="flex flex-col gap-2"
        >
          <h3 id="variants-title" className="m-0 text-heading text-foreground">
            Según el nivel
          </h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {others.map((v) => (
              <li key={v.id} className="text-body-sm text-foreground">
                {variantText(v)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {benefit.warnings.length > 0 && (
        <Notice tone="warn">
          {benefit.warnings.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </Notice>
      )}

      <section
        aria-labelledby="verify-title"
        className="flex flex-col items-start gap-3 rounded-lg bg-surface-sunken p-4 xl:p-5"
      >
        <h3 id="verify-title" className="m-0 text-heading text-foreground">
          Verificá antes de pagar
        </h3>
        <p className="m-0 text-body-sm text-muted-foreground">
          Los bancos pueden cambiar las condiciones. Confirmalo en la fuente
          oficial.
        </p>
        <VerifyLink href={benefit.verifyUrl}>
          Ver en {SOURCE_NAMES[benefit.source]}
        </VerifyLink>
        {benefit.verifyHint && (
          <p className="m-0 text-body font-semibold text-foreground">
            {benefit.verifyHint}
          </p>
        )}
        <p className="m-0 text-caption">{updatedText(benefit.updatedAt)}</p>
      </section>

      {benefit.legalText && (
        <details className="text-body-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-foreground">
            Bases y condiciones
          </summary>
          <p className="m-0 whitespace-pre-wrap text-muted-foreground">
            {benefit.legalText}
          </p>
        </details>
      )}
    </article>
  );
}
