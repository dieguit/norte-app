import { createFileRoute } from "@tanstack/react-router";
import { useForm, useStore } from "@tanstack/react-form";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePostHog } from "@posthog/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  validateStep,
  getFirstIncompleteStep,
  getActiveSteps,
  getVisibleFields,
  getInactiveAnswerIds,
  filterAnswersForActiveSteps,
  type OnboardingAnswers,
} from "../onboarding/definition";
import { loadDraft, saveDraft as saveLocalDraft } from "../onboarding/draft";
import { getInvitedDeviceId } from "../onboarding/invitation";
import {
  getOnboardingDraft,
  saveOnboardingDraft,
  createOnboardingUpload,
  deleteOnboardingUpload,
} from "../onboarding/server";
import OnboardingUpload, { putFile } from "../components/onboarding-upload";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

function formatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? numberFormatter.format(value)
    : String(value ?? "");
}

function parseNumber(value: string) {
  const digits = value.replace(/[.,\s]/g, "");
  return digits === "" ? "" : Number(digits);
}

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding | Norte" }] }),
  component: OnboardingPage,
});

function getRestoredStepIndex(answers: OnboardingAnswers) {
  const firstIncomplete = getFirstIncompleteStep(answers);
  if (firstIncomplete >= 0) return firstIncomplete;
  return Math.max(getActiveSteps(answers).length - 1, 0);
}

export function OnboardingPage() {
  const posthog = usePostHog();
  const [mounted, setMounted] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Initialize form with TanStack React Form
  const form = useForm({
    defaultValues: {} as OnboardingAnswers,
  });
  const formAnswers = useStore(form.store, (state) => state.values);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) return;
    for (const fieldId of getInactiveAnswerIds(formAnswers)) {
      form.setFieldValue(fieldId as any, undefined as any);
    }
  }, [form, formAnswers]);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("onboarding-welcome-force") === "true"
    ) {
      return true;
    }
    if (typeof window !== "undefined") {
      return localStorage.getItem("onboarding-welcome-seen") !== "true";
    }
    return true;
  });

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load draft data on mount
  useEffect(() => {
    if (!mounted) return;

    // 1. Get or generate device ID
    const invitedDeviceId = getInvitedDeviceId(new URLSearchParams(window.location.search).get("invitado"));
    let id = invitedDeviceId ?? localStorage.getItem("onboarding-device-id");

    if (invitedDeviceId) localStorage.setItem("onboarding-device-id", invitedDeviceId);

    if (!id) {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        id = crypto.randomUUID();
      } else {
        id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
      localStorage.setItem("onboarding-device-id", id);
    }
    setDeviceId(id);
    posthog?.identify(id);

    // 2. Read local storage draft
    const local = loadDraft(id);
    const initialAnswers = local
      ? filterAnswersForActiveSteps(local.answers)
      : {};
    if (local) {
      Object.entries(initialAnswers).forEach(([key, val]) => {
        form.setFieldValue(key as any, val as any);
      });
      setStepIndex(getRestoredStepIndex(initialAnswers));
      setCompleted(local.completed);
    }
    hydrated.current = true;

    // 3. Call getOnboardingDraft and compare timestamps
    getOnboardingDraft({ data: { deviceId: id } })
      .then((serverDraft) => {
        if (serverDraft) {
          const localTime = local ? new Date(local.updatedAt).getTime() : 0;
          const serverTime = serverDraft.updatedAt
            ? new Date(serverDraft.updatedAt).getTime()
            : 0;

          const currentAnswers = filterAnswersForActiveSteps(form.state.values);
          const hasLocalEdit =
            JSON.stringify(currentAnswers) !== JSON.stringify(initialAnswers);

          if (!hasLocalEdit && (!local || serverTime > localTime)) {
            // Update form values
            const answers = filterAnswersForActiveSteps(serverDraft.answers);
            Object.entries(answers).forEach(([key, val]) => {
              form.setFieldValue(key as any, val as any);
            });

            const resolvedStep = getRestoredStepIndex(answers);
            const isCompleted = !!serverDraft.completedAt;

            setStepIndex(resolvedStep >= 0 ? resolvedStep : 0);
            setCompleted(isCompleted);

            // Sync back to local storage
            saveLocalDraft({
              deviceId: id,
              answers,
              stepIndex: resolvedStep >= 0 ? resolvedStep : 0,
              completed: isCompleted,
              updatedAt: new Date(serverDraft.updatedAt).toISOString(),
            });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to retrieve onboarding draft from server:", err);
      });
  }, [mounted]);

  // Derive active steps
  const activeSteps = getActiveSteps(formAnswers);
  const safeStepIndex = Math.max(
    0,
    Math.min(stepIndex, activeSteps.length - 1),
  );
  const currentStep = activeSteps[safeStepIndex];
  const stepEventProperties = useMemo(() => {
    return currentStep
      ? {
          step_id: currentStep.id,
          step_number: safeStepIndex + 1,
          total_steps: activeSteps.length,
          step_label: `Paso ${safeStepIndex + 1} de ${activeSteps.length}: ${currentStep.title}`,
        }
      : null;
  }, [currentStep, safeStepIndex, activeSteps.length]);

  const viewedStepId = useRef<string | null>(null);

  useEffect(() => {
    if (
      showWelcome ||
      completed ||
      !deviceId ||
      !posthog ||
      !stepEventProperties
    )
      return;
    if (viewedStepId.current === stepEventProperties.step_id) return;

    posthog.capture("onboarding_step_viewed", stepEventProperties);
    viewedStepId.current = stepEventProperties.step_id;
  }, [deviceId, posthog, stepEventProperties, showWelcome, completed]);

  const displayName =
    typeof formAnswers.nombre === "string" ? formAnswers.nombre.trim() : "";
  const stepTitle = displayName && currentStep.titleWithName
    ? currentStep.titleWithName.replaceAll('{name}', displayName)
    : currentStep.title
  const stepIntro = displayName && currentStep.introWithName
    ? currentStep.introWithName.replaceAll('{name}', displayName)
    : currentStep.intro

  const progressPercent =
    activeSteps.length > 0
      ? Math.round(((safeStepIndex + 1) / activeSteps.length) * 100)
      : 0;

  if (!mounted) {
    return (
      <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
        <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] animate-pulse h-96">
          <div className="h-6 bg-[var(--line)] rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-[var(--line)] rounded w-3/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-[var(--line)] rounded"></div>
            <div className="h-12 bg-[var(--line)] rounded"></div>
          </div>
        </section>
      </main>
    );
  }

  // Welcome Screen
  if (showWelcome) {
    return (
      <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
        <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] space-y-8 text-center items-center justify-center">
          <div className="bg-[var(--foam)] border border-[var(--chip-line)] rounded-full p-4 mb-6 text-[var(--palm)]">
            <Sparkles className="size-16 animate-pulse" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--sea-ink)] mb-4">
            ¡Te damos la bienvenida a Norte!
          </h1>
          <p className="text-base text-[var(--sea-ink-soft)] leading-relaxed mb-8 max-w-xl">
            Hola 👋 Esto toma unos 10 minutos y no necesitás buscar ningún
            papel: todos los números pueden ser aproximados y son{" "}
            <strong>por mes</strong>.
            <br />
            Hoy pensemos en tu próximo año, después habrá tiempo para más.
            <br />
            Cuando termines, vamos a procesar la info y en las próximas 24hs vas
            a recibir algo que ningún banco te dio nunca: la foto completa de tu
            situación financiera y el camino más corto hacia tu primer objetivo.
            <br />
            Acá nadie te juzga, venimos a mirar para adelante, no para atrás.
          </p>
          <Button
            type="button"
            onClick={() => {
              localStorage.setItem("onboarding-welcome-seen", "true");
              setShowWelcome(false);
              posthog?.capture("onboarding_welcome_continued");
            }}
            className="h-auto rounded-xl bg-[var(--lagoon-deep)] px-8 py-3 text-base font-bold text-[var(--on-primary)] hover:bg-[var(--sea-ink)] flex items-center gap-2 shadow-md shadow-[var(--lagoon)/10] transition-all active:scale-[0.98]"
          >
            Continuar
            <ArrowRight className="size-5" />
          </Button>
        </section>
      </main>
    );
  }

  // Render completion screen
  if (completed) {
    return (
      <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
        <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] text-center items-center justify-center">
          <div className="bg-[var(--foam)] border border-[var(--chip-line)] rounded-full p-4 mb-6 text-[var(--palm)] animate-[bounce_1.5s_infinite]">
            <CheckCircle2 className="size-16" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--sea-ink)] mb-4">
            ¡Cuestionario completado!
          </h1>
          <p className="text-base text-[var(--sea-ink-soft)] leading-relaxed mb-8 max-w-md">
            {displayName
              ? `Gracias, ${displayName}. Tu perfil está listo, lo vamos a procesar y en las próximas 24hs te vamos a enviar tu informe personalizado.`
              : "Gracias por compartir tu panorama financiero. Tu perfil está listo, lo vamos a procesar y en las próximas 24hs te vamos a enviar tu informe personalizado."}
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
            <Lock className="size-4" />
            <span>Tus datos financieros están encriptados y seguros</span>
          </div>
        </section>
      </main>
    );
  }

  // Back action: without saving
  const handleBack = () => {
    if (safeStepIndex > 0) {
      setSaveError(null);
      setValidationErrors({});
      const prevStepIndex = safeStepIndex - 1;
      setStepIndex(prevStepIndex);
      posthog?.capture("onboarding_step_back", stepEventProperties!);

      const local = loadDraft(deviceId);
      if (local) {
        saveLocalDraft({
          ...local,
          stepIndex: prevStepIndex,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  // Next action
  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setValidationErrors({});

    const currentAnswers = filterAnswersForActiveSteps(form.state.values);
    const errors = validateStep(currentStep, currentAnswers);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      posthog?.capture("onboarding_validation_failed", {
        ...stepEventProperties!,
        error_count: Object.keys(errors).length,
      });
      return;
    }

    setIsSaving(true);
    try {
      const isLastStep = safeStepIndex === activeSteps.length - 1;
      const isCompleted = isLastStep;
      const nextStepIndex = safeStepIndex + 1;
      const updatedAt = new Date().toISOString();

      // 1. Save to local draft first
      saveLocalDraft({
        deviceId,
        answers: currentAnswers,
        stepIndex: isCompleted ? safeStepIndex : nextStepIndex,
        completed: isCompleted,
        updatedAt,
      });

      // 2. Call saveOnboardingDraft server action
      await saveOnboardingDraft({
        data: {
          deviceId,
          answers: currentAnswers,
          completed: isCompleted,
        },
      });

      // 3. Proceed
      if (isCompleted) {
        setCompleted(true);
        posthog?.capture("onboarding_completed", {
          ...stepEventProperties!,
          contact_channel: String(currentAnswers.contacto_canal ?? ""),
        });
      } else {
        posthog?.capture("onboarding_step_completed", stepEventProperties!);
        setStepIndex(nextStepIndex);
      }
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
      setSaveError("Error al guardar el borrador. Intentá de nuevo.");
      posthog?.captureException(error);
      posthog?.capture("onboarding_save_failed", stepEventProperties!);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
      <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] space-y-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--sea-ink-soft)] mb-2">
            <span>
              PASO {safeStepIndex + 1} DE {activeSteps.length}
            </span>
            <span>{progressPercent}% COMPLETADO</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full bg-[var(--lagoon-deep)] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Step Header */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--sea-ink)]">
                {stepTitle}
              </h1>
              {stepIntro && (
                <p className="mt-2 text-sm text-[var(--sea-ink-soft)] leading-relaxed">
                  {stepIntro}
                </p>
              )}
            </div>

            {/* Form */}
            <form
              onSubmit={handleNext}
              className="flex flex-col flex-1 justify-between sm:justify-start space-y-6"
            >
              <div className="flex-1 space-y-6">
                {getVisibleFields(currentStep, formAnswers).map((field) => (
                  <div key={field.id} className="space-y-2">
                    {field.type !== "radio" && field.type !== "checkbox" && (
                      <label
                        htmlFor={field.id}
                        className="block text-sm font-bold text-[var(--sea-ink)]"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-rose-500 ml-0.5">*</span>
                        )}
                      </label>
                    )}

                    <form.Field name={field.id}>
                      {(fieldState) => {
                        switch (field.type) {
                          case "radio":
                            return (
                              <fieldset
                                aria-describedby={
                                  validationErrors[field.id]
                                    ? `${field.id}-error`
                                    : undefined
                                }
                                className="flex flex-col gap-2"
                              >
                                <legend className="mb-2 block text-sm font-bold text-[var(--sea-ink)]">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-rose-500 ml-0.5">
                                      *
                                    </span>
                                  )}
                                </legend>
                                {field.options?.map((option) => {
                                  const isDisabled =
                                    field.disabledOptions?.includes(option) ??
                                    false;
                                  return (
                                    <label
                                      key={option}
                                      htmlFor={`${field.id}-${option}`}
                                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] text-base font-medium text-[var(--sea-ink)] transition-all focus-within:ring-2 focus-within:ring-[var(--lagoon-deep)] ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[var(--foam)] active:scale-[0.99]"}`}
                                    >
                                      <input
                                        id={`${field.id}-${option}`}
                                        type="radio"
                                        name={field.id}
                                        value={option}
                                        checked={
                                          fieldState.state.value === option
                                        }
                                        disabled={isDisabled}
                                        onChange={() =>
                                          fieldState.handleChange(option)
                                        }
                                        className="size-5 accent-[var(--lagoon-deep)] cursor-pointer"
                                      />
                                      {option}
                                    </label>
                                  );
                                })}
                              </fieldset>
                            );
                          case "checkbox":
                            return (
                              <fieldset
                                aria-describedby={
                                  validationErrors[field.id]
                                    ? `${field.id}-error`
                                    : undefined
                                }
                                className="flex flex-col gap-2"
                              >
                                <legend className="mb-2 block text-sm font-bold text-[var(--sea-ink)]">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-rose-500 ml-0.5">
                                      *
                                    </span>
                                  )}
                                </legend>
                                {field.options?.map((option) => {
                                  const selected = Array.isArray(
                                    fieldState.state.value,
                                  )
                                    ? fieldState.state.value
                                    : [];
                                  const checked = selected.includes(option);
                                  const isDisabled =
                                    !checked &&
                                    field.maxSelections === selected.length;
                                  return (
                                    <label
                                      key={option}
                                      htmlFor={`${field.id}-${option}`}
                                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] text-base font-medium text-[var(--sea-ink)] cursor-pointer transition-all hover:bg-[var(--foam)] active:scale-[0.99] focus-within:ring-2 focus-within:ring-[var(--lagoon-deep)] ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                                    >
                                      <input
                                        id={`${field.id}-${option}`}
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isDisabled}
                                        onChange={() =>
                                          fieldState.handleChange(
                                            checked
                                              ? selected.filter(
                                                  (item) => item !== option,
                                                )
                                              : [...selected, option],
                                          )
                                        }
                                        className="size-5 accent-[var(--lagoon-deep)] cursor-pointer"
                                      />
                                      {option}
                                    </label>
                                  );
                                })}
                              </fieldset>
                            );
                          case "month":
                            return (
                              <Input
                                id={field.id}
                                type="month"
                                aria-invalid={!!validationErrors[field.id]}
                                aria-describedby={
                                  validationErrors[field.id]
                                    ? `${field.id}-error`
                                    : undefined
                                }
                                value={String(fieldState.state.value ?? "")}
                                onChange={(event) =>
                                  fieldState.handleChange(event.target.value)
                                }
                                onBlur={fieldState.handleBlur}
                                className={
                                  validationErrors[field.id]
                                    ? "border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]"
                                    : ""
                                }
                              />
                            );
                          case "upload":
                            return (
                              <OnboardingUpload
                                fieldId={field.id}
                                value={
                                  typeof fieldState.state.value === "string"
                                    ? fieldState.state.value
                                    : undefined
                                }
                                disabled={isSaving}
                                onUpload={async (file, setProgress) => {
                                  const previousKey =
                                    typeof fieldState.state.value === "string"
                                      ? fieldState.state.value
                                      : undefined;
                                  const { key, url } =
                                    await createOnboardingUpload({
                                      data: {
                                        deviceId,
                                        fieldId: field.id,
                                        contentType: file.type,
                                        size: file.size,
                                      },
                                    });
                                  await putFile(url, file, setProgress);

                                  const answers = filterAnswersForActiveSteps({
                                    ...form.state.values,
                                    [field.id]: key,
                                  });
                                  await saveOnboardingDraft({
                                    data: {
                                      deviceId,
                                      answers,
                                      completed: false,
                                    },
                                  });

                                  fieldState.handleChange(key);
                                  saveLocalDraft({
                                    deviceId,
                                    answers,
                                    stepIndex: safeStepIndex,
                                    completed: false,
                                    updatedAt: new Date().toISOString(),
                                  });
                                  if (previousKey) {
                                    await deleteOnboardingUpload({
                                      data: { deviceId, key: previousKey },
                                    }).catch(() => undefined);
                                  }
                                }}
                              />
                            );
                          case "select":
                            return (
                              <div className="relative">
                                <select
                                  id={field.id}
                                  aria-invalid={!!validationErrors[field.id]}
                                  aria-describedby={
                                    validationErrors[field.id]
                                      ? `${field.id}-error`
                                      : undefined
                                  }
                                  value={String(fieldState.state.value ?? "")}
                                  onChange={(e) =>
                                    fieldState.handleChange(e.target.value)
                                  }
                                  onBlur={fieldState.handleBlur}
                                  className="block w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3.5 py-2.5 text-base text-[var(--sea-ink)] outline-none transition-colors focus:border-[var(--lagoon-deep)] focus:ring-3 focus:ring-[color-mix(in_oklab,var(--lagoon)_25%,transparent)]"
                                >
                                  <option value="" disabled>
                                    Elegí una opción...
                                  </option>
                                  {field.options?.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          default:
                            if (field.type === "number") {
                              return (
                                <Input
                                  id={field.id}
                                  type="text"
                                  inputMode="numeric"
                                  aria-invalid={!!validationErrors[field.id]}
                                  aria-describedby={
                                    validationErrors[field.id]
                                      ? `${field.id}-error`
                                      : undefined
                                  }
                                  value={formatNumber(fieldState.state.value)}
                                  onChange={(event) =>
                                    fieldState.handleChange(
                                      parseNumber(event.target.value),
                                    )
                                  }
                                  onBlur={fieldState.handleBlur}
                                  className={
                                    validationErrors[field.id]
                                      ? "border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]"
                                      : ""
                                  }
                                />
                              );
                            }
                            return (
                              <Input
                                id={field.id}
                                type={field.type}
                                aria-invalid={!!validationErrors[field.id]}
                                aria-describedby={
                                  validationErrors[field.id]
                                    ? `${field.id}-error`
                                    : undefined
                                }
                                value={String(fieldState.state.value ?? "")}
                                onChange={(event) =>
                                  fieldState.handleChange(event.target.value)
                                }
                                onBlur={fieldState.handleBlur}
                                className={
                                  validationErrors[field.id]
                                    ? "border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]"
                                    : ""
                                }
                              />
                            );
                        }
                      }}
                    </form.Field>

                    {validationErrors[field.id] && (
                      <p
                        id={`${field.id}-error`}
                        className="mt-1 text-xs font-semibold text-[var(--error)]"
                        role="alert"
                        aria-live="polite"
                      >
                        {validationErrors[field.id]}
                      </p>
                    )}
                  </div>
                ))}

                {/* Save/Retry Error */}
                {saveError && (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-4 text-sm font-semibold text-[var(--error)]"
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="size-2 rounded-full bg-[var(--error)] animate-ping" />
                    <span>{saveError}</span>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={safeStepIndex === 0 || isSaving}
                  className="h-auto rounded-xl border border-[var(--line)] px-5 py-2.5 text-base font-bold text-[var(--sea-ink)] hover:bg-[var(--foam)] disabled:opacity-40 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <ArrowLeft className="size-4" />
                  Volver
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-auto rounded-xl bg-[var(--lagoon-deep)] px-6 py-2.5 text-base font-bold text-[var(--on-primary)] hover:bg-[var(--sea-ink)] disabled:opacity-50 flex items-center gap-2 shadow-md shadow-[var(--lagoon)/10] transition-all active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      {safeStepIndex === activeSteps.length - 1
                        ? "Completar"
                        : "Continuar"}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}
