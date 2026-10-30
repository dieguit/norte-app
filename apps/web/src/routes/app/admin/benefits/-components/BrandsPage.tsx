import { useEffect, useId, useRef, useState } from "react";
import { useRouter, type LinkProps } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ExplorerBrandList } from "@repo/shared-types";
import { Button } from "@/components/ui/button";
import {
  getExplorerBrands,
  mergeExplorerBrands,
  saveExplorerAliases,
} from "@/features/benefits-admin/benefits-explorer.functions";
import { mutationErrorText, Pagination, SearchForm } from "./ExplorerParts";

type Brand = ExplorerBrandList["items"][number];
const campaigns = (n: number) =>
  `${n.toLocaleString("es-AR")} ${n === 1 ? "campaña" : "campañas"}`;

function AliasEditor({
  brand,
  busy,
  setBusy,
  onClose,
}: {
  brand: Brand;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState(brand.aliases.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const aliases = [
    ...new Set(
      text
        .split("\n")
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
  const invalid = aliases.length > 50 || aliases.some((a) => a.length > 120);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveExplorerAliases({ data: { id: brand.id, aliases } });
      await router.invalidate();
      toast.success(`Alias de ${brand.name} guardados`);
      onClose();
    } catch (e) {
      setError(mutationErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4">
      <label
        htmlFor={id}
        className="text-body-sm font-semibold text-foreground"
      >
        Alias de {brand.name}, uno por línea
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={4}
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-help`}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-y rounded-md border border-input bg-background px-3.5 py-2.5 text-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      <p
        id={`${id}-help`}
        className={
          invalid ? "m-0 text-body-sm text-negative" : "m-0 text-caption"
        }
      >
        Hasta 50 alias de 120 caracteres. Sirven para encontrar la marca al
        buscar.
      </p>
      {error && (
        <p role="alert" className="m-0 text-body-sm text-negative">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          className="h-11 rounded-md px-5"
          disabled={busy || invalid}
          onClick={() => void save()}
        >
          {busy ? "Guardando…" : "Guardar alias"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-md"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function MergePanel({
  from,
  busy,
  setBusy,
  onClose,
}: {
  from: Brand;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [results, setResults] = useState<Brand[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [into, setInto] = useState<Brand | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const search = async (q: string) => {
    setSearching(true);
    setError(null);
    setInto(null);
    try {
      const res = await getExplorerBrands({
        data: { q: q || undefined, page: 1, pageSize: 10 },
      });
      if (res.access === "denied")
        return setError("No tenés acceso para buscar marcas.");
      setResults(res.data.items.filter((b) => b.id !== from.id));
    } catch (e) {
      setError(mutationErrorText(e));
    } finally {
      setSearching(false);
    }
  };

  const merge = async () => {
    if (!into) return;
    setBusy(true);
    setError(null);
    try {
      await mergeExplorerBrands({ data: { fromId: from.id, intoId: into.id } });
      await router.invalidate();
      toast.success(`${from.name} se unió a ${into.name}`);
      onClose();
    } catch (e) {
      setError(mutationErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="merge-title"
      className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 xl:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="merge-title"
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-title text-foreground outline-none"
        >
          Unir {from.name} con otra marca
        </h2>
        <p className="m-0 text-body-sm text-muted-foreground">
          Origen: <strong className="text-foreground">{from.name}</strong> ·{" "}
          {campaigns(from.campaignCount)}. Elegí la marca destino.
        </p>
      </div>
      <SearchForm
        id="merge-q"
        label="Buscar marca destino"
        placeholder="Nombre o alias"
        defaultValue=""
        onSearch={(q) => void search(q)}
      />
      {searching && (
        <p role="status" className="m-0 text-body-sm text-muted-foreground">
          Buscando…
        </p>
      )}
      {results && !searching && (
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-1 text-caption font-medium">
            Marca destino
          </legend>
          {results.length === 0 && (
            <p className="m-0 text-body-sm text-muted-foreground">
              No encontramos otras marcas con esa búsqueda.
            </p>
          )}
          {results.map((b) => (
            <label
              key={b.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted"
            >
              <input
                type="radio"
                name="merge-into"
                checked={into?.id === b.id}
                onChange={() => setInto(b)}
                className="size-4 accent-[var(--foreground)]"
              />
              <span className="text-body-sm text-foreground">
                {b.name}{" "}
                <span className="text-caption">
                  · {campaigns(b.campaignCount)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {into && (
        <div className="flex flex-col gap-3 rounded-md bg-negative-soft p-4">
          <p className="m-0 text-body-sm text-foreground">
            Vas a mover {campaigns(from.campaignCount)} de{" "}
            <strong>{from.name}</strong> a <strong>{into.name}</strong>.{" "}
            {from.name} deja de existir como marca separada. No se puede
            deshacer desde acá.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="h-11 self-start rounded-md px-5"
            disabled={busy}
            onClick={() => void merge()}
          >
            {busy ? "Uniendo…" : `Unir ${from.name} en ${into.name}`}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-body-sm text-negative">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        className="h-11 self-start rounded-md"
        disabled={busy}
        onClick={onClose}
      >
        Cancelar
      </Button>
    </section>
  );
}

export function BrandsPage({
  list,
  q,
  onSearch,
  linkForPage,
}: {
  list: ExplorerBrandList;
  q: string;
  onSearch: (q: string) => void;
  linkForPage: (page: number) => LinkProps;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [merging, setMerging] = useState<Brand | null>(null);
  const [busy, setBusy] = useState(false);
  const returnFocus = (id: string) =>
    requestAnimationFrame(() =>
      (
        document.getElementById(`brand-${id}`) ??
        document.getElementById("brand-q")
      )?.focus(),
    );

  return (
    <section aria-label="Marcas" className="flex flex-col gap-5">
      <SearchForm
        key={q}
        id="brand-q"
        label="Buscar marca por nombre o alias"
        placeholder="Ej.: Coto"
        defaultValue={q}
        onSearch={onSearch}
      />
      {merging && (
        <MergePanel
          from={merging}
          busy={busy}
          setBusy={setBusy}
          onClose={() => {
            setMerging(null);
            returnFocus(merging.id);
          }}
        />
      )}
      <Pagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        noun={["marca", "marcas"]}
        linkFor={linkForPage}
      />
      {list.items.length === 0 ? (
        <p className="m-0 border-t border-border py-10 text-center text-body-sm text-muted-foreground">
          No hay marcas con esa búsqueda.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {list.items.map((brand) => (
            <li
              key={brand.id}
              className="flex flex-col gap-3 border-t border-border py-4 last:border-b"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3
                    id={`brand-${brand.id}`}
                    tabIndex={-1}
                    className="m-0 text-heading text-foreground outline-none"
                  >
                    {brand.name}
                  </h3>
                  <span className="text-body-sm text-muted-foreground tabular-nums">
                    {campaigns(brand.campaignCount)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {brand.aliases.length ? (
                      brand.aliases.map((a) => (
                        <span
                          key={a}
                          className="rounded-sm bg-muted px-2 py-0.5 text-caption text-foreground"
                        >
                          {a}
                        </span>
                      ))
                    ) : (
                      <span className="text-caption">Sin alias</span>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-md"
                    disabled={busy}
                    aria-expanded={editing === brand.id}
                    aria-label={`Editar alias de ${brand.name}`}
                    onClick={() => setEditing(brand.id)}
                  >
                    Editar alias
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-md"
                    disabled={busy}
                    aria-label={`Unir ${brand.name} con otra marca`}
                    onClick={() => setMerging(brand)}
                  >
                    Unir…
                  </Button>
                </div>
              </div>
              {editing === brand.id && (
                <AliasEditor
                  brand={brand}
                  busy={busy}
                  setBusy={setBusy}
                  onClose={() => {
                    setEditing(null);
                    returnFocus(brand.id);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {list.total > list.pageSize && (
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          noun={["marca", "marcas"]}
          linkFor={linkForPage}
          bottom
        />
      )}
    </section>
  );
}
