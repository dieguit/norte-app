# Beneficios v3 — auditoría fase 0

Fecha: 30/10/2026 · GET plano, UA `Mozilla/5.0 (compatible; NorteBenefitsBot/1.0)`, sin autenticación. Muestras locales (no versionadas) en `/tmp/opencode/benefits-spike/`.

## 1. PlayDigital (MODO)

- **Bancos:** `GET https://www.modo.com.ar/promos/api/rewards/v2/banks` → `banks[].{id,name}`. Ej.: Galicia `88d8705e-2dda-46f9-8411-bb4916af858e`, Macro `6a089c91-a7d3-4199-a578-2132a3733f69`, BBVA `049ad22b-c0f0-4733-be35-e31256801ce8`, Santander `167504f6-caaf-4ead-b65b-6e6695ae6209`.
- **Listado por banco:** `GET https://rewards-handler.playdigital.com.ar/slots/?slots=web-banco-hub-promos_corriendo&source=web_bank&banks=<uuid>&origin=web_bank&slot_info=false&limit=1000&page=<n>` → `data.cards`, `metadata.pagination.{page,total_pages,total_results}`. Totales: Macro 6.346 filas / 6.212 `promo_id` únicos (7 páginas); Galicia 2.242; BBVA 2.985; Santander 1.702. Sin filtro: 16.336 (las tarjetas no traen la lista de bancos → **usar loop por banco** y guardar la asociación banco↔promo).
- **Campos de la tarjeta de listado:** `promo_id`, `slug`, `title`, `promotion_type` (Comercio / Sistémica / Bancaria), `categories_whitelist.categories[].{map_category,sub_categories[]}`, `credit_list`, `debit_list`, `payment_flow`, `days_of_week`, `start_date`, `stop_date`, `where`, `search_tags`, `content.row[].text`. **Sin oferta estructurada** (0/20).
- **Detalle:** `GET https://rewards-handler.playdigital.com.ar/landing/<promo_id>` (lo usa macro.com.ar) → `promotion.{id,title,slug,days_of_week,start_date,stop_date,payment_flow,promotion_type}`, `trigger_params.{pct_promo_value, promo_value_type, cap_amount, cap_period, min_amount, debit_list, credit_list, installments}`, `sections.tyc.contents[].description` (legales HTML). Ej. JetsMART: 25% percent, `cap_amount=0`, `cap_period="day"`. Semántica de `cap_amount=0` no confirmada (¿sin tope o desconocido?).
- **Slots de la app MODO** (`modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-…`): oferta estructurada completa (`offer.outcomes.cashback`, `offer.limits.period_cap`, `offer.requirements.amount_range.min`, `offer.requirements.banks.list`, `benefit.conditions.payment_methods.methods[].{type,issuer}`), pero son selecciones curadas de 10. No sirven como catálogo.
- **Verificación:** `https://www.modo.com.ar/promos/<slug>` → 200.
- **Rate:** sin límites observados en pruebas secuenciales.

## 2. Macro

`macro.com.ar/beneficios` usa PlayDigital (`url_servicio_promociones`, `url_servicio_lista`, detalle `rewards-handler…/landing/`, categorías `map-handler.playdigital.com.ar/categories`, sucursales `map-handler…/stores`). Hay secciones aparte (`/macrobeneficios`, `/selecta/beneficio(s)`) sin API propia confirmada; las variantes Selecta aparecen dentro del hub.

## 3. Categorías PlayDigital

Diccionario: `GET https://map-handler.playdigital.com.ar/categories?limit=1000&page=0` (15 padres; subcategorías sólo como ids). Conteos sobre las 6.346 tarjetas de Macro:

| `map_category` | Etiqueta PlayDigital | Categoría fija | n |
| --- | --- | --- | --- |
| 0 | Todos | Otros | 147 |
| 1 | Mercados | Supermercados | 925 |
| 2 | Gastronomía | Gastronomía | 1.777 |
| 3 | Indumentaria y Accesorios | Indumentaria y accesorios | 681 |
| 4 | Farmacias, Perfumerías y Peluquerías | Salud y belleza | 458 |
| 5 | Estaciones de Servicios | Combustible y autos | 41 |
| 6 | Deportes | Otros | 36 |
| 7 | Hogar y Decoración | Hogar | 281 |
| 8 | Automóviles | Combustible y autos | 98 |
| 10 | Electro y Tecnología | Electrónica | 623 |
| 11 | Ferretería y Pinturerías | Hogar | 47 |
| 12 | Mascotas y Veterinarias | Mascotas y servicios | 37 |
| 13 | Jugueterías y Librerías | Niños, juguetes y librería | 116 |
| 14 | Turismo y Entretenimiento | por subcategoría: 7/31/57 → Viajes, 9/58 → Entretenimiento; resto Otros | 304 |
| 15 | Otros | Otros salvo subcategoría (11 incluye "Transporte") | 815 |

## 4. Categorías Galicia

`GET https://loyalty.bff.bancogalicia.com.ar/api/portal/personalizacion/v1/promociones/catalogo?criterioDeOrden=Cuotas&page=1&pageSize=3000` → `data.totalSize=2244`, `data.list[]`.

| `subtitulo` | n | Categoría fija |
| --- | --- | --- |
| Indumentaria | 772 | Indumentaria y accesorios |
| Hogar | 339 | Hogar |
| Electrónica | 209 | Electrónica |
| Salud y Bienestar | 191 | Salud y belleza |
| Gastronomía | 189 | Gastronomía |
| Entretenimiento | 167 | Entretenimiento |
| Viajes | 125 | Viajes |
| Supermercados | 78 | Supermercados |
| Vehículos | 55 | Combustible y autos |
| Juguetes | 53 | Niños, juguetes y librería |
| Librerías | 31 | Niños, juguetes y librería |
| Transportes | 9 | Transporte |
| Shopping | 8 | Indumentaria y accesorios |
| Mascotas | 6 | Mascotas y servicios |
| Combustible | 4 | Combustible y autos |
| Confitería, Bares | 1 c/u | Gastronomía |
| Peluquerías | 1 | Salud y belleza |
| Otros, Educación, Regalos | 3, 1, 1 | Otros |

## 5. Niveles (tiers)

**Galicia** (`modeloAtencion.nombre`): Cross 897, Masivo 769, Eminent 496, Eminent Black 82. Niveles de usuario: **Masivo, Eminent, Eminent Black**. `Cross` = disponible para todos (no es un nivel). Detección por valor exacto (Eminent Black antes que Eminent). `haberes=true` en 2 registros (flag de sueldo, semántica no confirmada); `pagoQR` 178 y `pagoNFC` 70 son canales. Variantes reales: Beauty 24 (`idMarca=3713`) 15% Eminent / 10% Masivo.

**Macro** (convención de texto en `slug`/`title`/`search_tags`, 23,2% de los registros): Selecta 1.028; Nivel 1–4 (12/120/122/108); Platinum 431; Black 17; Signature 7; Infinite 1. Niveles de usuario candidatos: **Selecta Nivel 1–4, Selecta (sin nivel), Platinum, Private Bank Black/Infinite**. `exclusiveness` y `promo_visibility` no codifican el nivel. Señales no reconocidas → anomalía.

**Otros bancos MODO:** sin señales de nivel en muestras de BBVA/Santander (muestra chica).

## 6. Texto de oferta de Galicia

Los 2.244 `promocion` caen en 4 plantillas:

| Plantilla | n |
| --- | --- |
| `Hasta # cuotas sin interés` | 1.082 |
| `#% de ahorro y hasta # cuotas sin interés` | 846 |
| `#% de ahorro` | 282 |
| `#% de ahorro y # cuotas sin interés` | 34 |

"Ahorro" no distingue descuento de reintegro. `leyendaDiasAplicacion`: 23 valores (Todos los días 1.383, Viernes 339, Sábado y Domingo 139, Jueves 98, rangos "Lunes a Miércoles", enumeraciones…). `fechaHasta`: `YYYY-MM-DDT00:00:00` sin zona.

## 7. Verificación Galicia

Buscador `https://www.galicia.ar/personas/buscador-de-promociones` (200). Sin ruta de detalle ni parámetro de búsqueda confirmados (`/buscador-de-promociones/<id>` → 404; detalle de API → 403). Usar buscador + "buscá «{marca}»" + id.

## Implicancias

- PlayDigital: listado por banco + detalle `/landing/<promo_id>` para oferta, topes, mínimo y legales. Volumen de detalles alto (miles): cachear por `promo_id` y refrescar sólo nuevos o cambiados.
- Categorías PlayDigital desde el diccionario vivo + overrides en admin; 14 y 15 por subcategoría.
- Niveles: Galicia por campo; Macro por regex con tasa de cobertura visible en admin.
