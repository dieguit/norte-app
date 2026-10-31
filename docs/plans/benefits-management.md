# Plan: gestión de beneficios (v2)

Fecha: 30/10/2026 · Branch: `feat/savings-benefits-digest` (PR #63) · Base: `docs/research/gestion-beneficios.md`

## Objetivo

Reemplazar el matching por lista plana de instrumentos con reglas de elegibilidad AND/OR deterministas, mantener un catálogo de 17 proveedores con fuentes verificadas o bloqueos explícitos, y dar herramientas CLI para verificar fuentes (misma ruta que el cron nocturno) y revisar/cargar beneficios. App UI queda fuera (diseño en curso).

## Alcance

| Tipo       | Proveedores (slug)                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Bancos     | `galicia`, `macro` (Selecta = segmento), `santander` (+ `santander-sorpresa`), `bbva`, `brubank`                          |
| Billeteras | `modo`, `naranjax` (+ planes Turbo/Épico), `personalpay`, `uala`, `mercadopago`                                           |
| Membresías | `ypf` (`ypf-serviclub`), `shell` (`shell-box`), `meli` (`meli-plus`), `uber` (`uber-one`), `pedidosya` (`pedidosya-plus`) |
| Redes      | `visa`, `mastercard`                                                                                                      |

Enums `amex`/`cabal` se conservan (p. ej. Macro Selecta Amex Icon) sin proveedor propio.

Fuera de alcance: UI de listado/detalle y facts en la app, ciudad/cobertura geográfica (§16), extractor PDF, control de tope consumido, nuevos canales o frecuencias de envío.

## Decisiones

- **Reglas**: `Requirement` = `allOf | anyOf | card | membership | providerFact`. Un `CardSelector` se evalúa sobre una misma tarjeta; listas = OR, campos = AND; exclusión de emisor prevalece. Profundidad ≤ 5, nodos ≤ 50.
- **Evaluador ternario** (true/false/unknown). Hecho faltante nunca es match. Resultado `BenefitMatch` con `eligibility`, `availability`, `missingFacts`, `reasons`, `requiredActions`, estimación.
- **Redes**: `appliesTo.network` sólo sugiere candidatos al extractor; nunca otorga elegibilidad. Se elimina la instrucción "Visa débito → Galicia".
- **Membresías**: el caso normal es `{ membership }` solo; las promos co-branded usan `allOf[card, membership]`. Seleccionar una membresía = activa autodeclarada.
- **Beneficios fijos de membresía** (Uber One, PedidosYa Plus, etc.): carga manual, `recurrence: ongoing`. El digest los incluye sólo durante las 24 h posteriores a declarar la membresía (respetando las categorías elegidas); el agente siempre puede consultarlos. TTL de verificación 90 días (`benefits:review reverify`).
- **Dinero**: enteros en centavos ARS, porcentajes en bps, `caps[]` con período/alcance/`sharedCapGroupId`; `capState: known | none | unknown`. Tope desconocido ≠ sin tope; sin estimación exacta.
- **Fechas**: `America/Argentina/Buenos_Aires`, límites inclusivos; `validity.to = null` = desconocido, no ilimitado.
- **Ciclo de vida**: `draft | needs_review | published | expired | withdrawn`. Expiración por fecha aunque falle harvest. Stale a 48 h sin verificación; fuera de digest a 7 días. Retiro por ausencia sólo en fuentes `coverage: full` tras 2 corridas completas ≥ 24 h. Fallas, bloqueos, vacíos sospechosos o parciales nunca retiran.
- **Publicación**: cada fuente tiene `autoPublish` (false al alta). Con false todo va a `needs_review`; tras validarla se activa y publican solos los registros completos y válidos. Contradicciones y cambios materiales sobre un publicado van a revisión sin pisar la versión vigente.
- **Datos actuales**: no están en prod; la tabla `benefits` se recrea y todo vuelve a entrar por harvest/revisión.
- **Fuentes**: `id` estable, `enabled`, `status` (`pending_discovery | pending_validation | active | degraded | blocked | disabled`), `coverage` (`full | partial | campaign_only | unknown`), `note`. Estrategias `json | fetch | file`; `file` lee un texto local (términos de PDFs pegados a mano en `apps/api/src/benefits/manual/<sourceId>.txt`).
- **Instrumentos**: sólo combinaciones con `evidenceUrl` oficial. Campos nuevos opcionales: `issuerProviderSlug`, `issuerCountry`, `productLevel`, `segment`, `usage`. `tier` legado.
- **Preferencias**: `instrumentSlugs` + `instrumentFacts` + `providerFacts` (jsonb). 400 ante slugs desconocidos. Hasta que la app tenga UI, los facts se declaran por WhatsApp (tool del agente con la misma validación).
- **Comportamiento**: reemplaza al actual, sin feature flag.

## Herramientas

### `pnpm --filter @repo/api benefits:verify [provider|sourceId] [flags]`

Corre exactamente `runHarvest` (lo mismo que el cron). Default dry run, sin escrituras.

- Reporte por fuente: HTTP, MIME, bytes, truncado, detección de bloqueo/challenge/login/app shell/JSON de error, registros detectados/válidos/rechazados con motivo, completitud, muestras y veredicto (`active | degraded | blocked`).
- `--no-llm`: sólo descarga y controles (barato, chequeo de salud).
- `--save-fixture`: guarda la descarga en `apps/api/test/fixtures/benefits/<sourceId>.*`.
- `--fixture`: reproduce desde el fixture guardado (sin red).
- `--commit [--now=YYYY-MM-DD]`: simula la noche completa: staging, publicación según política y transiciones de ciclo de vida con reloj controlado.

### `pnpm --filter @repo/api benefits:review <cmd>`

`list [--status needs_review]`, `show <id>` (reglas + evidencia + diff con la versión publicada), `approve <id>`, `reject <id>`, `add <file.json>`, `edit <id> <file.json>`, `source <sourceId> enable|disable|auto-publish on|off`. Cada acción guarda autor y fecha; `add`/`edit` marcan campos protegidos que el harvest no pisa. JSON validado con el mismo schema que el harvest.

## Pasadas

Cada pasada termina con suite completa, gate de @oracle, commit (con tu OK) y re-plan.

### Pasada 1 — Contratos, evaluador y catálogo (sin DB)

Antes de despachar: el orquestador escribe los contratos compartidos en `packages/shared-types/src/benefits.schema.ts` (borrador en el stash) y los tipos de catálogo.

| Lane | Agente   | Scope de escritura                 | Entregable / evidencia                                                                                                                                                                            |
| ---- | -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R    | explorer | ninguno (reporte)                  | Por proveedor: instrumentos con `evidenceUrl`, URLs/endpoints de fuentes candidatas, observaciones (bloqueos, paginación)                                                                         |
| E    | fixer    | `apps/api/src/benefits/rules/**`   | `eligibility.ts`, `availability.ts`, `estimate.ts` + specs: matriz §12 en alcance y los 6 casos §4 como fixtures de test (nunca seeds)                                                            |
| C    | fixer    | `apps/api/src/benefits/catalog/**` | 17 proveedores, instrumentos con evidencia (de R), fuentes `pending_*` salvo las 3 actuales, `resolveCandidateInstruments`; spec de unicidad, referencias y "sólo `active` puede estar `enabled`" |

R corre primero; E en paralelo con R; C después de R.

### Pasada 2 — Persistencia, harvest y herramientas

@oracle revisa el diseño antes de despachar (estado persistente, dinero, retiros).

| Lane | Scope de escritura                                                                                | Entregable                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P    | `benefits.schema.ts`, `drizzle/**`, `database/schema*`                                            | Recrear `benefits` (reglas jsonb, evidencia, lifecycle, revisión, protectedFields, origin `harvest                                                      | manual`); `benefit_source_runs` (métricas por corrida); facts en preferencias; migración idempotente |
| H    | `harvest.ts`, extractor agent, `manual/**`                                                        | Controles de contenido, truncado → parcial, prompt y schema hacia `BenefitRules` + evidencia, estrategia `file`, política de publicación, ciclo de vida |
| T    | `*.script.ts`, `package.json` scripts                                                             | `benefits:verify` y `benefits:review`                                                                                                                   |
| S    | `benefits.service.ts`, controller/dto, `digest.ts`, `mastra/tools/benefit-tools.ts`, `domains.ts` | `findMatching` con el evaluador, digest con todos los requisitos, catálogo extendido, preferencias con facts, tool de facts para WhatsApp               |

Interfaces entre lanes fijadas por el orquestador antes del despacho (funciones de persistencia y forma de `SourceResult`).

### Pasada 3 — Validación de proveedores y cierre

- Lotes de ~4 proveedores: @explorer descubre o confirma el endpoint y @fixer agrega la fuente, el fixture y el test. Corrés `benefits:verify <provider>` en vivo y la fuente queda `active` o `blocked` con nota.
- Carga manual de beneficios fijos de membresías vía `benefits:review add`.
- Noche simulada completa: `benefits:verify --commit --now=…` en la DB de dev; digest real de prueba.
- Cierre: e2e (`norte_test`), `pnpm fallow:audit`, checklist de 17 proveedores.

## Definición de terminado

- 17 proveedores: cada fuente `active` con fixture y test, `degraded` (corre de noche, todo va a revisión; aceptado 30/10/2026) o `blocked`/`pending` con motivo registrado.

## Estado al cierre (30/10/2026)

| Estado               | Fuentes                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| active + autoPublish | visa-offers, naranjax-plan-turbo, naranjax-plan-epico                                   |
| degraded (revisión)  | galicia, modo ×3, macro-beneficios, macro-selecta, brubank, personalpay, uala, uber-one |
| pending              | ypf-serviclub, meli-plus, naranjax-promociones, shell-descuentos                        |
| blocked              | santander (timeout), bbva / pedidosya / mastercard (403), mercadopago (login)           |
| manual               | shell-box (perk por `benefits:review add`)                                              |

Pendientes conocidos: recuperación de beneficios retirados; historial de eventos de revisión (actor/motivo en add/edit/reverify/reject); registrar corridas bloqueadas/fallidas separado de la certificación; guard de `--commit` con allowlist explícita; DNS rebinding; exclusiones de adquirente y contradicciones en MODO; selección de colecciones JSON heurística; corrección semántica del LLM no certificada (las citas prueban presencia, no significado).

- App (sólo preferencias), digest y WhatsApp usan el mismo evaluador.
- Ningún beneficio con dato esencial desconocido aparece como garantizado; ningún caso de §4 se publica por copiarlo.
- Un beneficio se puede explicar: por qué le corresponde al usuario, cómo usarlo y de dónde sale cada condición.
- Verificación: `pnpm test`, `check-types` api/web, `test:e2e`, `fallow:audit`, corrida `benefits:verify` documentada.

## Riesgos

- Sitios con bloqueo o render por JS: algunos quedarán `blocked`; no se evaden protecciones.
- Costo de LLM en `verify` en vivo: usar `--no-llm` y `--fixture` para iterar.
- Sin UI de facts, beneficios que dependen de segmento o nivel (p. ej. Macro Selecta) quedan `needs_information` salvo que se declaren por WhatsApp.
- Vigencias de los casos de referencia vencen el 31/10/2026: son sólo fixtures de test.
