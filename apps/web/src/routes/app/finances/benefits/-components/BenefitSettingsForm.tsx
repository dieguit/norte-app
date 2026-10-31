import { useId, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  CARD_NETWORKS,
  CARD_TYPES,
  DIGEST_CATEGORIES,
  UpdateBenefitProfileSchema,
  type BenefitBankList,
  type BenefitBankProfile,
  type BenefitCard,
  type BenefitProfile,
  type DigestCategory,
} from "@repo/shared-types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  saveBenefitProfile,
  setBenefitDigestEnabled,
} from "@/features/benefits/benefits.functions";
import { cn } from "@/lib/utils";
import {
  CARD_TYPE_LABELS,
  categoryLabel,
  NETWORK_LABELS,
} from "./benefit-format";
import { ChipButton } from "./BenefitParts";

type Bank = BenefitBankList["banks"][number];

const COVERAGE = {
  modo: "Solo promos con MODO",
  modo_and_own: "Promos MODO + catálogo propio",
};
const sameCard = (a: BenefitCard, b: BenefitCard) =>
  a.type === b.type && a.network === b.network;
const errorText = (e: unknown) =>
  e instanceof Error && e.message
    ? e.message
    : "No pudimos guardar tu configuración.";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 border-t border-border pt-5"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="m-0 text-title text-foreground">
          {title}
        </h3>
        {hint && (
          <p className="m-0 text-body-sm text-muted-foreground">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function BankConfig({
  bank,
  value,
  onChange,
  onRemove,
}: {
  bank: Bank;
  value: BenefitBankProfile;
  onChange: (v: BenefitBankProfile) => void;
  onRemove: () => void;
}) {
  const toggleCard = (card: BenefitCard) =>
    onChange({
      ...value,
      cards: value.cards.some((c) => sameCard(c, card))
        ? value.cards.filter((c) => !sameCard(c, card))
        : [...value.cards, card],
    });
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-heading text-foreground">{bank.name}</span>
          <span className="text-caption">{COVERAGE[bank.coverage]}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${bank.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {bank.tiers.length > 0 && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-body-sm font-semibold text-foreground">
            Tu nivel en {bank.name}
          </legend>
          <p className="m-0 text-caption">
            El nivel cambia algunos descuentos. Usá el nombre que te da el
            banco.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ...bank.tiers.map((t) => ({
                value: t.code as string | null,
                label: t.label,
              })),
              { value: null, label: "No sé" },
            ].map((t) => (
              <label
                key={t.label}
                className={cn(
                  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-body-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
                  value.tier === t.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name={`tier-${bank.slug}`}
                  className="sr-only"
                  checked={value.tier === t.value}
                  onChange={() => onChange({ ...value, tier: t.value })}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <CardMatrix bank={bank} cards={value.cards} onToggle={toggleCard} />
    </li>
  );
}

function CardMatrix({
  bank,
  cards,
  onToggle,
}: {
  bank: Bank;
  cards: BenefitCard[];
  onToggle: (card: BenefitCard) => void;
}) {
  return (
    <table className="w-full max-w-sm border-collapse text-left">
      <caption className="mb-1 text-left text-body-sm font-semibold text-foreground">
        Tus tarjetas de {bank.name}
      </caption>
      <thead>
        <tr>
          <td />
          {CARD_TYPES.map((type) => (
            <th
              key={type}
              scope="col"
              className="pb-1 text-center text-caption font-medium capitalize"
            >
              {CARD_TYPE_LABELS[type]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CARD_NETWORKS.map((network) => (
          <tr key={network} className="border-t border-border">
            <th
              scope="row"
              className="py-0.5 pr-2 text-body-sm font-normal text-foreground"
            >
              {NETWORK_LABELS[network]}
            </th>
            {CARD_TYPES.map((type) => (
              <td key={type} className="text-center">
                <label className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-muted">
                  <input
                    type="checkbox"
                    aria-label={`${NETWORK_LABELS[network]} ${CARD_TYPE_LABELS[type]}`}
                    checked={cards.some((c) => sameCard(c, { type, network }))}
                    onChange={() => onToggle({ type, network })}
                    className="size-5 accent-[var(--foreground)]"
                  />
                </label>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BankPicker({
  banks,
  selected,
  onAdd,
}: {
  banks: Bank[];
  selected: string[];
  onAdd: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const norm = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const options = banks
    .filter((b) => !selected.includes(b.slug) && norm(b.name).includes(norm(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="bank-search"
        className="text-body-sm font-semibold text-foreground"
      >
        Agregar banco
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden="true"
        />
        <input
          id="bank-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscá tu banco"
          aria-controls="bank-options"
          className="h-11 w-full rounded-md border border-input bg-background pr-3.5 pl-10 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <ul
        id="bank-options"
        aria-label="Bancos disponibles"
        className="m-0 flex max-h-80 list-none flex-col overflow-y-auto rounded-md border border-border p-0"
      >
        {options.length === 0 && (
          <li className="px-4 py-3 text-body-sm text-muted-foreground">
            {q.trim()
              ? "No encontramos bancos con ese nombre."
              : "Ya agregaste todos los bancos."}
          </li>
        )}
        {options.map((b) => (
          <li key={b.slug} className="border-t border-border first:border-t-0">
            <button
              type="button"
              onClick={() => onAdd(b.slug)}
              className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <span className="flex flex-col">
                <span className="text-body-sm font-semibold text-foreground">
                  {b.name}
                </span>
                <span className="text-caption">{COVERAGE[b.coverage]}</span>
              </span>
              <span
                className="text-body-sm font-semibold text-accent-brand"
                aria-hidden="true"
              >
                Agregar
              </span>
              <span className="sr-only">Agregar</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DigestSwitch({
  enabled,
  setEnabled,
}: {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const change = async (next: boolean) => {
    setEnabled(next);
    setPending(true);
    try {
      await setBenefitDigestEnabled({ data: { enabled: next } });
      toast.success(next ? "Aviso diario activado" : "Aviso diario pausado");
    } catch (e) {
      setEnabled(!next);
      toast.error(errorText(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <label className="flex min-h-11 items-center gap-3 text-body-sm font-semibold text-foreground">
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={(v) => void change(v)}
      />
      Recibir el aviso diario por WhatsApp
    </label>
  );
}

function validateProfile(
  banks: BenefitBankProfile[],
  usesModo: boolean | null,
  categories: DigestCategory[],
) {
  const problems = [
    ...(banks.length ? [] : ["Elegí al menos un banco."]),
    ...(usesModo === null ? ["Contanos si pagás con MODO."] : []),
  ];
  const parsed = UpdateBenefitProfileSchema.safeParse({
    banks,
    usesModo: usesModo ?? false,
    categories,
  });
  if (!parsed.success)
    problems.push(...new Set(parsed.error.issues.map((i) => i.message)));
  return problems.length || !parsed.success
    ? { problems }
    : { problems, data: parsed.data };
}

const toggled = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

function ErrorSummary({
  errors,
  ref,
}: {
  errors: string[];
  ref: React.Ref<HTMLDivElement>;
}) {
  if (!errors.length) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="flex flex-col gap-1 rounded-md bg-negative-soft px-4 py-3 outline-none"
    >
      <p className="m-0 text-body-sm font-semibold text-negative">
        Revisá lo siguiente:
      </p>
      <ul className="m-0 pl-5 text-body-sm text-foreground">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function BanksSection({
  banks,
  selected,
  setSelected,
}: {
  banks: Bank[];
  selected: BenefitBankProfile[];
  setSelected: React.Dispatch<React.SetStateAction<BenefitBankProfile[]>>;
}) {
  const bankBySlug = new Map(banks.map((b) => [b.slug, b]));
  const configs = selected.flatMap((value) => {
    const bank = bankBySlug.get(value.slug);
    return bank ? [{ bank, value }] : [];
  });
  return (
    <Section
      title="Bancos"
      hint="De la mayoría de los bancos solo vemos sus promos con MODO. De Galicia y Macro también leemos su catálogo propio."
    >
      {configs.length > 0 && (
        <ul
          aria-label="Tus bancos"
          className="m-0 flex list-none flex-col gap-3 p-0"
        >
          {configs.map(({ bank, value }) => (
            <BankConfig
              key={value.slug}
              bank={bank}
              value={value}
              onChange={(next) =>
                setSelected((list) =>
                  list.map((b) => (b.slug === next.slug ? next : b)),
                )
              }
              onRemove={() => {
                setSelected((list) =>
                  list.filter((b) => b.slug !== value.slug),
                );
                requestAnimationFrame(() =>
                  document.getElementById("bank-search")?.focus(),
                );
              }}
            />
          ))}
        </ul>
      )}
      <BankPicker
        banks={banks}
        selected={selected.map((b) => b.slug)}
        onAdd={(slug) =>
          setSelected((list) => [...list, { slug, tier: null, cards: [] }])
        }
      />
    </Section>
  );
}

function ModoQuestion({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <Section
      title="¿Pagás con MODO?"
      hint="Muchas promos piden pagar con MODO desde la app del banco."
    >
      <fieldset className="m-0 flex gap-2 border-0 p-0">
        <legend className="sr-only">¿Pagás con MODO?</legend>
        {[
          { value: true, label: "Sí" },
          { value: false, label: "No" },
        ].map((o) => (
          <label
            key={o.label}
            className={cn(
              "inline-flex h-11 min-w-20 cursor-pointer items-center justify-center rounded-full border px-5 text-body-sm font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
              value === o.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name="uses-modo"
              className="sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </fieldset>
    </Section>
  );
}

function CategoryPicker({
  value,
  onToggle,
}: {
  value: DigestCategory[];
  onToggle: (c: DigestCategory) => void;
}) {
  return (
    <Section
      title="Categorías del aviso diario"
      hint="Elegí al menos una. Cada mañana te mandamos hasta 3 beneficios por categoría."
    >
      <div
        role="group"
        aria-label="Categorías del aviso diario"
        className="flex flex-wrap gap-2"
      >
        {DIGEST_CATEGORIES.map((c) => (
          <ChipButton
            key={c}
            pressed={value.includes(c)}
            onClick={() => onToggle(c)}
          >
            {categoryLabel(c)}
          </ChipButton>
        ))}
      </div>
    </Section>
  );
}

export function BenefitSettingsForm({
  banks,
  profile,
}: {
  banks: BenefitBankList["banks"];
  profile: BenefitProfile;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const configured = profile.banks.length > 0;
  const [digestEnabled, setDigestEnabled] = useState(profile.enabled);
  const [selected, setSelected] = useState<BenefitBankProfile[]>(profile.banks);
  const [usesModo, setUsesModo] = useState<boolean | null>(
    configured ? profile.usesModo : null,
  );
  const [categories, setCategories] = useState<DigestCategory[]>(
    profile.categories,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const errorsRef = useRef<HTMLDivElement>(null);

  const showErrors = (list: string[]) => {
    setErrors(list);
    requestAnimationFrame(() => errorsRef.current?.focus());
  };

  const save = async () => {
    const { problems, data } = validateProfile(selected, usesModo, categories);
    if (!data) return showErrors(problems);
    setErrors([]);
    setSaving(true);
    try {
      await saveBenefitProfile({ data });
      toast.success("Listo, guardamos tus bancos");
      await router.invalidate();
      await navigate({ to: "/app/finances/benefits" });
    } catch (e) {
      showErrors([errorText(e)]);
    } finally {
      setSaving(false);
    }
  };

  // Saving always turns the digest on, so say it whenever it's off.
  const submitLabel =
    configured && digestEnabled ? "Guardar cambios" : "Guardar y activar aviso";

  return (
    <form
      noValidate
      aria-labelledby="settings-title"
      className="flex flex-col gap-6 xl:max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Link
        to="/app/finances/benefits"
        className="inline-flex h-11 items-center gap-1.5 self-start text-body-sm font-semibold text-accent-brand no-underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a beneficios
      </Link>
      <div className="flex flex-col gap-1">
        <h2 id="settings-title" className="m-0 text-display text-foreground">
          Tus bancos y beneficios
        </h2>
        <p className="m-0 text-body-sm text-muted-foreground">
          Con esto elegimos qué descuentos mostrarte y qué mandarte cada mañana.
        </p>
      </div>
      <ErrorSummary errors={errors} ref={errorsRef} />
      <BanksSection
        banks={banks}
        selected={selected}
        setSelected={setSelected}
      />
      <ModoQuestion value={usesModo} onChange={setUsesModo} />
      <CategoryPicker
        value={categories}
        onToggle={(c) => setCategories((list) => toggled(list, c))}
      />
      <Section
        title="Aviso diario"
        hint={
          configured ? undefined : "Se activa cuando guardás tu configuración."
        }
      >
        {configured ? (
          <DigestSwitch enabled={digestEnabled} setEnabled={setDigestEnabled} />
        ) : (
          <p className="m-0 text-body-sm text-muted-foreground">
            Todavía no configuraste tus bancos.
          </p>
        )}
      </Section>
      <div className="sticky bottom-0 z-20 -mx-5 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-[2px] xl:static xl:mx-0 xl:border-0 xl:bg-transparent xl:p-0">
        <Button
          type="submit"
          className="h-11 w-full rounded-md px-6 text-[15px] xl:w-auto"
          disabled={saving}
        >
          {saving ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
