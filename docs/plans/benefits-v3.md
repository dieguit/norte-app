# Plan: beneficios v3

Fecha: 31/10/2026 · Branch: `feat/savings-benefits-digest` (PR #63) · Reemplaza el enfoque de `docs/plans/benefits-management.md` (v2).

## Por qué v3

v2 descargaba una página o un slot por proveedor y extraía con LLM. Resultado: cobertura mínima (Galicia 7 de ~2.200, MODO ~10 por slot), extracción no determinista, beneficios sin forma de verificarlos y un digest que lista decenas de ítems sin criterio. El problema está en **cómo entran los datos** y **cómo se elige qué mostrar**; el motor de reglas, el panel admin y las herramientas se conservan.

Evidencia: spikes del 30/10/2026 (muestras en `/tmp/opencode/benefits-spike/`, no versionadas).

## Decisiones

- **Ingesta por API, determinista, sin LLM.** Adaptadores por plataforma que leen el catálogo completo (paginado) y mapean en código. Browser headless o LLM quedan fuera de v1.
- **Adaptadores v1:**
  - **PlayDigital** (backend de MODO): `rewards-handler.playdigital.com.ar/slots/` con `banks=<uuid>`, `page`, `limit=1000`. Lista de bancos: `modo.com.ar/promos/api/rewards/v2/banks`. Cubre las promos MODO de **todos los bancos** de esa lista (v1 habilita todos) y además el hub web de Macro.
  - **Galicia propio**: `loyalty.bff.bancogalicia.com.ar/api/portal/personalizacion/v1/promociones/catalogo?page=1&pageSize=3000` (~2.244). Catálogo distinto de las promos MODO de Galicia.
- **Dos niveles de cobertura por banco.** (1) **Promos MODO**: todos los bancos de MODO desde v1, vía PlayDigital. (2) **Catálogo propio del banco** (promos pagando con la tarjeta, fuera de MODO): requiere auditoría y adaptador por banco; v1 sólo Galicia (catálogo propio) y Macro (su hub web es PlayDigital, a confirmar que no tenga otro). El admin y la app muestran por banco qué cubrimos: "promos MODO" o "promos MODO + catálogo del banco".
- **Verificación obligatoria.** Cada beneficio mostrado lleva un enlace verificable: PlayDigital → `https://www.modo.com.ar/promos/{slug}`; Galicia (sin detalle público) → buscador de Galicia + "buscá «{marca}»" + id de promo.
- **Datos faltantes se muestran con advertencia**, nunca como ausentes (Galicia no trae tope ni mínimo: "tope y mínimo sin confirmar").
- **Tiers.** El usuario configura banco → tier (lista del banco). El adaptador asigna a cada variante un tier: Galicia por campos (`eminent`, `modeloAtencion.nombre`), Macro por convenciones de slug/título/tags (`macroselecta`, `Nivel 2/3`, `macroplatinum`). Señal no reconocida → anomalía en admin. Usuario sin tier configurado → variante base + "con tu nivel podrías tener más".
- **Categorías fijas (12)** elegibles para el digest: Supermercados · Gastronomía · Indumentaria y accesorios · Hogar · Electrónica · Salud y belleza · Viajes · Transporte · Combustible y autos · Entretenimiento · Niños, juguetes y librería · Mascotas y servicios. Galicia mapea por nombre en el adaptador; PlayDigital trae códigos numéricos sin diccionario → tabla de mapeo editable en admin. Código/nombre sin mapear → "Otros" (no elegible) + anomalía.
- **Todos los tipos de oferta** (descuento, reintegro, cuotas); el ranking los ordena.
- **Publicación automática** de lo que un adaptador validado mapea completo; la revisión es del adaptador (anomalías), no beneficio por beneficio. El admin permite ocultar un beneficio puntual.
- **Digest diario y conciso**, por categorías elegidas. Por categoría: hasta 3 ítems; si hay más, "y X más en {categoría}: mirá la app o pedime la lista". Ranking: descuento/reintegro antes que cuotas → mayor % → mayor tope (desconocido al final). Variantes de una misma campaña cuentan como uno.
- **Agente:** "quiero comprar X hoy" busca por marca (con alias) **o** por categoría ("ropa" → todas las marcas de Indumentaria), con las mismas reglas que la app y el digest. Sólo responde con resultados de la herramienta.
- **Fuera de v1:** personalización por gastos, ciudad/sucursales, seguimiento de marcas por el usuario, otros adaptadores (browser/LLM), bancos sin auditar.

## Modelo

| Entidad | Contenido |
| ------- | --------- |
| **Marca** | nombre canónico, nombre normalizado, alias; creada automáticamente por los adaptadores; merge/alias manual en admin. Opcional: hay campañas sin marca ("comercios adheridos", "supermercados de Córdoba"). |
| **Campaña** | marca?, categorías[], oferta (tipo, %bps, cuotas), tope(s) y mínimo (con estado conocido/desconocido), días, vigencia, canales, requisitos (árbol `Requirement` existente: bancos, tipo/red de tarjeta, tier, MODO), `familyKey` para agrupar variantes por tier, estado (publicada/vencida/retirada/oculta), advertencias. |
| **Listing** | campaña, fuente, id externo (`promo_id`/`id`), slug, URL de verificación, categoría cruda, registro crudo (jsonb), visto por última vez. Una campaña puede tener varios listings (misma promo en MODO y en el hub de Macro, o Galicia propio + MODO). |
| **Corrida de adaptador** | fuente, banco, inicio/fin, resultado, totales, mapeados, sin mapear, anomalías (valores nuevos, conteo vs corrida anterior, cambios de forma). |
| **Mapeo de categorías** | fuente + código crudo → categoría fija. |
| **Tiers** | por banco: lista de tiers (código, etiqueta como la usa el banco) y reglas de detección por adaptador. |
| **Perfil del usuario** | bancos con su tier, tarjetas (tipo/red por banco), billeteras (MODO), categorías para el digest. |

**Merge de campañas:** mismo id externo en la misma plataforma = misma campaña (las "Sistémica" de PlayDigital aparecen en cada banco: una campaña con requisito "cualquiera de estos bancos"). Entre plataformas distintas: marca + oferta + días + vigencia + tier iguales; si difieren, campañas separadas agrupadas por marca.

**Ciclo de vida:** catálogos completos → retiro por ausencia en 2 corridas completas separadas ≥ 24 h; vencimiento por fecha en consulta; corridas fallidas o con conteo anómalo no retiran nada.

## Enmienda v1 (31/10/2026, aprobada por el usuario)

- **Campaña = registro de la fuente** (1:1 por `source + external_id`). PlayDigital colapsa duplicados entre bancos por `promo_id`. Sin merge entre fuentes ni `familyKey` en v1: Galicia propio y Galicia vía MODO pueden duplicarse. App y digest agrupan por marca; variantes de nivel por marca + vigencia (aproximado). Se mide la duplicación antes de implementar el merge.
- **Presencia por banco** en tabla propia (campaña × banco) con último visto y faltante desde; el retiro es por banco y la campaña se retira cuando no queda ningún banco.
- **Visto ≠ mapeado:** la ausencia se juzga sobre todos los ids observados; un registro que no se pudo mapear se guarda como no publicable, nunca se retira por eso. Retiro sólo con corrida completa y conteo coherente con el total de la fuente.
- **Niveles conservadores:** Galicia Cross = todos; Masivo, Eminent, Eminent Black explícitos. Macro sólo con evidencia contextual (`selecta` + nivel, `macroplatinum`, private bank); señales no reconocidas → requisito incompleto, nunca "todos".
- **MODO como requisito** sólo si la fuente lo indica (flujo de pago), no por venir de PlayDigital.
- **Vencimiento** derivado en consulta (no un estado persistido).

## Qué se reutiliza y qué se elimina de v2

- **Se conserva:** evaluador ternario y `Requirement`/`CardSelector` (`rules/**`), dinero en centavos y bps, guard de admin por rol Clerk, base del panel admin y de los server functions, `argentina-time`, patrón de fixtures y tests de reproducción.
- **Se reemplaza:** catálogo estático de 17 proveedores, `harvest.ts` + extractor LLM, `store.ts` con revisiones/staging, `verify`/`review` CLIs (pasan a `benefits:adapter run <fuente> [--bank] [--dry-run]`), tablas `benefits`/`benefit_revisions`/`benefit_sources` (v2 no está en prod: migración destructiva).
- **Se elimina:** agente extractor, prompts, manual perks.

## Panel admin (explorador completo)

- **Fuentes y bancos:** cobertura por banco (auditoría), última corrida, totales, anomalías, botón de correr en seco.
- **Campañas:** búsqueda por texto/marca/categoría/banco/tier/estado; detalle con listings, registro crudo, enlace de verificación, requisitos legibles; ocultar/mostrar.
- **Marcas:** lista, alias, merge.
- **Mapeos:** códigos de categoría sin mapear y asignación; señales de tier no reconocidas.

## Fases

0. **Auditoría y mapeos iniciales** (sin código de producto): confirmar Macro = (a); muestrear códigos de categoría de PlayDigital y proponer el mapeo inicial; catálogo de tiers de Galicia y Macro con evidencia; listado de nombres de categoría de Galicia → categorías fijas.
1. **Ingesta:** modelo + migración, adaptador PlayDigital (todos los bancos MODO + hub de Macro) y Galicia propio, corridas con anomalías, merge de campañas, CLI `benefits:adapter`, fixtures reales y tests de reproducción.
2. **Admin explorador** sobre el modelo nuevo (incluye mapeos y marcas).
3. **Consumo:** perfil (bancos/tier/tarjetas/categorías), API de búsqueda para app y agente, digest diario nuevo, herramientas del agente (buscar por marca o categoría).
4. **App:** listado y configuración de tier (diseño en curso por el usuario) + entrega a prod.

Cada fase cierra con suite completa, `fallow:audit`, gate y commit con OK del usuario.

## Riesgos

- Endpoints no documentados: pueden cambiar o cerrarse. Mitigación: corrida diaria con alertas de conteo/forma, fixtures por adaptador, backoff, sin evadir protecciones.
- Volumen: PlayDigital sin filtro ~16k registros (mayoría Sistémicas repetidas por banco); Galicia ~2,2k; Macro ~6,2k únicos. El digest y la app dependen del ranking y del límite por categoría.
- Galicia: texto de oferta a parsear ("20% de ahorro y hasta 18 cuotas sin interés"); patrones no reconocidos → anomalía.
- Tiers de Macro detectados por convención de texto: frágil; cobertura medida en admin.
- Categorías PlayDigital sin diccionario: mapeo manual inicial y mantenimiento.

## Preguntas abiertas

- Cobertura v1 (decidido 31/10/2026): promos MODO de todos los bancos; catálogo propio sólo Galicia y Macro. Catálogos propios de otros bancos (BBVA, Santander…) quedan para después de auditarlos.
- Diseño de la app: PRD para diseño en `docs/specs/benefits-prd.md`.
