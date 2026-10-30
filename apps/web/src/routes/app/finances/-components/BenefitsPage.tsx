import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import type {
  BenefitCatalogResponse,
  BenefitPreferences,
} from "@repo/shared-types";
import { Button } from "../../../../components/ui/button";
import { Switch } from "../../../../components/ui/switch";
import {
  saveBenefitPreferences,
  setBenefitDigestEnabled,
} from "../../../../features/benefits/benefits.functions";

const toggled = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function BenefitsPage({
  catalog,
  preferences,
}: {
  catalog: BenefitCatalogResponse;
  preferences: BenefitPreferences;
}) {
  const router = useRouter();
  const [instruments, setInstruments] = useState(preferences.instrumentSlugs);
  const [categories, setCategories] = useState<string[]>(
    preferences.categories,
  );
  const [enabled, setEnabled] = useState(preferences.enabled);
  const [pending, setPending] = useState(false);
  const configured = preferences.instrumentSlugs.length > 0;
  const groups = [
    { title: "Tus tarjetas y cuentas", kinds: ["bank", "network"] },
    { title: "Tus membresías y billeteras", kinds: ["wallet", "membership"] },
  ].map((g) => ({
    ...g,
    providers: catalog.providers.filter((p) => g.kinds.includes(p.kind)),
  }));

  const save = async () => {
    setPending(true);
    try {
      await saveBenefitPreferences({
        data: {
          instrumentSlugs: instruments,
          categories: categories as BenefitPreferences["categories"],
        },
      });
      setEnabled(true);
      toast.success(
        "Listo, desde mañana te llegan tus beneficios por WhatsApp",
      );
      await router.invalidate();
    } catch (error) {
      toast.error(errorText(error, "No pudimos guardar tus beneficios."));
    } finally {
      setPending(false);
    }
  };

  const changeEnabled = async (next: boolean) => {
    setEnabled(next);
    setPending(true);
    try {
      await setBenefitDigestEnabled({ data: { enabled: next } });
    } catch (error) {
      setEnabled(!next);
      toast.error(errorText(error, "No pudimos cambiar los avisos."));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
        Elegí tus tarjetas y qué te interesa. Cada mañana te mandamos por
        WhatsApp los descuentos que podés usar ese día.
      </p>
      {configured && (
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch
            aria-label="Avisos diarios"
            checked={enabled}
            disabled={pending}
            onCheckedChange={(next) => void changeEnabled(next)}
          />
          Avisos diarios
        </label>
      )}
      {groups
        .filter((g) => g.providers.length)
        .map((group) => (
          <fieldset
            key={group.title}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5"
          >
            <legend className="px-1 font-serif text-lg font-bold text-[var(--sea-ink)]">
              {group.title}
            </legend>
            {group.providers.map((provider) => (
              <div key={provider.slug} className="flex flex-col gap-2">
                <p className="text-sm font-semibold">{provider.name}</p>
                {provider.instruments.map((instrument) => (
                  <label
                    key={instrument.slug}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={instruments.includes(instrument.slug)}
                      onChange={() =>
                        setInstruments((list) => toggled(list, instrument.slug))
                      }
                    />
                    {instrument.label}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
        ))}
      <fieldset className="flex flex-col gap-3">
        <legend className="font-serif text-lg font-bold text-[var(--sea-ink)]">
          ¿Qué te interesa?
        </legend>
        <div className="flex flex-wrap gap-2">
          {catalog.categories.map((category) => {
            const selected = categories.includes(category.slug);
            return (
              <Button
                key={category.slug}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() =>
                  setCategories((list) => toggled(list, category.slug))
                }
              >
                {category.label}
              </Button>
            );
          })}
        </div>
      </fieldset>
      <Button
        type="button"
        className="self-start"
        disabled={pending || !instruments.length || !categories.length}
        onClick={() => void save()}
      >
        Guardar y activar
      </Button>
    </div>
  );
}
