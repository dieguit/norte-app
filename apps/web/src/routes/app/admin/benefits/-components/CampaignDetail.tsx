import { Fragment, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import type {
  CampaignTerms,
  ExplorerCampaignDetail,
  ExplorerOverview,
  Requirement,
} from "@repo/shared-types";
import { PageHeader } from "@/components/norte/PageHeader";
import { SplitLayout } from "@/components/norte/PageLayout";
import { Button } from "@/components/ui/button";
import { hideExplorerCampaign } from "@/features/benefits-admin/benefits-explorer.functions";
import { cn } from "@/lib/utils";
import {
  campaignStatus,
  capsText,
  categoryLabel,
  channelsText,
  formatDateTime,
  minimumSpendText,
  offersText,
  requirementLeafText,
  SOURCE_LABELS,
  validityText,
} from "./explorer-format";
import {
  mutationErrorText,
  Notice,
  SafeLink,
  StatusBadge,
  WarnBadge,
} from "./ExplorerParts";

function RequirementNode({ node }: { node: Requirement }) {
  if (!("allOf" in node) && !("anyOf" in node))
    return <span>{requirementLeafText(node)}</span>;
  const all = "allOf" in node;
  const children = all ? node.allOf : node.anyOf;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium">
        {all ? "Cumplir todo:" : "Cumplir alguna opción:"}
      </span>
      <ul
        className={cn(
          "m-0 flex list-none flex-col gap-1.5 border-l-2 p-0 pl-3.5",
          all ? "border-foreground/30" : "border-accent-brand/50",
        )}
      >
        {children.map((child, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className="text-overline text-[10px] text-accent-brand"
              >
                {all ? "y" : "o"}
              </li>
            )}
            <li className="text-body-sm text-foreground">
              {index > 0 && (
                <span className="sr-only">{all ? "y " : "o "}</span>
              )}
              <RequirementNode node={child} />
            </li>
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border py-5 first:border-t-0 first:pt-0">
      <h2 className="m-0 text-heading text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Lines({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {items.map((item) => (
        <li key={item} className="text-body-sm text-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}

function TermsView({ terms }: { terms: CampaignTerms }) {
  return (
    <div className="flex flex-col gap-4">
      {terms.eligibilityCompleteness === "incomplete" && (
        <Notice title="Requisitos incompletos: no se muestra como disponible">
          {terms.unresolved.length > 0 && <Lines items={terms.unresolved} />}
        </Notice>
      )}
      <RequirementNode node={terms.eligibility} />
      <Lines
        items={[
          offersText(terms),
          minimumSpendText(terms.minimumSpendMinor),
          ...capsText(terms),
          ...validityText(terms.validity),
          channelsText(terms.channels),
          ...(terms.where ? [`Dónde: ${terms.where}`] : []),
        ]}
      />
      {terms.warnings.length > 0 && (
        <Notice tone="info" title="Advertencias del adaptador">
          <Lines items={terms.warnings} />
        </Notice>
      )}
      {terms.legalText && (
        <details className="text-body-sm">
          <summary className="cursor-pointer font-semibold text-foreground">
            Texto legal
          </summary>
          <p className="m-0 mt-2 whitespace-pre-wrap text-muted-foreground">
            {terms.legalText}
          </p>
        </details>
      )}
    </div>
  );
}

const sameTerms = (a: CampaignTerms | null, b: CampaignTerms | null) =>
  JSON.stringify(a) === JSON.stringify(b);

function BanksView({
  campaign,
  overview,
}: {
  campaign: ExplorerCampaignDetail;
  overview: ExplorerOverview;
}) {
  if (!campaign.banks.length)
    return (
      <p className="m-0 text-body-sm text-muted-foreground">
        Sin bancos registrados.
      </p>
    );
  const bankName = (slug: string) =>
    overview.banks.find((b) => b.slug === slug)?.name ?? slug;
  const tierLabel = (slug: string, code: string) =>
    overview.tiers[slug]?.find((t) => t.code === code)?.label ?? code;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {campaign.banks.map((bank) => (
        <li
          key={bank.slug}
          className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 first:pt-0"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-body-sm font-semibold text-foreground">
              {bankName(bank.slug)}
              {bank.withdrawnAt && (
                <span className="ml-2 font-normal text-negative">
                  Retirada {formatDateTime(bank.withdrawnAt)}
                </span>
              )}
            </span>
            <span className="text-caption">
              Visto: {formatDateTime(bank.lastSeenAt)}
            </span>
          </div>
          <span className="text-body-sm text-muted-foreground">
            Niveles:{" "}
            {bank.tierCodes.length
              ? bank.tierCodes.map((c) => tierLabel(bank.slug, c)).join(", ")
              : "sin nivel detectado"}
          </span>
          {!sameTerms(bank.terms, campaign.terms) && (
            <div className="rounded-md bg-surface-sunken p-3">
              <p className="m-0 mb-2 text-caption font-semibold text-foreground">
                Condiciones propias de este banco
              </p>
              {bank.terms ? (
                <TermsView terms={bank.terms} />
              ) : (
                <p className="m-0 text-body-sm text-negative">
                  Sin condiciones leídas para este banco.
                </p>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function HideToggle({
  campaign,
  onDone,
}: {
  campaign: ExplorerCampaignDetail;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = !campaign.hidden;
  const toggle = async () => {
    setPending(true);
    setError(null);
    try {
      await hideExplorerCampaign({ data: { id: campaign.id, hidden: next } });
      await router.invalidate();
      toast.success(next ? "Campaña oculta" : "Campaña visible de nuevo");
      onDone();
    } catch (e) {
      setError(mutationErrorText(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={next ? "outline" : "default"}
        className="h-11 self-start rounded-md px-5"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => void toggle()}
      >
        {pending ? "Guardando…" : next ? "Ocultar campaña" : "Mostrar de nuevo"}
      </Button>
      <p className="m-0 text-caption">
        {next
          ? "Ocultarla la saca de la app y del aviso diario. Se puede deshacer."
          : "Está oculta: no aparece en la app ni en el aviso diario."}
      </p>
      {error && (
        <p
          role="alert"
          className="m-0 rounded-md bg-negative-soft px-3.5 py-2.5 text-body-sm text-negative"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function CampaignDetail({
  campaign,
  overview,
}: {
  campaign: ExplorerCampaignDetail;
  overview: ExplorerOverview;
}) {
  const statusRef = useRef<HTMLHeadingElement>(null);
  const status = campaignStatus(campaign);
  const raw = JSON.stringify(campaign.raw, null, 2);

  return (
    <div className="flex flex-col gap-3 pb-12 xl:gap-9">
      <PageHeader
        backTo="/app/admin/benefits"
        breadcrumb={[
          { label: "Beneficios", to: "/app/admin/benefits" },
          { label: "Campaña" },
        ]}
        title={campaign.title}
        subtitle={[
          campaign.brandName ?? "Sin marca",
          campaign.categories.map(categoryLabel).join(", ") || "Sin categoría",
        ].join(" · ")}
      />
      <SplitLayout
        aside={
          <>
            <div className="flex flex-col gap-3">
              <h2
                ref={statusRef}
                tabIndex={-1}
                className="m-0 flex flex-wrap items-center gap-1.5 outline-none"
              >
                <span className="sr-only">Estado:</span>
                <StatusBadge status={status} />
                {campaign.detailStale && (
                  <WarnBadge>Detalle desactualizado</WarnBadge>
                )}
              </h2>
              <p className="m-0 font-serif text-[28px] leading-tight font-semibold tracking-[-0.4px] text-foreground">
                {offersText(campaign.terms)}
              </p>
            </div>
            <section
              aria-labelledby="verify-title"
              className="flex flex-col gap-2 rounded-lg border border-accent-brand/30 bg-accent-brand-soft/40 p-4"
            >
              <h2
                id="verify-title"
                className="m-0 text-overline text-accent-brand"
              >
                Verificación
              </h2>
              <SafeLink href={campaign.verifyUrl} className="text-[15px]">
                Ver en {campaign.source === "galicia" ? "Galicia" : "MODO"}
              </SafeLink>
              {campaign.verifyHint && (
                <p className="m-0 text-heading text-foreground">
                  {campaign.verifyHint}
                </p>
              )}
              <p className="m-0 text-body-sm text-muted-foreground">
                {SOURCE_LABELS[campaign.source]} · ID externo{" "}
                <span className="font-mono text-foreground">
                  {campaign.externalId}
                </span>
              </p>
            </section>
            {campaign.unpublishableReason && (
              <Notice title="No publicable">
                {campaign.unpublishableReason}
              </Notice>
            )}
            <HideToggle
              campaign={campaign}
              onDone={() => statusRef.current?.focus()}
            />
            <dl className="m-0 flex flex-col">
              {[
                ["Visto por última vez", formatDateTime(campaign.lastSeenAt)],
                ["Detalle leído", formatDateTime(campaign.detailFetchedAt)],
                [
                  "Retirada",
                  campaign.withdrawnAt
                    ? formatDateTime(campaign.withdrawnAt)
                    : "No",
                ],
                ["Señal de nivel cruda", campaign.rawTierSignal ?? "Ninguna"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-t border-border py-2.5"
                >
                  <dt className="text-body-sm text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="m-0 text-right text-body-sm font-medium break-all text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        }
      >
        <div className="flex flex-col">
          <Section title="Condiciones">
            {campaign.terms ? (
              <TermsView terms={campaign.terms} />
            ) : (
              <Notice title="No pudimos leer las condiciones">
                Revisá el registro crudo y la fuente.
              </Notice>
            )}
          </Section>
          <Section title={`Por banco (${campaign.banks.length})`}>
            <BanksView campaign={campaign} overview={overview} />
          </Section>
          <Section title="Registro crudo">
            <details>
              <summary className="cursor-pointer text-body-sm font-semibold text-foreground">
                Ver JSON del listado y del detalle
              </summary>
              <pre className="mt-2 max-h-[32rem] overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-xs whitespace-pre-wrap break-all text-foreground">
                {raw}
              </pre>
            </details>
          </Section>
        </div>
      </SplitLayout>
    </div>
  );
}
