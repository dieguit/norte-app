# Norte — Handoff de gestión de beneficios

Versión 1.0 · 29 de octubre de 2026 · Destinatarios: producto, desarrollo y QA

## 1. Objetivo y alcance

Implementar en Norte un catálogo de beneficios de Argentina que permita al usuario declarar sus tarjetas, billeteras y membresías, y encontrar descuentos que puede aprovechar, con requisitos, días, topes y forma de pago claros. El sistema debe mantener las promociones mediante recolección de fuentes oficiales y distinguir una coincidencia confirmada de una que requiere datos adicionales.

El alcance incluye **todos los bancos, billeteras, membresías y redes del relevamiento**, además de sus seis ejemplos de promociones. No se reduce al subconjunto sugerido originalmente como primera ampliación. La implementación puede dividirse en entregas; una fuente pendiente debe figurar explícitamente como pendiente y no simular cobertura.

Este documento traduce el relevamiento compartido en la conversación, fechado el **26/10/2026**, a una propuesta de implementación. No se inspeccionó el repositorio ni se repitió la investigación en esta entrega. Los nombres actuales de funciones y contratos provienen de la descripción del usuario; rutas nuevas, estructuras y endpoints son propuestas que deben ajustarse al proyecto real. Las promociones citadas son referencias fechadas, **no seeds automáticamente publicables como vigentes**.

### Resultados esperados

- Configurar instrumentos y atributos de elegibilidad sin pedir números de tarjeta ni credenciales bancarias.
- Consultar beneficios propios y filtrar por comercio, categoría, fecha, ubicación y medio de pago.
- Entender qué combinación se necesita y cómo usarla.
- Actualizar datos sin perder beneficios válidos por un error de descarga o extracción.
- Reutilizar el mismo matching desde la app, el digest existente y el agente de WhatsApp.
- Tener trazabilidad desde cada condición estructurada hasta la fuente oficial.

### Fuera de alcance de esta entrega

Contratación de tarjetas o membresías, pagos, activación automática de cupones, acceso a cuentas privadas, canje de puntos, detección automática del reintegro real y control del tope consumido por usuario. El catálogo debe poder describir esas condiciones, pero no afirmar que las ejecuta ni que conoce su consumo. Tampoco se incorpora envío proactivo por WhatsApp sin una configuración de consentimiento y frecuencia existente o definida por separado.

## 2. Estado actual informado

El esquema compartido vive en `packages/shared-types/src/benefits.schema.ts`.

| Concepto             | Contrato informado                                                                      |
| -------------------- | --------------------------------------------------------------------------------------- |
| Redes                | `visa`, `mastercard`, `amex`, `cabal`                                                   |
| Tipos de instrumento | `credit`, `debit`, `prepaid`, `membership`                                              |
| Tipos de proveedor   | `bank`, `network`, `wallet`, `membership`                                               |
| Instrument           | `slug`, `label`, `network?`, `type`, `tier?`                                            |
| Source               | `url`, `strategy: json \| fetch`, `instructions`                                        |
| Provider             | `slug`, `name`, `kind`, `instruments`, `sources`, `appliesTo?: { network }`             |
| Preferencias         | `instrumentSlugs`; rechaza slugs desconocidos al guardar                                |
| Fuentes              | JSON bruto o HTML convertido a texto; corte a 60.000 caracteres; timeout de 15 segundos |
| Helpers              | `CATALOG`, `INSTRUMENTS`, `candidateInstruments(provider)`                              |
| Pipeline             | `runHarvest`, `harvest.script.ts`, `postProcess`, `findMatching`                        |

Proveedores existentes informados:

- `galicia`: `galicia-visa-credito`, `galicia-mastercard-credito`, `galicia-visa-debito`, `galicia-eminent-visa-credito`. Una fuente JSON cuya URL exacta no fue incluida.
- `visa`: sin instrumentos propios; `appliesTo: { network: 'visa' }`. Fuente de ofertas Visa; URL exacta pendiente de recuperar del código. La instrucción actual asigna promos de débito a Galicia Visa débito.
- `modo`: instrumento `modo` de tipo `membership`; tres fuentes del API de rewards: `destacados-1`, `supermercados-1`, `otras-promos-corriendo`. Recuperar URLs exactas del repositorio.

`BenefitsService.catalog()` omite proveedores sin instrumentos y devuelve campos opcionales como null y categorías. `candidateInstruments()` combina los instrumentos propios con los de la red indicada. `postProcess` descarta slugs fuera de ese conjunto. `findMatching` ignora preferencias históricas cuyo slug ya no existe y transforma slugs en etiquetas para la respuesta.

### Limitación a resolver

Una lista plana de instrumentos equivale normalmente a un OR. No permite expresar «una tarjeta Macro Selecta **y** MODO», «Mastercard crédito **y** PedidosYa Plus», restricciones de emisor o diferencias entre saldo en cuenta y tarjeta dentro de una billetera. Un texto libre de condiciones no alcanza para decidir elegibilidad.

## 3. Inventario completo de proveedores

Los slugs nuevos son propuestas de Norte. No son identificadores oficiales. `kind` organiza el catálogo por experiencia de uso y no pretende clasificar jurídicamente entidades. Macro Selecta pertenece a `macro`; no crear un proveedor bancario separado.

### 3.1 Bancos

| Slug          | Instrumentos o atributos a contemplar                                                                              | Fuentes oficiales de descubrimiento                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `galicia`     | Conservar cuatro slugs actuales; ampliar combinaciones de red y segmento sólo con evidencia                        | <https://www.galicia.ar/personas/buscador-de-promociones>                                                                                                             |
| `macro`       | Tarjetas generales; Selecta Visa Signature, Mastercard Black, Amex Icon y débito Selecta según producto verificado | <https://www.macro.com.ar/beneficios> · <https://www.macro.com.ar/selecta/beneficios> · <https://www.macro.com.ar/selecta/gourmet> · <https://www.macro.com.ar/modo-promos> |
| `santander`   | Tarjetas verificadas; membresía independiente `santander-sorpresa`                                                 | <https://www.santander.com.ar/personas/beneficios> · <https://www.santander.com.ar/personas/beneficios/sorpresa>                                                        |
| `bbva`        | Visa y Mastercard crédito; débito según producto; paquete y cuenta sueldo                                          | <https://www.bbva.com.ar/beneficios/> · <https://www.bbva.com.ar/personas/productos/programa-beneficios.html>                                                           |
| `nacion`      | Visa y Mastercard crédito; BNA+/MODO, saldo en cuenta y tarjeta como medios distintos                              | <https://www.bna.com.ar/Personas/promocionesdiasespeciales> · <https://www.bna.com.ar/Personas/BNAMas/PreguntasFrecuentesBNAmas>                                        |
| `provincia`   | Tarjetas Banco Provincia; Cuenta DNI separada                                                                      | <https://www.bancoprovincia.com.ar/cuentadni/index?url=cdniBeneficios>                                                                                                |
| `ciudad`      | Tarjetas verificadas; `buepp` separado; distinguir App Ciudad                                                      | <https://www.bancociudad.com.ar/beneficios/>                                                                                                                          |
| `credicoop`   | Cabal y otros productos sólo al verificarlos                                                                       | <https://www.beneficios.bancocredicoop.coop/>                                                                                                                         |
| `supervielle` | Tarjetas; atributo de Plan Sueldo                                                                                  | <https://www.supervielle.com.ar/personas/beneficios/descuentos/buscador> · <https://www.supervielle.com.ar/personas/beneficios/descuentos/supermercados>                |
| `comafi`      | Tarjetas; segmento Único y convenio sueldo                                                                         | <https://www.promocionescomafi.com/>                                                                                                                                  |
| `brubank`     | Visa débito y crédito según catálogo verificado; planes por separado                                               | <https://www.brubank.com/beneficios> · <https://www.brubank.com/planes> · <https://help.brubank.com/es/collections/3832828-promociones-disponibles>                       |

### 3.2 Billeteras y planes

| Slug          | Instrumentos o atributos a contemplar                                                         | Fuentes oficiales de descubrimiento                                                                              |
| ------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `modo`        | Conservar `modo`; exigir además tarjetas y bancos participantes cuando corresponda            | <https://www.modo.com.ar/promos> más los tres endpoints existentes                                                 |
| `naranjax`    | Crédito NX; débito Visa; planes `naranjax-plan-turbo` y `naranjax-plan-epico`; saldo separado | <https://www.naranjax.com/promociones> · <https://www.naranjax.com/plan-turbo> · <https://www.naranjax.com/plan-epico> |
| `personalpay` | Cuenta/billetera y tarjeta prepaga separadas; nivel del usuario                               | <https://www.personal.com.ar/pay/beneficios>                                                                       |
| `uala`        | Prepaga y crédito separados; saldo según legales                                              | <https://www.uala.com.ar/promociones>                                                                              |
| `mercadopago` | Cuenta/billetera; tarjetas verificadas; cupón y reserva de beneficio                          | <https://www.mercadopago.com.ar/c/aniversarioqr> es ejemplo de campaña, no catálogo general estable                |

No inventar una red para la tarjeta propietaria de Naranja X: `network` puede quedar ausente. Modelar versiones Visa/Mastercard sólo si se verifica su existencia. No confundir marca de billetera con emisor de todos sus productos.

### 3.3 Membresías y suscripciones

| Provider propuesto | Instrumento                                   | Fuente oficial de descubrimiento                                                                                                                   |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ypf`              | `ypf-serviclub`                               | <https://www.serviclub.com.ar/> · <https://app.ypf.com/>                                                                                               |
| `shell`            | `shell-box`                                   | <https://shellbox.shell.com.ar/> · <https://www.shell.com.ar/conductores/descuentos-vigentes.html>                                                     |
| `axion`            | `axion-on`                                    | <https://www.axionenergy.com/beneficios-y-promociones/> · <https://www.axionenergy.com/legales/terminos-y-condiciones-programa-de-fidelidad-on-axion/> |
| `clarin365`        | `clarin365` y variantes verificadas           | <https://365.clarin.com/>                                                                                                                            |
| `club-lanacion`    | `club-lanacion` y niveles verificados         | <https://club.lanacion.com.ar/> · <https://club.lanacion.com.ar/todos-los-beneficios>                                                                  |
| `meli`             | `meli-plus`; separar planes tras verificarlos | <https://www.mercadolibre.com.ar/suscripciones/nivel-6>                                                                                              |
| `uber`             | `uber-one`                                    | <https://www.uber.com/ar/es/uber-one/>                                                                                                               |
| `pedidosya`        | `pedidosya-plus`                              | Descubrir catálogo público oficial; existe evidencia puntual en legales de Mastercard del apartado 4                                               |

Santander Sorpresa y planes NX se mantienen bajo sus proveedores de marca como instrumentos `membership`. Tener una tarjeta no implica tener una suscripción activa. App YPF, MODO QR y NFC son también canales de pago: instalar una app o tener una membresía no acredita una tarjeta elegible.

### 3.4 Redes de tarjetas

| Slug         | Configuración                                      | Fuente y restricciones                                                                                                                                              |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visa`       | Sin instrumentos; `appliesTo.network = visa`       | <https://www.visa.com.ar/promociones-visa.html> · Filtrar país, producto y emisor                                                                                     |
| `mastercard` | Sin instrumentos; `appliesTo.network = mastercard` | <https://www.mastercard.com/ar/es/personal/experience-mastercard/conozca-nuestras-ofertas-y-promociones.html> · Distinguir crédito, débito, prepaga, NFC y activación |
| `amex`       | Sin instrumentos; `appliesTo.network = amex`       | <https://www.americanexpress.com/es-ar/beneficios/promociones/index.php> · Verificar tarjetas de emisión directa y bancaria admitidas                                 |
| `cabal`      | Sin instrumentos; `appliesTo.network = cabal`      | <https://www.cabal.coop/personas/promociones> · Respetar emisores excluidos y restricciones de billetera                                                              |

El inventario queda compuesto por **28 proveedores únicos**: 11 bancos, 5 billeteras, 8 programas de membresías y 4 redes. Registrar un proveedor no habilita por sí solo sus fuentes ni certifica sus instrumentos.

## 4. Seis beneficios de referencia

Usar estos casos como fixtures de dominio fechados. Sólo publicar tras volver a consultar el detalle y sus legales. Importes en ARS; no extrapolar una campaña a meses siguientes.

### 4.1 YPF y Mastercard

El relevamiento informó 10% los lunes, compra mínima $35.000 y reintegro máximo $6.000 por tarjeta por semana, pagando desde App YPF con Mastercard crédito, débito o prepaga emitida en Argentina. Vigencia informada: 28/09–31/10/2026.

Fuente: <https://www.mastercard.com/content/dam/mccom/lac/ar/personal/experience-mastercard/conozca-nuestras-ofertas-y-promociones/pdf/tyc-descuentos-ypf.pdf>

Regla: instrumento Mastercard admitido AND país emisor AR; canal App YPF. No añadir ServiClub como requisito salvo que los legales lo exijan. El ejemplo inicial «20% los martes» no fue confirmado y no debe cargarse.

### 4.2 Macro Selecta Gourmet

El relevamiento informó 30% todos los días para Visa Signature, Mastercard Black o Amex Icon asociada a paquete Selecta, pagando con MODO desde App Macro o MODO, en restaurantes adheridos. Vigencia informada: 01/03/2026–31/03/2027. Existe tope acumulado por cuenta y mes, pero su importe quedó pendiente.

Fuente: <https://www.macro.com.ar/selecta/gourmet>

Regla: tarjeta Macro con combinación de red y nivel admitida AND segmento Selecta AND acceso MODO; canal habilitado. **Importe de tope desconocido no significa sin tope**. Mantener en revisión hasta completar requisitos esenciales y establecimientos.

### 4.3 Naranja X Plan Turbo

El relevamiento informó supermercados adheridos, 25% los martes, máximo $9.500 por semana, con plan activo y tarjeta crédito/débito NX. Vigencia pendiente de legales.

Fuente: <https://www.naranjax.com/plan-turbo>

Regla: tarjeta NX admitida AND membresía Turbo activa. No afirmar que Épico incluye automáticamente Turbo; comprobar relación entre planes. Revisar alcance exacto del tope y vigencia antes de publicar.

### 4.4 Naranja X Plan Épico

El relevamiento informó supermercados adheridos, 30% los martes, máximo $12.000 por semana, con plan activo y tarjeta crédito/débito NX. Vigencia pendiente de legales.

Fuente: <https://www.naranjax.com/plan-epico>

Regla: tarjeta NX admitida AND membresía Épico activa. Mantener separada de Turbo para no sumar ni duplicar beneficios de planes alternativos.

### 4.5 PedidosYa Mascotas y Mastercard

El relevamiento informó 25% los sábados, máximo $15.000 por tarjeta y mes, Mastercard **crédito** y PedidosYa Plus, pago online en comercios adheridos. Se reportó acumulable; conservar el alcance literal de esa condición, sin asumir compatibilidad con toda promoción. Vigencia informada: 12/09–31/10/2026.

Fuente: <https://www.mastercard.com/content/dam/mccom/lac/ar/personal/experience-mastercard/conozca-nuestras-ofertas-y-promociones/pdf/tyc-pedidos-ya-plus-descuento.pdf>

Regla: Mastercard crédito AND PedidosYa Plus activo. Mastercard débito o prepaga no califican.

### 4.6 ABC y Cabal

El relevamiento informó 20%, máximo $10.000 por cuenta y mes, tarjeta crédito Cabal de emisores participantes, excluyendo billeteras e intermediarios. Vigencia informada: 05/03–30/11/2026. No inferir días de aplicación ausentes en el resumen.

Fuente: <https://www.cabal.coop/personas/promociones/abc>

Regla: Cabal crédito AND emisor participante; excluir canales no admitidos. Hasta resolver la lista de emisores, no tratar cualquier Cabal como elegible.

## 5. Decisiones de modelado

### 5.1 Identidad de proveedor e instrumento

Mantener los cuatro enums actuales y los slugs existentes. El proveedor que publica no necesariamente emite el instrumento requerido. Separar `publisherProviderSlug` de los predicados de emisor.

Agregar a instrumentos, cuando se conozca, `issuerProviderSlug`, `issuerCountry`, `productLevel` y `segment`. Conservar `tier` por compatibilidad y documentar su traducción: Éminent/Selecta describen segmento comercial; Signature/Black/Icon describen niveles o productos. No usarlos como sinónimos.

Para cuentas y billeteras, mantener por ahora `membership` para acceso a la cuenta/app, con un atributo `usage: wallet_access | account_access | subscription | loyalty`. Distinguir el canal `account_balance` del pago con tarjeta. Esto evita ampliar el enum por compatibilidad; si el dominio existente ya distingue cuentas, reutilizarlo.

No crear el producto cartesiano de todos los bancos, redes, niveles y tipos. Dar de alta sólo combinaciones verificadas. Los slugs son estables; cambios de label no los alteran. Para retirar uno, marcarlo deshabilitado y mantener alias o migración explícita.

### 5.2 Preferencias del usuario

Conservar `instrumentSlugs` y añadir hechos asociados a cada instrumento o proveedor. Un usuario puede tener dos tarjetas del mismo banco y distintos niveles: un atributo global del banco no debe otorgar el nivel premium a ambas.

```ts
type UserBenefitProfile = {
  instrumentSlugs: string[];
  instrumentFacts: Record<
    string,
    {
      segment?: string;
      productLevel?: string;
      issuerCountry?: string;
      membershipStatus?: "active" | "inactive" | "unknown";
      membershipValidUntil?: string;
    }
  >;
  providerFacts: Record<
    string,
    {
      salaryAccount?: boolean; // undefined = no se sabe
      plan?: string;
      loyaltyLevel?: string;
    }
  >;
  location?: {
    country: "AR";
    provinceCode?: string;
    cityId?: string;
    cityLabel?: string;
    nearbyCityIds?: string[];
  };
};
```

Seleccionar explícitamente una membresía puede registrar estado activo autodeclarado. No implica validación con el proveedor. Planes excluyentes deben ser validados como tales sólo cuando exista evidencia. No interpretar ausencia de una respuesta como falso dentro de una selección ya declarada; ausencia de un instrumento en una lista completa de tenencias sí implica que el usuario no lo declaró.

### 5.3 Reglas de elegibilidad

Separar requisitos de tenencia de instrucciones para una compra. No exigir que el usuario ya haya seleccionado «pagar por App YPF» para mostrar una oferta que puede usar: mostrarla con ese paso. Si consulta una compra por canal incompatible, indicar que debe cambiar el canal.

```ts
type CardSelector = {
  instrumentSlug?: string;
  issuerProviderSlugs?: string[];
  excludedIssuerProviderSlugs?: string[];
  network?: "visa" | "mastercard" | "amex" | "cabal";
  types?: ("credit" | "debit" | "prepaid")[];
  productLevels?: string[];
  segments?: string[];
  issuerCountries?: string[];
};
type Requirement =
  | { allOf: Requirement[] }
  | { anyOf: Requirement[] }
  | { card: CardSelector }
  | { membership: { instrumentSlug: string; active: true } }
  | {
      providerFact: {
        providerSlug: string;
        key: "salaryAccount" | "plan" | "loyaltyLevel";
        values: (string | boolean)[];
      };
    };
```

Semántica: campos de un `CardSelector` se evalúan sobre **una misma tarjeta**. Listas dentro de un campo equivalen a OR; campos distintos equivalen a AND. Una exclusión de emisor prevalece sobre inclusión. No permitir que Visa de un banco y Mastercard Selecta de otro satisfagan partes de una única tarjeta requerida. `allOf`/`anyOf` vacíos son inválidos. Limitar profundidad y cantidad de nodos del árbol en validación.

`appliesTo.network` sigue siendo pista de descubrimiento de candidatos, no regla suficiente para publicar o asignar una promoción.

### 5.4 Beneficio normalizado

Persistir como mínimo:

| Grupo         | Campos propuestos y semántica                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Identidad     | `id`, `publisherProviderSlug`, `externalId?`, `merchantId?`, `merchantName`, `title`, `category` del enum actual          |
| Requisitos    | `eligibility: Requirement`, `eligibilityCompleteness`, restricciones no resueltas                                         |
| Oferta        | `offerType: discount                                                                                                      | cashback     | installments                                                    | points  | other`; porcentaje, importe fijo o cuotas según tipo; no tratar puntos como efectivo |
| Dinero        | Enteros en centavos ARS; moneda explícita; `minimumSpendMinor?`; `percentageBps?` en puntos básicos                       |
| Topes         | `caps[]` con monto, moneda, período, alcance y agrupación compartida; `capState: known                                    | none         | unknown`                                                        |
| Vigencia      | Fecha local inicial/final inclusiva, timezone, horario y días; admitir vigencia no conocida sin convertirla en ilimitada  |
| Compra        | Canales permitidos/excluidos; apps habilitadas; activación, cupón, compra mínima, productos y locales incluidos/excluidos |
| Territorio    | País, provincias, ciudades, locales o regla de cobertura; desconocido no equivale a nacional                              |
| Combinación   | Acumulabilidad `yes                                                                                                       | no           | unknown` y alcance textual; no sumar descuentos automáticamente |
| Evidencia     | `sourceId`, URL de detalle, URL de legales, evidencia por campo crítico, hash, fecha de extracción y verificación         |
| Ciclo de vida | `draft                                                                                                                    | needs_review | published                                                       | expired | withdrawn`, revisión/versionado y`lastSeenAt`                                       |

Distinguir fecha de descarga de verificación: sólo actualizar `verifiedAt` cuando se revalidaron requisitos esenciales, incluyendo legales. Un listado que conserva el título no revalida por sí solo el tope.

Topes soportados: por compra, día, semana calendario, mes calendario o campaña; alcance por tarjeta, cuenta, persona, banco o promoción según la fuente. Para períodos móviles, guardar duración y ancla; para semanas, inicio explícito. Si no está definido, mantener el dato desconocido y no estimar cupo disponible. Soportar varios límites simultáneos y un `sharedCapGroupId` para ofertas que consumen el mismo cupo.

La pertenencia a locales puede ser `all`, `explicit_list` o `unknown`. «Comercios adheridos» con lista desconocida no significa toda la cadena. Guardar enlaces/listas de adhesión como evidencia.

## 6. Matching y ranking

Crear un evaluador determinista; el modelo de extracción no decide qué beneficio recibe cada usuario. Resultado propuesto:

```ts
type BenefitMatch = {
  benefitId: string;
  eligibility: "eligible" | "ineligible" | "needs_information";
  availability: "available" | "upcoming" | "unavailable" | "unknown";
  matchedInstrumentSlugs: string[];
  missingFacts: string[];
  reasons: string[];
  requiredActions: string[];
  estimatedSavingMinor: number | null;
  estimateAssumptions: string[];
};
```

Evaluar primero estado y vigencia, después perfil y finalmente contexto de compra. Usar lógica ternaria: AND con algún falso da falso; todos verdaderos da verdadero; resto desconocido. OR con algún verdadero da verdadero; todos falsos da falso; resto desconocido. No convertir un atributo faltante en coincidencia positiva.

Mantener separadas elegibilidad y disponibilidad: una oferta puede corresponder al usuario y estar disponible el próximo martes. Una fecha fuera de campaña nunca es «próximamente». Usar `America/Argentina/Buenos_Aires` para fechas argentinas; límites inclusivos y franjas horarias explícitas.

Tarjeta de resultados: mostrar comercio, oferta, día, vencimiento, combinación necesaria, tope y cómo pagar. Si faltan atributos del usuario, mostrar «Confirmá tu plan/nivel»; si faltan datos de la fuente, no pedir al usuario que subsane esa falla. Ocultar de recomendaciones seguras beneficios con requisitos críticos sin resolver.

Orden por defecto: coincidencias confirmadas disponibles, luego próximas, luego las que necesitan información del usuario. Si no se conoce monto de compra, no presentar un ranking de «mayor ahorro» basado sólo en porcentaje. Ante consulta con monto, estimar únicamente descuentos monetarios comparables.

Para un porcentaje y una compra válida, el ahorro bruto es monto elegible × porcentaje; aplicar todos los topes conocidos. Sin ledger de consumos, mostrar «hasta X, suponiendo que no consumiste el tope». Si el tope existe pero no se conoce el importe, no dar una estimación neta como exacta. Una compra por debajo del mínimo no recibe ahorro; si no se conoce qué porción de la compra califica, pedir el dato o no estimar.

No deduplicar por comercio: campañas de distintos bancos o planes pueden tener condiciones distintas. No sumar descuentos acumulables sin una regla comprobada de composición y base de cálculo.

## 7. Recolección y calidad de fuentes

### 7.1 Configuración propuesta de Source

Conservar `url`, `instructions` y estrategias actuales. Añadir `id` estable, `enabled`, `status`, `parserVersion`, `coverage`, dominio permitido, configuración de paginación/detalles y metadatos de diagnóstico. Ampliar estrategia a `pdf` sólo mediante un extractor real de PDF; nunca pasar sus bytes a `htmlToText`.

Estados: `pending_discovery`, `pending_validation`, `active`, `degraded`, `blocked`, `disabled`. Cobertura: `full`, `partial`, `campaign_only`, `unknown`. Una fuente activa debe haber superado una cosecha de prueba con evidencia útil y legales enlazados cuando correspondan.

### 7.2 Pipeline

1. Seleccionar fuentes habilitadas; permitir filtrar por proveedor y fuente.
2. Descargar con timeout actual de 15 segundos por request, límites de tamaño y reintentos acotados para fallas transitorias. Respetar límites por dominio; no intentar sortear autenticación o bloqueos.
3. Validar HTTP, MIME y contenido útil. Detectar páginas de rechazo, challenge, login, app shell y JSON con error aunque devuelvan 200.
4. Descubrir paginación y detalles según adaptador de cada fuente; validar destinos y redirecciones. No ejecutar URLs arbitrarias propuestas por un modelo.
5. Extraer texto o JSON estructurado. Dividir por registros y conservar identificadores. El límite actual de 60.000 caracteres no debe cortar silenciosamente campañas ni legales: paginar, fragmentar o marcar ejecución parcial.
6. Resolver PDFs y condiciones de detalle. Si el PDF es imagen y no hay OCR validado, enviar a revisión.
7. Extraer a schema estricto con campos desconocidos explícitos. Validar tipos, slugs, enums, fechas, porcentajes, importes y consistencia de requisitos.
8. Construir candidatos determinísticamente, asociar evidencia, deduplicar y guardar staging.
9. Comparar con versión anterior; publicar sólo registros completos. Cambios materiales de elegibilidad o tope no deben reemplazar una versión con un dato incierto sin revisión.
10. Registrar cobertura y métricas; actualizar ciclo de vida según reglas siguientes.

Conservar la última versión válida ante fallas. No borrar ni retirar promociones por una cosecha fallida, bloqueada, vacía sospechosa o parcial. La expiración por fecha explícita sí ocurre aunque fallen las fuentes. Para vigencias sin fecha final, propuesta inicial: marcar datos stale después de 48 horas sin verificación y excluir de digest/recomendación después de 7 días; parámetros configurables. Ausencia en dos ejecuciones completas exitosas separadas por al menos 24 horas puede retirar una promoción si la fuente garantiza cobertura total. Fuentes parciales nunca disparan retiro por ausencia.

El estado `stale` se calcula sobre frescura; no equivale a «retirada» ni a «vencida». Si una fuente anuncia cancelación explícita, retirarla con evidencia aunque conserve una fecha final futura.

### 7.3 Registro de fuentes del relevamiento anterior

Estos estados describen pruebas informadas del 26/10, no validaciones nuevas ni garantías de scraping.

| Fuente                                                                                         | Observación heredada                                                | Trabajo de implementación                                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Galicia, MODO, Ciudad                                                                          | HTML accesible con pocos datos                                      | Recuperar endpoints del código existente o descubrirlos; validar JSON, paginación y detalle |
| Macro Selecta Gourmet                                                                          | HTML útil con requisitos y legales                                  | Adaptador fetch; completar topes, locales y posibles detalles                               |
| Macro general                                                                                  | Contenido y catálogo dinámico                                       | Medir cobertura; resolver endpoint o detalles                                               |
| Personal Pay                                                                                   | HTML parcial con beneficios                                         | Resolver niveles, paginación y legales                                                      |
| Ualá                                                                                           | Primeras promociones en HTML                                        | Resolver cargar más, tipos de tarjeta y detalle                                             |
| Credicoop                                                                                      | HTML con contenido                                                  | Validar cobertura y detalle                                                                 |
| Cuenta DNI                                                                                     | Listado básico                                                      | Seguir cada beneficio; resolver ubicación y restricciones                                   |
| Santander y 365                                                                                | Contenido insuficiente                                              | Descubrir datos o detalles; no habilitar landing vacía                                      |
| Shell                                                                                          | Descarga casi sólo título                                           | Descubrir fuente útil y legales                                                             |
| Naranja X y AXION                                                                              | Errores HTTP informados                                             | Reintentar de forma acotada y validar fuente                                                |
| App YPF                                                                                        | HTTP 200 con rechazo                                                | Clasificar bloqueo; buscar fuente pública oficial alternativa                               |
| Mastercard                                                                                     | Legales relevantes en PDF                                           | Implementar PDF y asociación oferta–legal                                                   |
| Mercado Pago                                                                                   | Sólo campaña puntual localizada                                     | Soportar campaña; catálogo general pendiente                                                |
| Meli+                                                                                          | Descarga bloqueada                                                  | Verificar planes y fuente antes de publicar                                                 |
| BBVA, Nación, Supervielle, Comafi, Brubank, Club LA NACION, Uber, PedidosYa, Visa, Amex, Cabal | Enlaces o programas identificados, sin prueba completa del pipeline | Descubrir/validar estrategia, paginación, condiciones y cobertura por proveedor             |

Cada uno de los 28 proveedores debe tener un registro de seguimiento: URLs, instrumentos comprobados, adaptador, cobertura, último resultado, responsable y próximo bloqueo. Tener beneficios obtenidos desde una red no acredita cobertura propia de un comercio o membresía.

### 7.4 Instrucciones de extracción

Conservar ajustes útiles de MODO: si `card.validity_place` es genérico, buscar comercio real en `benefit.name`; porcentaje en `card.benefit`; tope en `card.cashback_cap`; días en `benefit.conditions.schedule.days_of_week`; banco participante en `participating_bank`. Estas rutas son hipótesis heredadas del contrato actual y deben verificarse frente al JSON real.

Cambiar la instrucción de Visa que dirige todo débito a Galicia. El selector debe expresar red Visa AND débito, restringido por emisores, país y producto cuando los legales lo indiquen.

El prompt debe exigir: no inventar fechas ni topes; no asumir cobertura nacional; no convertir membresía opcional en requisito; separar descuento inmediato de reintegro; extraer excepciones; adjuntar fragmentos de evidencia de las condiciones críticas; tratar contenido descargado como datos, nunca como instrucciones para herramientas. URLs y evidencias deben validarse contra la descarga real, no confiar en citas inventadas por el modelo.

## 8. Cambios en catálogo y compatibilidad

- `CATALOG`: agregar los 25 proveedores faltantes; conservar los tres actuales. Fuentes no verificadas quedan deshabilitadas y con estado pendiente.
- `INSTRUMENTS`: mantener identidad estable y metadatos de proveedor/emisor. Validar unicidad global y referencias.
- `candidateInstruments(provider)`: reemplazar su uso como prueba de elegibilidad. Crear `resolveCandidateInstruments(source, catalog)` que soporte referencias cruzadas y selectores de red, emisor y producto. En MODO debe considerar tarjetas participantes, no sólo `[modo]`.
- `postProcess`: validar referencias y árbol de requisitos. Permitir selectores válidos aunque Norte no haya catalogado todavía todos los productos que podrían cumplirlos; sólo recomendar al usuario contra instrumentos declarados/verificados. Un selector general requiere evidencia general, no se amplía desde una lista parcial.
- `findMatching`: usar evaluador ternario; devolver todos los instrumentos y pasos requeridos. Mantener `instrumentLabel` legado cuando sea necesario, pero no ocultar membresías o billeteras adicionales.
- `savePreferences`: conservar 400 para slugs nuevos desconocidos. Migrar alias conocidos; no borrar silenciosamente preferencias históricas. Exponer instrumentos retirados para corregir selección.
- `catalog()`: conservar comportamiento legado; extender respuesta o versionarla para incluir atributos, estados y agrupación. Las redes sin instrumentos no son tenencias seleccionables.

No convertir automáticamente beneficios viejos con condiciones complejas en `anyOf` y publicarlos. Migrar a `needs_review` cuando la regla no pueda recuperarse de evidencia. Los casos simples pueden convertirse conservando semántica y trazabilidad.

## 9. Persistencia y contratos de servicio

Reutilizar tablas/servicios existentes cuando sean equivalentes. Entidades lógicas sugeridas: catálogo de proveedores e instrumentos, preferencias, beneficios y revisiones, fuentes, ejecuciones, registros de staging y evidencias. El catálogo estático puede continuar en código; no requiere un CMS para esta entrega.

Guardar `rulesVersion`, `catalogVersion` y versión del perfil para invalidar cachés. Upsert por identificador de origen estable; si no existe, usar una clave normalizada de campaña con emisor, comercio, oferta, requisitos y vigencia. En caso de colisión, revisar; no pisar campañas por un hash parecido. Beneficios repetidos en destacados y supermercados de MODO deben unificarse preservando procedencias. Distintas fuentes que describen la misma campaña se vinculan sin perder divergencias ni crear un tope independiente.

### API propuesta

Rutas orientativas; adaptarlas al API existente.

| Operación                   | Contrato                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /benefits/catalog`     | Proveedores seleccionables, instrumentos, atributos, categorías, versión y disponibilidad de cobertura      |
| `GET /benefits/preferences` | Perfil propio y versión; referencias retiradas si existen                                                   |
| `PUT /benefits/preferences` | Guardar selección y hechos válidos; validar referencias y combinaciones; control de versión                 |
| `GET /benefits`             | Búsqueda propia con categoría, comercio, fecha, provincia, canal y paginación; devolver matching y frescura |
| `GET /benefits/:id`         | Oferta, requisitos, evidencia pública, legales, instrucciones y restricciones                               |
| `POST /benefits/evaluate`   | Consulta con monto, comercio, fecha y canal; ranking y estimación con supuestos                             |
| Acción interna de harvest   | Ejecución por fuente/proveedor, dry run, staging, métricas y errores; autenticación administrativa          |

No exponer payloads crudos de fuentes ni datos de otros usuarios. Autorización por usuario en preferencias y consultas personalizadas. Validar URLs y bloquear destinos privados, protocolos no HTTP(S), redirecciones no autorizadas y tamaños excesivos en el recolector.

## 10. Experiencia de la app y WhatsApp

### Configuración

Pantalla «Tus tarjetas y beneficios»: buscar por banco, billetera o membresía; seleccionar instrumento; pedir segmento, plan o nivel sólo cuando cambie elegibilidad. Diferenciar «Tengo MODO» de «Tengo esta tarjeta». Permitir «No sé» en atributos. Explicar que agregar una suscripción es declarar que ya se tiene, no contratarla.

### Listado y detalle

Vista de beneficios propios con filtros y estados «Hoy», «Próximos días» y «Falta confirmar». Una tarjeta de resultado debe decir, por ejemplo, «30% con Macro Selecta pagando con MODO», no «30% con MODO». Detalle con tope y período, locales, compra mínima, activación/cupón, demora de reintegro si se conoce, vigencia, última verificación y enlace oficial.

Estado vacío diferenciado: sin instrumentos, sin promociones para filtros, cobertura todavía pendiente o error temporal. No mostrar «No tenés beneficios» cuando no hay cobertura de la fuente.

### Integración de canales

Exponer operaciones del mismo servicio a WhatsApp para consultas como «¿Dónde cargo nafta hoy?» o «¿Qué descuento tengo con mi Macro Selecta?». El agente puede leer el perfil y pedir un dato faltante; los cálculos y la elegibilidad salen del backend. No prometer descuentos desde conocimiento general del LLM.

Ejemplo de respuesta cuando hay evidencia vigente: «Tenés esta opción el lunes: 10% con Mastercard desde App YPF, compra mínima $35.000 y hasta $6.000 por tarjeta por semana. El tope disponible depende de lo que ya usaste». Usar cifras sólo de la consulta real; este texto no habilita el fixture histórico.

Permitir actualizar tenencias mediante las capacidades existentes de preferencias, con la misma validación que la app. El digest reutiliza matching, excluye ofertas vencidas, stale o incompletas y enumera todos los requisitos. Su entrega sigue la configuración existente; esta feature no define un nuevo canal de envío ni una frecuencia automática.

## 11. Plan de implementación

El orden es de dependencias técnicas, no una reducción del inventario.

| ID  | Entregable                                  | Criterio de aceptación principal                                                                                                 |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| B01 | Revisar código existente y mapear contratos | Identificar esquema, fuentes reales, almacenamiento, jobs, UI y digest; documentar diferencias con este handoff                  |
| B02 | Esquemas y catálogo versionado              | Enums y slugs previos compatibles; 28 proveedores registrados; referencias únicas; instrumentos nuevos respaldados por evidencia |
| B03 | Modelo de requisitos y perfil               | Soporta AND/OR, misma tarjeta, membresía, nivel, sueldo y desconocidos; schemas compartidos                                      |
| B04 | Matching determinista                       | Resultados reproducibles por perfil, fecha y contexto; sin ampliaciones implícitas por red                                       |
| B05 | Persistencia y migración                    | Revisiones y evidencia; migración idempotente; beneficios complejos previos a revisión; rollback documentado                     |
| B06 | Pipeline robusto                            | Staging, paginación, PDFs, controles de contenido, límites, dry run y conservación ante fallas                                   |
| B07 | Bancos del apartado 3.1                     | Para cada banco: instrumentos verificados, fuente operativa o bloqueo explícito, prueba de cobertura y legales                   |
| B08 | Billeteras del apartado 3.2                 | Para las cinco: distinguir tarjeta/saldo/plan; MODO con bancos cruzados; fuentes verificadas o pendientes visibles               |
| B09 | Membresías del apartado 3.3                 | Ocho programas más Sorpresa/planes NX representados sin duplicar proveedor; niveles y actividad separados                        |
| B10 | Redes del apartado 3.4                      | Cuatro redes; crédito/débito/prepaga y emisores restringidos; sin sesgo a Galicia                                                |
| B11 | Seis fixtures y pruebas de dominio          | Casos del apartado 4 cubiertos con negativos; ningún fixture histórico publicado por defecto                                     |
| B12 | API y preferencias                          | Endpoints adaptados, autorización, validaciones y compatibilidad del consumidor existente                                        |
| B13 | Configuración y exploración en app          | Selección, atributos, filtros, detalle y estados vacíos; requisitos completos y evidencias visibles                              |
| B14 | WhatsApp y digest                           | Misma elegibilidad que app; consulta y actualización por servicio; sin hechos inventados por el agente                           |
| B15 | Operación y salida                          | Métricas, ejecución programada, alertas de degradación, revisión y checklist de cobertura completo                               |

Cadencia inicial propuesta: harvest cada 24 horas por fuente, escalonado y con límite por dominio; expiración por fecha calculada en consulta y consolidada por job diario. Alertar tras dos fallas consecutivas o una caída anómala de cobertura. Ajustar umbrales con las primeras ejecuciones reales.

Publicar por feature flag. Habilitar fuentes individualmente después de validar. La entrega de software puede completarse con bloqueos externos documentados; la **cobertura completa del catálogo** sólo se considera completada cuando se resuelven los pendientes de todos los proveedores o se acuerda explícitamente su exclusión. No declarar «todo implementado» si sólo se registraron URLs.

## 12. Matriz de pruebas de aceptación

| Caso                                                     | Resultado esperado                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Usuario tiene MODO, pero no tarjeta Macro Selecta        | No elegible para Gourmet; no alcanza tener la billetera                 |
| Tiene Macro Selecta, sin acceso MODO declarado           | No presentar como listo para usar; explicar requisito faltante          |
| Tiene Macro, nivel desconocido                           | `needs_information`; preguntar nivel del instrumento                    |
| Tiene Visa genérica y Mastercard Selecta de otro emisor  | No combinar campos para simular una tarjeta elegible                    |
| Tiene Mastercard crédito sin PedidosYa Plus              | No elegible para promoción que requiere ambos                           |
| Tiene Plus y Mastercard débito                           | No elegible para caso exclusivo de crédito                              |
| Tiene NX sin plan                                        | No asignar Turbo/Épico                                                  |
| Cambia de Turbo a Épico                                  | Recalcular sin duplicar ahorro ni heredar planes sin evidencia          |
| Tiene una Visa débito de otro banco elegible             | Red Visa débito puede coincidir; no restringir a Galicia                |
| Cabal de emisor excluido, o pago por billetera prohibida | Rechazar la compra contextual; explicar emisor/canal                    |
| ABC no tiene lista de emisores resuelta                  | No afirmar elegibilidad por Cabal solamente                             |
| Tope conocido como existente, importe desconocido        | No mostrar «sin tope» ni ahorro neto exacto                             |
| Compra menor al mínimo                                   | Ahorro cero/no aplicable; explicar mínimo                               |
| Compra de $80.000 al 10%, máximo $6.000                  | Estimación máxima $6.000 con supuesto de cupo no consumido              |
| Dos ofertas comparten tope mensual                       | No crear dos cupos independientes ni sumar ahorro sin regla             |
| Domingo UTC pero lunes local, o viceversa                | Evaluar día argentino correctamente                                     |
| Último día y primer día fuera de campaña                 | Incluir hasta el fin local definido; luego excluir aunque falle harvest |
| Fuente HTTP 200 con rechazo o challenge                  | Ejecución bloqueada; conservar versión anterior                         |
| JSON parcialmente descargado o texto truncado            | Ejecución parcial; sin retiro por ausencia                              |
| Cero registros tras cambio de parser                     | Alerta y revisión; no baja masiva automática                            |
| Promo repetida en dos secciones MODO                     | Una campaña con ambas procedencias                                      |
| Mismo comercio, distintos planes o bancos                | Mantener variantes y requisitos diferentes                              |
| Preferencia histórica con slug retirado                  | Lectura compatible, aviso y migración explícita                         |
| Beneficio requiere localidad no declarada                | Pedir ubicación o mostrar restricción; no asumir todo el país           |
| Fuente sin revalidar por siete días                      | Excluir de recomendaciones/digest según TTL configurado                 |
| Fixture con vigencia 2026 consultado después de vencer   | No aparece como vigente; nunca renovar fechas automáticamente           |
| Usuario intenta modificar preferencias ajenas            | Acceso denegado                                                         |

Pruebas sugeridas: unitarias del motor de reglas y límites monetarios; fixtures sanitizados de JSON, HTML y PDF para los adaptadores; integración de migración, publicación y fallas; recorrido de app y WhatsApp contra el mismo perfil. Las pruebas no deben depender de ofertas vivas cambiantes. Usar reloj controlado para días, vigencias y frescura.

## 13. Operación y revisión

Por ejecución registrar proveedor/fuente, status, MIME, duración, páginas/bytes, cobertura, registros detectados, extraídos, válidos, publicados, en revisión y retirados; parser/modelo/prompt versionados y costo de extracción si está disponible. No registrar conversaciones o datos financieros personales para diagnosticar harvest.

Mantener una vía interna de revisión, inicialmente CLI o panel existente: listar diferencias, inspeccionar evidencia, aprobar/corregir/rechazar y desactivar fuente. No construir un backoffice completo si una herramienta interna cubre estas acciones. Correcciones manuales deben indicar autor, fecha y campos protegidos para que una cosecha no las borre silenciosamente.

La publicación automática se permite para registros que pasan validaciones y completitud; revisión humana para contradicciones, reglas sin resolver o cambios sospechosos. Guardar quién o qué validó cada revisión.

## 14. Pendientes concretos para comenzar

1. Recuperar del repositorio las URLs exactas de Galicia, Visa y MODO y contrastar payloads y validaciones actuales.
2. Confirmar dónde se persistirán reglas, evidencias y revisiones con la infraestructura existente.
3. Verificar instrumentos y atributos de los 25 proveedores agregados; no generar tarjetas no comprobadas.
4. Resolver tope de Macro Gourmet, vigencias y alcance de topes NX, emisores Cabal y establecimientos adheridos.
5. Validar todas las fuentes de las tablas; descubrir catálogos generales de Mercado Pago y PedidosYa o registrar cobertura parcial explícita.
6. Revalidar los seis ejemplos antes de cualquier publicación. Algunas vigencias informadas finalizan el 31/10/2026.

Estos pendientes no bloquean construir esquemas, matching, staging, UI y pruebas. Sí bloquean publicar como confirmados los registros afectados.

## 15. Definición de terminado

La feature tiene contratos compartidos, migración compatible, matching por combinación, app y canales coherentes, recolección con evidencia y recuperación ante fallas, y pruebas de los casos críticos. El registro cubre los 28 proveedores, con cada fuente validada o un pendiente identificable. Ninguna oferta con dato esencial desconocido aparece como garantizada; ninguna campaña histórica se publica por copiar un ejemplo. El equipo puede explicar para cada beneficio por qué corresponde a ese usuario, cómo usarlo y de dónde salió cada condición.

## 16. Ciudad del usuario y cobertura comercial

Este apartado incorpora la necesidad de evitar recomendaciones de locales que no existen o no participan en la ciudad del usuario. Es parte del alcance funcional: cumplir los requisitos de tarjeta no alcanza si la compra no puede realizarse en su ubicación.

### Selección de ubicación

Pedir ciudad y provincia una vez, con buscador de localidades y opción «Ahora no». Guardar un `cityId` canónico además de su nombre y provincia, para evitar localidades homónimas y variantes de escritura. Propuesta de implementación: reutilizar un dataset oficial de localidades argentinas validado por el equipo; no depender de geocodificar texto libre en cada consulta.

No pedir domicilio exacto ni GPS para esta entrega. La ubicación habitual alimenta app y digest. En búsqueda o WhatsApp el usuario puede elegir otra ciudad temporalmente, por ejemplo «Este fin de semana estoy en Córdoba», sin modificar su ciudad habitual salvo pedido explícito. Ofrecer ciudades cercanas como selección voluntaria; no asumir que todos los locales de una provincia son accesibles. Radio por coordenadas queda como ampliación posterior si resulta necesario.

### Tres dimensiones independientes

1. **Elegibilidad personal:** tarjetas, membresías, segmento y plan.
2. **Cobertura de la promoción:** dónde admite la campaña el uso del beneficio.
3. **Disponibilidad comercial:** dónde existe un local adherido o a dónde entrega el canal online.

Una promoción «nacional» puede aplicarse en cualquier local participante del país sin que haya uno en la ciudad elegida. Tener una cadena cerca tampoco demuestra que esa sucursal participa.

### Datos geográficos del beneficio

Agregar `redemptionMode: in_store | online | both`, restricciones territoriales, locales adheridos y cobertura de entrega cuando se conozca. Cada sucursal debe tener identidad, comercio, localidad/provincia, dirección pública si se dispone y evidencia de adhesión con fecha. Separar directorio de sucursales de la relación campaña–sucursal: no duplicar ni inferir adhesión de toda la cadena desde una sola sede.

Para online, guardar cobertura `national | explicit_areas | unknown` y restricciones de envío/producto. «Compra online» no significa automáticamente entrega nacional. Algunos servicios requieren consultar disponibilidad al indicar dirección; mostrar ese paso, sin pedir ni almacenar la dirección en Norte.

Fuentes posibles: locales incluidos en legales, listados de adheridos y buscadores oficiales de sucursales. Si no se pueden extraer, revisión manual trazable o cobertura desconocida. El modelo no debe inventar sucursales ni deducir presencia por popularidad de marca.

### Regla de disponibilidad geográfica

Ampliar la respuesta de matching con `geographicMatch: confirmed | excluded | unknown`, `matchedCityIds`, locales adheridos encontrados y razón. Evaluar límites provinciales, locales excluidos y vigencia de adhesión antes de afirmar coincidencia.

| Situación                                                      | Comportamiento                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Hay sucursal adherida confirmada en la ciudad                  | Mostrar en «En tu ciudad» con el local o lista de locales                                      |
| Sólo hay locales confirmados en otra ciudad                    | Excluir de recomendaciones locales; permitir explorar otra ubicación                           |
| Beneficio online con entrega confirmada a esa ciudad           | Mostrar en «Online»                                                                            |
| La marca existe en la ciudad pero se desconoce adhesión        | `unknown`; mostrar aparte como «Verificá locales adheridos»                                    |
| Campaña nacional sin directorio local suficiente               | No afirmar disponibilidad en esa ciudad; conservar cobertura desconocida                       |
| Usuario sin ciudad                                             | Mostrar online con cobertura nacional confirmada y pedir ciudad para personalizar presenciales |
| Promoción limitada a otra provincia                            | `excluded` aunque la cadena tenga una sucursal local                                           |
| Servicio online sujeto a dirección y sin cobertura comprobable | `unknown`; informar que debe comprobar disponibilidad en el servicio                           |

### Presentación y digest

Usar secciones «En tu ciudad», «Online» y una opción secundaria «Otros beneficios para verificar». No mezclar los desconocidos con recomendaciones confirmadas. Permitir cambiar ciudad y agregar localidades cercanas; nunca publicar en digest local un beneficio sin coincidencia geográfica confirmada. En WhatsApp, si se consulta «¿Dónde cargo nafta hoy?» sin ciudad habitual ni temporal, pedir la localidad antes de recomendar estaciones presenciales.

La configuración del beneficio debe poder expresar restricciones por sucursal aunque su fuente principal sea un banco o una red. Una lista incompleta de sucursales no prueba que una ciudad esté excluida: devuelve `unknown`; sólo una lista completa o exclusión explícita permite concluir ausencia.

### Aceptación adicional

- Un usuario en Salta no recibe como local una oferta exclusiva de un restaurante de CABA.
- Una cadena nacional sin sucursal adherida comprobada en Salta no se recomienda como confirmada allí.
- Un comercio online con entrega nacional comprobada puede mostrarse aunque no tenga local físico en Salta.
- Una provincia coincidente y una ciudad distante no bastan para coincidencia local.
- Un catálogo incompleto de sucursales no produce falsos negativos definitivos.
- Cambiar la ciudad temporal no sobrescribe el perfil habitual.
- App, digest y WhatsApp aplican los mismos criterios de cobertura y frescura.
