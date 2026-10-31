# PRD — Beneficios (v1)

Fecha: 31/10/2026 · Destinatario: diseño · Plan técnico: `docs/plans/benefits-v3.md`

## 1. Problema

Los bancos y MODO publican miles de descuentos (Galicia ~2.200 propios, Macro ~6.200, MODO ~16.000 registros entre todos los bancos), repartidos en buscadores distintos, con condiciones que cambian por día, tarjeta y nivel de cliente. La gente se olvida de usarlos o no sabe cuál le corresponde. Norte ya habla con el usuario por WhatsApp todos los días: puede recordarle los beneficios que **realmente** puede usar hoy y dejarle verificar cada uno en la fuente oficial.

## 2. Objetivos

- Que el usuario vea en segundos **qué beneficios tiene hoy** con sus bancos, su nivel y sus tarjetas.
- Que cada beneficio sea **verificable**: siempre hay un enlace a la fuente oficial.
- Que el aviso diario sea **corto** y útil, no una lista interminable.
- Que la información incompleta se muestre **como incompleta**, nunca como garantizada.

**No objetivos v1:** recomendaciones según gastos, filtrar por ciudad o sucursal, seguir marcas, comparar bancos que el usuario no tiene, contratar productos.

## 3. Alcance v1

- **Promos MODO:** de **todos los bancos** que operan con MODO (~30).
- **Catálogo propio del banco** (promos pagando con la tarjeta, sin MODO): sólo **Galicia y Macro** en v1. Para el resto de los bancos sólo vemos sus promos MODO.
- **Tipos de oferta:** descuento, reintegro y cuotas sin interés.
- **Superficies:** configuración (app), listado y detalle (app), aviso diario (WhatsApp), consultas al agente (WhatsApp).

## 4. Usuarios y casos

- **"Hoy voy al súper, ¿con qué pago?"** → abre la app o pregunta por WhatsApp.
- **"Quiero comprar ropa, ¿hay algo?"** → busca por categoría y ve todas las marcas con beneficio.
- **"¿Qué descuento tengo en Coto?"** → busca por marca.
- **Recordatorio diario** → recibe 1 mensaje con lo relevante de hoy en las categorías que eligió.

## 5. Conceptos (vocabulario para la UI)

| Concepto | Qué es | Ejemplo |
| --- | --- | --- |
| **Banco** | Entidad cuyas tarjetas o cuentas tiene el usuario. Cualquier banco de MODO; para Galicia y Macro también su catálogo propio. | Galicia, Macro, BBVA, Santander |
| **Nivel** | Segmento o tier del cliente en ese banco, con el nombre que usa el banco. Los beneficios pueden cambiar de % según el nivel. | Galicia Éminent; Macro Selecta, Platinum (lista final por banco: pendiente de relevamiento) |
| **Tarjeta** | Tipo y red de tarjeta del banco. | Galicia Visa crédito, Macro Mastercard débito |
| **MODO** | Billetera para pagar con QR; muchas promos exigen pagar con MODO. | "Uso MODO: sí/no" |
| **Categoría** | Una de 12 categorías fijas. | Supermercados, Gastronomía, Indumentaria y accesorios, Hogar, Electrónica, Salud y belleza, Viajes, Transporte, Combustible y autos, Entretenimiento, Niños/juguetes/librería, Mascotas y servicios |
| **Marca** | Comercio o cadena del beneficio. Puede no haber marca ("comercios adheridos"). | Coto, YPF, Starbucks |
| **Beneficio** | Oferta concreta: marca, % o cuotas, días, vigencia, requisitos, tope. | "20% en Coto los jueves con Galicia Visa, pagando con MODO" |
| **Variante** | Mismo beneficio con distinto % según nivel. Se muestran agrupadas. | Trescha: 30% Selecta / 20% Platinum |
| **Fuente** | Dónde se publica (MODO, buscador de Galicia). Un beneficio puede tener varias. | |

## 6. Datos disponibles por beneficio

El diseño debe contemplar que **algunos campos pueden faltar**:

| Campo | Siempre | A veces falta | Cómo mostrarlo si falta |
| --- | --- | --- | --- |
| Marca / título | ✓ | marca (campañas genéricas) | usar el título |
| Oferta (%, reintegro o cuotas) | ✓ | | |
| Días de la semana | casi siempre | | "todos los días" sólo si la fuente lo dice |
| Vigencia (hasta) | ✓ | desde | |
| Tope de reintegro (monto y período) | | Galicia nunca lo trae | "Tope sin confirmar" |
| Compra mínima | | Galicia nunca lo trae | "Mínimo sin confirmar" |
| Requisitos (banco, tarjeta, nivel, MODO) | ✓ | | |
| Canal (en el local, online, QR) | casi siempre | | |
| Dónde ("consultá locales adheridos") | a veces | | |
| Enlace de verificación | ✓ | | Galicia: abre su buscador + "Buscá «{marca}»" |
| Última actualización | ✓ | | |

## 7. Pantallas

### 7.1 Configuración — "Tus bancos y beneficios"

Lugar: Finanzas → Beneficios (ya existe un ítem en la navegación; hoy es una pantalla simple de casillas que se reemplaza).

1. **Bancos:** elegir de la lista de bancos de MODO (buscador, ~30). Galicia y Macro muestran además "incluye su catálogo propio"; el resto "sólo promos con MODO".
2. **Por banco:**
   - **Nivel:** lista con los nombres que usa el banco + "No sé". El texto explica que el nivel cambia algunos descuentos. En v1 sólo para Galicia y Macro (los únicos con niveles relevados); el resto de los bancos no pide nivel.
   - **Tarjetas:** crédito / débito y red (Visa, Mastercard, Amex…), múltiples.
3. **MODO:** "¿Pagás con MODO?" sí/no.
4. **Categorías del aviso diario:** elegir entre las 12 (mínimo 1 para activar el aviso).
5. **Aviso diario:** activar/desactivar (y el horario usa la configuración de avisos existente).

Reglas:

- Cobertura por banco visible y honesta: "promos MODO" o "promos MODO + catálogo del banco". Un banco con sólo MODO no debe dar a entender que mostramos todos sus descuentos.
- Guardar con validación clara; el aviso se activa al guardar (comportamiento actual).

### 7.2 Listado — "Beneficios"

- **Por defecto:** hoy, todas las categorías elegidas, sólo beneficios que el usuario puede usar.
- **Filtros:** día (hoy, mañana, esta semana), categoría (las 12), banco, búsqueda por marca. Al venir desde el aviso diario, llega con la categoría preseleccionada.
- **Orden:** descuentos y reintegros antes que cuotas; luego mayor %; luego mayor tope (sin confirmar al final).
- **Tarjeta de beneficio** (una línea principal + secundaria):
  - Marca · oferta ("20% de reintegro", "6 cuotas sin interés")
  - Con qué: banco + tarjeta + "pagando con MODO" si aplica
  - Días y vigencia ("jueves · hasta 30/11")
  - Tope o advertencia ("tope $15.000 por mes" / "Tope sin confirmar")
  - Etiqueta de variante si aplica ("Tu nivel: Selecta")
- **Agrupación:** variantes de un mismo beneficio (por nivel) se ven como uno, mostrando la del nivel del usuario. Si el usuario no configuró nivel: la variante base + "Con tu nivel podrías tener más".
- **Volumen:** puede haber cientos (Indumentaria es la categoría más grande). Contemplar paginación o carga incremental y conteo por categoría.

### 7.3 Detalle

- Oferta completa, marca, categoría.
- **Requisitos en lenguaje natural:** "Necesitás una tarjeta de crédito Visa de Galicia y pagar con MODO".
- Días, vigencia, canal, dónde.
- Tope y compra mínima (o advertencias).
- Otras variantes del mismo beneficio ("Con Selecta: 30%").
- **Verificación:** botón por fuente ("Ver en MODO", "Ver en Galicia"). Para Galicia, mostrar instrucción "Buscá «{marca}»" porque su buscador no tiene enlace directo.
- "Actualizado: hoy 03:00".
- Aclaración fija y breve: los bancos pueden cambiar condiciones; verificá antes de pagar.

### 7.4 Estados

| Situación | Qué ve el usuario |
| --- | --- |
| Sin bancos configurados | Invitación a configurar (no "no tenés beneficios") |
| Sin beneficios hoy en esa categoría | Mensaje + sugerencia de ver mañana o la semana |
| Nivel sin configurar | Aviso suave en listado y detalle |
| Datos desactualizados (fuente con fallas) | Aviso "La información de {banco} puede estar desactualizada" |
| Banco sólo con MODO | "De {banco} mostramos sus promos con MODO; su catálogo propio todavía no" |
| Banco fuera de MODO | No aparece en la lista |
| Banco sólo con MODO y el usuario no paga con MODO | Avisar que con ese banco sólo tenemos promos MODO, así que no verá beneficios |
| Error de carga | Error recuperable con reintento |

## 8. Aviso diario (WhatsApp)

- Un mensaje por día con las categorías elegidas. Sin beneficios relevantes → no se envía.
- Por categoría: hasta 3 beneficios; si hay más, "y X más en {categoría}". Cierre: "Mirá todos en la app o pedime la lista".
- Cada línea: marca · oferta · con qué · tope/advertencia. El enlace a la app lleva la categoría preseleccionada.

Ejemplo:

```
Beneficios de hoy 🧭
Supermercados
• Coto · 20% reintegro · Galicia Visa + MODO · tope $15.000/mes
• Jumbo · 20% · Galicia débito · tope sin confirmar
• Vea · 15% · Macro crédito
y 12 más en Supermercados
Gastronomía
• Starbucks · 20% · Visa sin contacto
Mirá todos en la app o pedime la lista: <link>
```

## 9. Agente (WhatsApp)

- "Quiero comprar ropa hoy" → beneficios de hoy en Indumentaria con sus bancos, mejores primero, y oferta de la lista completa.
- "¿Qué tengo en Coto?" → beneficios de Coto (hoy y próximos días).
- Si falta un dato del perfil que cambia el resultado (nivel), pregunta una vez.
- Nunca inventa beneficios: sólo los que devuelve la búsqueda. Siempre incluye cómo verificar.

## 10. Copy y tono

Español rioplatense con voseo, breve, sin jerga bancaria innecesaria. Usar el nombre del nivel como lo dice el banco. Evitar "garantizado", "seguro"; preferir "según {banco}" y "verificá antes de pagar".

## 11. Requisitos no funcionales

- Mobile first (la mayoría llega desde WhatsApp).
- Accesible: etiquetas, foco, contraste, lectores de pantalla en filtros y tarjetas.
- Consistente con el design system de Norte (`docs/design-system.md`).

## 12. Fuera de alcance (v1)

Personalización por gastos, ciudad/sucursales, seguimiento de marcas, catálogos propios de otros bancos, contratar productos, panel admin (interno, ya resuelto aparte).

## 13. Preguntas abiertas para diseño

1. ¿Configuración en una sola pantalla o flujo por pasos (banco → nivel → tarjetas)?
2. Listado: ¿agrupado por categoría o lista única con filtros?
3. ¿Cómo comunicar variantes por nivel sin saturar la tarjeta?
4. ¿Dónde vive el aviso "verificá antes de pagar" para que no sea ruido?
5. Niveles por banco: la lista definitiva llega con el relevamiento técnico (fase 0); diseñar para listas de 2 a 5 opciones.
