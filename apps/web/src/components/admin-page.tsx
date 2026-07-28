import { useState, useEffect, Fragment } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { usePostHog } from "@posthog/react";
import { loginAdmin } from "../admin/auth";
import {
  listAdminResults,
  getAdminResultFiles,
  listAdminCsvRows,
  getAdminCsvRow,
  saveAdminReport,
  setAdminReportSent,
} from "../admin/server";
import { serializeCsv } from "../admin/csv";
import { formatAdminDownloadLabel } from "../admin/download-label";

function normalizePastedReportJson(value: string) {
  return value
    .replaceAll("├í", "á")
    .replaceAll("├®", "é")
    .replaceAll("├¡", "í")
    .replaceAll("├│", "ó")
    .replaceAll("├║", "ú")
    .replaceAll("├▒", "ñ")
    .replaceAll("ÔÇö", "—");
}

type ResultFilter =
  "all" | "draft" | "completed" | "report-ready" | "report-sent";

function getResultStatus(device: {
  status: string;
  hasReport: boolean;
  reportSentOn: unknown;
}) {
  if (device.reportSentOn) return "report-sent";
  if (device.hasReport) return "report-ready";
  return device.status === "completed" ? "completed" : "draft";
}

const resultFilters: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "completed", label: "Completado" },
  { value: "report-ready", label: "Informe Listo" },
  { value: "report-sent", label: "Informe Enviado" },
];

export function AdminPage({ authenticated }: { authenticated: boolean }) {
  const posthog = usePostHog();

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Results tab state
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [filesByDevice, setFilesByDevice] = useState<
    Record<
      string,
      {
        files: any[] | null;
        isLoading: boolean;
        error: string | null;
      }
    >
  >({});
  const [csvError, setCsvError] = useState<string | null>(null);

  // Report controls state
  const [editingReportDeviceId, setEditingReportDeviceId] = useState<
    string | null
  >(null);
  const [reportJsonInput, setReportJsonInput] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isSendingReportByDevice, setIsSendingReportByDevice] = useState<
    Record<string, boolean>
  >({});
  const [copyErrorByDevice, setCopyErrorByDevice] = useState<
    Record<string, string | null>
  >({});
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [contactCopyErrorByDevice, setContactCopyErrorByDevice] = useState<
    Record<string, string | null>
  >({});

  function updateResult(updated: Awaited<ReturnType<typeof saveAdminReport>>) {
    setResults(
      (current) =>
        current?.map((result) =>
          result.deviceId === updated.deviceId ? updated : result,
        ) ?? null,
    );
  }

  function openReportEditor(deviceId: string) {
    setEditingReportDeviceId(deviceId);
    setReportJsonInput("");
    setReportError(null);
  }

  function closeReportEditor() {
    setEditingReportDeviceId(null);
    setReportJsonInput("");
    setReportError(null);
  }

  async function handleSaveReport(deviceId: string) {
    setReportError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(reportJsonInput);
    } catch (err) {
      setReportError("El informe debe ser un JSON válido.");
      return;
    }

    setIsSavingReport(true);
    try {
      const updated = await saveAdminReport({
        data: { deviceId, report: parsed as any },
      });
      updateResult(updated);
      closeReportEditor();
    } catch (err) {
      setReportError("El informe no tiene el formato esperado.");
    } finally {
      setIsSavingReport(false);
    }
  }

  async function updateSentState(deviceId: string, sent: boolean) {
    setIsSendingReportByDevice((prev) => ({ ...prev, [deviceId]: true }));
    try {
      const updated = await setAdminReportSent({ data: { deviceId, sent } });
      updateResult(updated);
    } catch (err) {
      // ignore
    } finally {
      setIsSendingReportByDevice((prev) => ({ ...prev, [deviceId]: false }));
    }
  }

  async function handleCopyLink(deviceId: string) {
    setCopyErrorByDevice((prev) => ({ ...prev, [deviceId]: null }));
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/informe/${deviceId}`,
      );
    } catch (err) {
      setCopyErrorByDevice((prev) => ({
        ...prev,
        [deviceId]: "No se pudo copiar el enlace.",
      }));
    }
  }

  async function handleCopyContact(deviceId: string, contactValue: string) {
    setContactCopyErrorByDevice((prev) => ({ ...prev, [deviceId]: null }));
    try {
      await navigator.clipboard.writeText(contactValue);
    } catch (err) {
      setContactCopyErrorByDevice((prev) => ({
        ...prev,
        [deviceId]: "No se pudo copiar el contacto.",
      }));
    }
  }

  function downloadCsv(
    headers: readonly string[],
    rows: Record<string, any>[],
    filename: string,
  ) {
    const blob = new Blob([serializeCsv(headers, rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadAllCsv() {
    setCsvError(null);
    try {
      const { headers, rows } = await listAdminCsvRows();
      downloadCsv(headers, rows, "norte-respuestas.csv");
    } catch (err) {
      setCsvError("Error al descargar el CSV.");
    }
  }

  async function handleDownloadRowCsv(deviceId: string, name: string | null) {
    setCsvError(null);
    try {
      const { headers, rows } = await getAdminCsvRow({ data: { deviceId } });
      const suffix = name
        ? `${deviceId}-${name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`
        : deviceId;
      downloadCsv(headers, rows, `norte-${suffix}.csv`);
    } catch (err) {
      setCsvError("Error al descargar el CSV.");
    }
  }

  async function fetchResults() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await listAdminResults();
      setResults(res);
    } catch (err) {
      setLoadError("Error al cargar los resultados.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchResults();
    }
  }, [authenticated]);

  async function toggleRow(deviceId: string) {
    if (expandedDeviceId === deviceId) {
      setExpandedDeviceId(null);
      return;
    }

    setExpandedDeviceId(deviceId);

    const current = filesByDevice[deviceId];
    if (!current || (!current.files && !current.isLoading && !current.error)) {
      setFilesByDevice((prev) => ({
        ...prev,
        [deviceId]: { files: null, isLoading: true, error: null },
      }));
      try {
        const files = await getAdminResultFiles({ data: { deviceId } });
        setFilesByDevice((prev) => ({
          ...prev,
          [deviceId]: { files, isLoading: false, error: null },
        }));
      } catch (err) {
        setFilesByDevice((prev) => ({
          ...prev,
          [deviceId]: {
            files: null,
            isLoading: false,
            error: "Error al cargar archivos.",
          },
        }));
      }
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await loginAdmin({ data: { username, password } });
      if (res.ok) {
        try {
          (posthog as any)?.optOut();
        } catch {}
        window.location.reload();
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
    } catch (err) {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  const visibleResults =
    results?.filter(
      (device) =>
        resultFilter === "all" || getResultStatus(device) === resultFilter,
    ) ?? [];

  if (!authenticated) {
    return (
      <div className="demo-page demo-center">
        <div className="demo-panel w-full max-w-md rise-in">
          <div className="mb-6 text-center">
            <h1 className="demo-title text-3xl font-bold tracking-tight">
              Administración
            </h1>
            <p className="demo-muted mt-2 text-sm">
              Ingresá tus credenciales para acceder
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username-input"
                className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1"
              >
                Usuario
              </label>
              <Input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="password-input"
                className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1"
              >
                Contraseña
              </label>
              <Input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {error && (
              <p
                className="text-sm font-semibold text-[var(--error)] bg-[var(--error-surface)] border border-[var(--error-border)] rounded-lg p-2.5"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full justify-center">
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-page demo-center">
      <div className="demo-panel w-full max-w-[1200px] rise-in">
        <div className="mb-6">
          <h1 className="demo-title text-3xl font-bold tracking-tight">
            Administración
          </h1>
          <p className="demo-muted mt-2 text-sm">Gestionar respuestas</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-end gap-2">
            <Button
              type="button"
              onClick={handleDownloadAllCsv}
              variant="outline"
            >
              Descargar CSV
            </Button>
            {csvError && (
              <p
                className="text-sm font-semibold text-[var(--error)] bg-[var(--error-surface)] border border-[var(--error-border)] rounded-lg p-2"
                role="alert"
              >
                {csvError}
              </p>
            )}
          </div>

          {results && results.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Filtrar por estado"
            >
              {resultFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={
                    resultFilter === filter.value ? "default" : "outline"
                  }
                  onClick={() => setResultFilter(filter.value)}
                  aria-pressed={resultFilter === filter.value}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          )}

          {loadError ? (
            <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-6 text-center space-y-3">
              <p className="text-base font-semibold text-[var(--error)]">
                {loadError}
              </p>
              <Button type="button" onClick={fetchResults} className="mx-auto">
                Reintentar
              </Button>
            </div>
          ) : isLoading ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
              <p className="text-base font-medium text-[var(--sea-ink-soft)] animate-pulse">
                Cargando resultados...
              </p>
            </div>
          ) : !results || visibleResults.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
              <p className="text-base font-medium text-[var(--sea-ink-soft)]">
                No se encontraron resultados.
              </p>
            </div>
          ) : (
            <div className="demo-table-shell">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th scope="col" className="w-1/3">
                      Nombre
                    </th>
                    <th scope="col" className="w-1/3">
                      Device ID
                    </th>
                    <th scope="col" className="w-1/3">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResults.map((device) => {
                    const isExpanded = expandedDeviceId === device.deviceId;
                    const deviceState = filesByDevice[device.deviceId] || {
                      files: null,
                      isLoading: false,
                      error: null,
                    };
                    const resultStatus = getResultStatus(device);
                    return (
                      <Fragment key={device.deviceId}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleRow(device.deviceId)}
                              aria-expanded={isExpanded}
                              aria-controls={`files-container-${device.deviceId}`}
                              className="text-left font-semibold text-[var(--lagoon-deep)] hover:underline focus:outline-none cursor-pointer"
                            >
                              {device.name || "Sin nombre"}
                            </button>
                          </td>
                          <td>
                            <span className="font-mono text-sm text-[var(--sea-ink-soft)]">
                              {device.deviceId}
                            </span>
                          </td>
                          <td>
                            {resultStatus === "report-sent" ? (
                              <span className="demo-pill bg-[color-mix(in_oklab,#2e7d32_15%,transparent)] text-[#1b5e20] border-[#2e7d32]/30 font-bold">
                                Informe Enviado
                              </span>
                            ) : resultStatus === "report-ready" ? (
                              <span className="demo-pill font-bold">
                                Informe Listo
                              </span>
                            ) : (
                              <span className="demo-pill font-bold">
                                {resultStatus === "completed"
                                  ? "Completado"
                                  : "Borrador"}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={3}
                              className="bg-[color-mix(in_oklab,var(--chip-bg)_92%,black_8%)] dark:bg-[color-mix(in_oklab,var(--chip-bg)_92%,white_8%)]"
                            >
                              <div
                                id={`files-container-${device.deviceId}`}
                                className="p-3 space-y-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={`/admin/resultados/${device.deviceId}`}
                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--chip-bg)]"
                                  >
                                    Ver resultados
                                  </a>
                                  {device.status === "completed" && (
                                    <Button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadRowCsv(
                                          device.deviceId,
                                          device.name,
                                        )
                                      }
                                      variant="outline"
                                      aria-label={`Descargar CSV para ${device.name || device.deviceId}`}
                                    >
                                      Descargar CSV
                                    </Button>
                                  )}
                                </div>

                                {deviceState.isLoading && (
                                  <p className="text-sm text-[var(--sea-ink-soft)] animate-pulse">
                                    Cargando archivos...
                                  </p>
                                )}
                                {deviceState.error && (
                                  <p className="text-sm text-[var(--error)] font-medium">
                                    {deviceState.error}
                                  </p>
                                )}
                                {!deviceState.isLoading &&
                                  !deviceState.error &&
                                  deviceState.files &&
                                  (deviceState.files.length === 0 ? (
                                    <p className="text-sm text-[var(--sea-ink-soft)]">
                                      No se encontraron archivos.
                                    </p>
                                  ) : (
                                    <div className="flex flex-col gap-2 pl-3 border-l-2 border-[var(--lagoon-deep)]">
                                      {deviceState.files.map(
                                        (file: any, idx: number) => (
                                          <a
                                            key={idx}
                                            href={file.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center text-sm font-semibold text-[var(--lagoon-deep)] hover:underline"
                                          >
                                            {formatAdminDownloadLabel(
                                              file.fieldId,
                                              file.label,
                                            )}
                                          </a>
                                        ),
                                      )}
                                    </div>
                                  ))}

                                <div className="space-y-3 pt-2 border-t border-[var(--line)]">
                                  <div className="flex flex-wrap items-center gap-3">
                                    {device.hasReport ? (
                                      <>
                                        <p className="text-sm font-semibold text-[var(--lagoon-deep)]">
                                          Informe cargado
                                        </p>
                                        <Button
                                          type="button"
                                          onClick={() =>
                                            openReportEditor(device.deviceId)
                                          }
                                          variant="outline"
                                        >
                                          Reemplazar informe
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          openReportEditor(device.deviceId)
                                        }
                                        variant="outline"
                                      >
                                        Cargar informe
                                      </Button>
                                    )}
                                    <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--sea-ink)] cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(device.reportSentOn)}
                                        disabled={
                                          !device.hasReport ||
                                          Boolean(
                                            isSendingReportByDevice[
                                              device.deviceId
                                            ],
                                          )
                                        }
                                        onChange={(event) =>
                                          updateSentState(
                                            device.deviceId,
                                            event.target.checked,
                                          )
                                        }
                                      />
                                      Informe enviado
                                    </label>
                                  </div>
                                  {device.hasReport && (
                                    <div className="flex flex-wrap items-center gap-3">
                                      <a
                                        href={`/informe/${device.deviceId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--chip-bg)]"
                                      >
                                        Ver informe
                                      </a>
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleCopyLink(device.deviceId)
                                        }
                                        variant="outline"
                                      >
                                        Copiar enlace
                                      </Button>
                                      <span className="font-mono text-xs text-[var(--sea-ink-soft)] break-all select-all">
                                        {`${window.location.origin}/informe/${device.deviceId}`}
                                      </span>
                                      {copyErrorByDevice[device.deviceId] && (
                                        <span className="text-sm font-semibold text-[var(--error)]">
                                          {copyErrorByDevice[device.deviceId]}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <p className="text-sm text-[var(--sea-ink)]">
                                    Nombre: {device.name || "Sin nombre"}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--sea-ink)]">
                                    <span>
                                      Método de envío:{" "}
                                      {device.contactMethod &&
                                      device.contactValue
                                        ? `${device.contactMethod} ${device.contactValue}`
                                        : "Sin contacto"}
                                    </span>
                                    {device.contactValue && (
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleCopyContact(
                                            device.deviceId,
                                            device.contactValue,
                                          )
                                        }
                                        variant="outline"
                                      >
                                        Copiar
                                      </Button>
                                    )}
                                    {contactCopyErrorByDevice[
                                      device.deviceId
                                    ] && (
                                      <span className="font-semibold text-[var(--error)]">
                                        {
                                          contactCopyErrorByDevice[
                                            device.deviceId
                                          ]
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {editingReportDeviceId === device.deviceId && (
                                  <div className="space-y-3 p-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]">
                                    <div>
                                      <label
                                        htmlFor={`report-${device.deviceId}`}
                                        className="block text-sm font-medium text-[var(--sea-ink)] mb-1"
                                      >
                                        JSON del informe
                                      </label>
                                      <textarea
                                        id={`report-${device.deviceId}`}
                                        value={reportJsonInput}
                                        onChange={(e) =>
                                          setReportJsonInput(
                                            normalizePastedReportJson(
                                              e.target.value,
                                            ),
                                          )
                                        }
                                        rows={6}
                                        className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2 text-xs font-mono text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--lagoon-deep)]"
                                      />
                                    </div>
                                    {reportError && (
                                      <p
                                        className="text-sm font-semibold text-[var(--error)]"
                                        role="alert"
                                      >
                                        {reportError}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        onClick={() =>
                                          handleSaveReport(device.deviceId)
                                        }
                                        disabled={isSavingReport}
                                      >
                                        Guardar informe
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={closeReportEditor}
                                        variant="outline"
                                        disabled={isSavingReport}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
