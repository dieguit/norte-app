import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  CATALOG_CATEGORIES,
  type CatalogCategory,
  type ExplorerMappingList,
} from "@repo/shared-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveExplorerMapping } from "@/features/benefits-admin/benefits-explorer.functions";
import { categoryLabel } from "./explorer-format";
import { FilterSelect, mutationErrorText } from "./ExplorerParts";

type Mapping = ExplorerMappingList["items"][number];
type RowState = { kind: "saved" | "error"; text: string };

const CATEGORY_ITEMS = CATALOG_CATEGORIES.map((value) => ({
  value,
  label:
    value === "otros" ? "Otros (no entra en el aviso)" : categoryLabel(value),
}));
const sourceOf = (key: string) =>
  key.startsWith("galicia:") ? "Galicia" : "MODO";
const mappingId = (key: string) => `mapping-${key.replace(/[^a-z0-9]/gi, "-")}`;
const campaigns = (n: number) =>
  `${n.toLocaleString("es-AR")} ${n === 1 ? "campaña" : "campañas"}`;

function MappingInfo({ mapping }: { mapping: Mapping }) {
  const updatedBy = mapping.updatedBy
    ? ` · cambiado por ${mapping.updatedBy}`
    : "";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-body-sm break-all text-foreground">
        {mapping.sourceKey}
      </span>
      <span className="text-caption">
        {sourceOf(mapping.sourceKey)} · {campaigns(mapping.affectedCampaigns)}
        {updatedBy}
      </span>
      {mapping.category ? (
        <span className="text-body-sm text-muted-foreground">
          Ahora: {categoryLabel(mapping.category)}
        </span>
      ) : (
        <span className="text-body-sm font-semibold text-negative">
          Sin mapear: cuenta como Otros
        </span>
      )}
    </div>
  );
}

function RowMessage({ state }: { state: RowState }) {
  const error = state.kind === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "m-0 text-body-sm sm:col-span-3",
        error ? "text-negative" : "text-positive",
      )}
    >
      {state.text}
    </p>
  );
}

function MappingRow({
  mapping,
  busy,
  saving,
  onSave,
  state,
}: {
  mapping: Mapping;
  busy: boolean;
  saving: boolean;
  onSave: (category: CatalogCategory) => void;
  state?: RowState;
}) {
  const [choice, setChoice] = useState<CatalogCategory | null>(
    mapping.category,
  );
  const unchanged = !choice || choice === mapping.category;
  return (
    <li className="flex flex-col gap-3 border-t border-border py-4 last:border-b sm:grid sm:grid-cols-[1fr_16rem_auto] sm:items-end sm:gap-5">
      <MappingInfo mapping={mapping} />
      <FilterSelect
        id={mappingId(mapping.sourceKey)}
        label={`Categoría para ${mapping.sourceKey}`}
        value={choice}
        placeholder="Elegí una categoría"
        items={CATEGORY_ITEMS}
        onChange={(v) => setChoice(v as CatalogCategory)}
      />
      <Button
        type="button"
        className="h-11 rounded-md px-5"
        disabled={busy || unchanged}
        onClick={() => choice && onSave(choice)}
      >
        {saving ? "Guardando…" : "Guardar"}
      </Button>
      {state && <RowMessage state={state} />}
    </li>
  );
}

export function MappingsPage({ list }: { list: ExplorerMappingList }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, RowState>>({});
  const unmapped = list.items
    .filter((m) => !m.category)
    .sort((a, b) => b.affectedCampaigns - a.affectedCampaigns);
  const mapped = list.items
    .filter((m) => m.category)
    .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));

  const save = async (mapping: Mapping, category: CatalogCategory) => {
    setSaving(mapping.sourceKey);
    try {
      await saveExplorerMapping({
        data: { sourceKey: mapping.sourceKey, category },
      });
      await router.invalidate();
      setStates((s) => ({
        ...s,
        [mapping.sourceKey]: {
          kind: "saved",
          text: `Guardado: ${categoryLabel(category)}. Se actualizaron sus campañas.`,
        },
      }));
    } catch (e) {
      setStates((s) => ({
        ...s,
        [mapping.sourceKey]: {
          kind: "error",
          text: mutationErrorText(e, "No pudimos guardar el mapeo."),
        },
      }));
    } finally {
      setSaving(null);
      requestAnimationFrame(() =>
        document.getElementById(mappingId(mapping.sourceKey))?.focus(),
      );
    }
  };

  const group = (title: string, items: Mapping[], empty: string) => (
    <section aria-labelledby={`${title}-title`} className="flex flex-col gap-3">
      <h2 id={`${title}-title`} className="m-0 text-title text-foreground">
        {title}{" "}
        <span className="text-body-sm font-normal text-muted-foreground tabular-nums">
          ({items.length})
        </span>
      </h2>
      {items.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((m) => (
            <MappingRow
              key={`${m.sourceKey}:${m.category}`}
              mapping={m}
              busy={saving !== null}
              saving={saving === m.sourceKey}
              state={states[m.sourceKey]}
              onSave={(c) => void save(m, c)}
            />
          ))}
        </ul>
      ) : (
        <p className="m-0 border-t border-border py-6 text-body-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );

  return (
    <div
      className="flex flex-col gap-8"
      aria-busy={saving !== null || undefined}
    >
      <p className="m-0 max-w-2xl text-body-sm text-muted-foreground">
        Cada categoría de origen se asigna a una de las categorías fijas. Al
        guardar se recalculan las campañas que la usan. Lo que queda sin mapear
        cuenta como Otros y no entra en el aviso diario.
      </p>
      {group("Sin mapear", unmapped, "No quedan categorías sin mapear.")}
      {group("Mapeadas", mapped, "Todavía no hay categorías mapeadas.")}
    </div>
  );
}
