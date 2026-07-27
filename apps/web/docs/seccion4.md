---

# PRD corto — Nueva sección “4 · Qué es Norte”

## Objetivo de la sección

Reemplazar la sección actual “4 · Qué es Norte” por una sección más concreta, visual y orientada a producto.

La sección debe explicar brevemente qué hace Norte, mostrar sus funcionalidades principales agrupadas en dos bloques visuales y terminar con un CTA claro a lista de espera.

La intención no es explicar todo el producto, sino que el usuario entienda:

> Norte convierte tus ingresos, gastos, cuotas y decisiones en una hoja de ruta viva hacia tus objetivos.

---

# Estructura general

La sección tendrá 4 partes:

1. **Introducción narrativa breve**
2. **Bloque de funcionalidades 1 + imagen roadmap**
3. **Bloque de funcionalidades 2 + imagen WhatsApp / simulación**
4. **Pricing teaser + FOMO + CTA**

---

# Copy completo propuesto

## Eyebrow

```text
4 · Qué es Norte
```

## Título

```text
Esto que acabás de ver es solo una pequeña muestra.
```

## Introducción

```text
Tus objetivos son tuyos: construir un colchón, viajar, comprar un auto, tener una casa o planificar tu retiro. Norte se asegura de que no los pierdas de vista cuando tomás decisiones hoy.
```

```text
Hay demasiadas variables moviéndose al mismo tiempo —ingresos, gastos, cuotas, inflación, dólar e imprevistos— para recalcular todo cada vez que algo cambia. Norte lo hace por vos:
```

---

# Bloque 1 — Roadmap vivo

## Layout

Desktop / ancho amplio:

- Texto a la izquierda.
- Imagen del celular con roadmap a la derecha.

Mobile:

- Texto arriba.
- Imagen debajo.
- No forzar dos columnas en pantallas chicas.

## Imagen

Usar la imagen ya generada del celular con roadmap vertical central y eventos alternados.

La imagen debe comunicar:

- timeline mes a mes;
- ingresos en verde;
- gastos en rojo;
- hitos grandes;
- múltiples objetivos;
- logo de Norte como destino final del camino.

## Features del bloque

### Feature 1

```text
Tus finanzas se actualizan solas
```

```text
Incorpora tus ingresos, gastos y cuotas para que no tengas que registrar cada movimiento.
```

### Feature 2

```text
Todos tus objetivos, en una sola hoja de ruta
```

```text
Ves qué estás construyendo, cuánto avanzaste y cómo se conectan tus distintos objetivos.
```

### Feature 3

```text
Tu camino cambia cuando cambia tu vida
```

```text
Si aparece un gasto, cambia un ingreso o modificás una prioridad, Norte ajusta automáticamente tu hoja de ruta.
```

## Nota de tono

Este bloque debe sentirse como “la vista completa del plan”.
No hablar de “presupuesto por categorías” como feature central. El foco es roadmap, objetivos y actualización automática.

---

# Bloque 2 — Decisiones y WhatsApp

## Layout

Desktop / ancho amplio:

- Imagen a la izquierda.
- Texto a la derecha.

Mobile:

- Imagen debajo o arriba, según quede mejor visualmente.
- Mantener separación clara con el Bloque 1.

## Imagen sugerida

Crear o usar una segunda imagen que combine **WhatsApp + simulación simple**.

La imagen puede ser un mockup de celular o una tarjeta tipo conversación de WhatsApp con una mini-respuesta de Norte.

Ejemplo visual:

Usuario:

```text
Estoy por comprar una notebook en 6 cuotas. ¿Puedo?
```

Norte:

```text
Podés, pero retrasa el objetivo “Cambiar el auto” 2 meses.
Si la cuota queda debajo de $150.000, mantenés la fecha actual.
```

Debajo puede aparecer una mini card:

```text
Impacto estimado
Auto: Nov 2029 → Ene 2030
```

La imagen debe mostrar que WhatsApp no es un chatbot genérico: es una entrada al sistema financiero de Norte.

## Features del bloque

### Feature 4

```text
Podés probar antes de decidir
```

```text
Simulá qué pasa si hacés una compra, tomás cuotas, ahorrás más o aparece un gasto inesperado.
```

### Feature 5

```text
Podés preguntarle antes de gastar
```

```text
Escribile a Norte por WhatsApp y entendé qué impacto tendría sobre tus objetivos.
```

### Feature 6

```text
Recibí alertas inteligentes en tu WhatsApp
```

Copy recomendado:

```text
Norte te avisa cuando una decisión, un ingreso o un vencimiento puede cambiar tu plan.
```

Alternativas más suaves:

```text
Norte te avisa en los momentos clave, antes de que una oportunidad o un desvío se pierda entre los gastos del mes.
```

Más concreta:

```text
Cuando cobra sentido actuar —separar un ingreso, revisar una cuota o ajustar un gasto— Norte te lo recuerda a tiempo.
```

Mi recomendación para la primera versión:

```text
Norte te avisa cuando una decisión, un ingreso o un vencimiento puede cambiar tu plan.
```

Es corta, clara y conecta con WhatsApp.

---

# Cierre comercial

## Pricing teaser

```text
Todo esto por lo que cuesta una pizza al mes.
```

## FOMO / lanzamiento

```text
Estamos preparando el primer lanzamiento de Norte con cupos limitados.
```

## Texto de lista de espera

```text
Sumate a la lista de espera para ser de los primeros en acceder.
```

## CTA button

```text
Quiero ser de los primeros en usar Norte →
```

## Confirmación post-click

Mantener un mensaje simple:

```text
✓ ¡Registrado!
```

```text
Cuando Norte esté listo, te avisamos antes que a nadie.
```

Alternativa con más FOMO:

```text
✓ Ya estás en la lista
```

```text
Te vamos a avisar cuando se abran los primeros cupos.
```

Mi recomendación:

```text
✓ Ya estás en la lista
Te vamos a avisar cuando se abran los primeros cupos.
```

---

# Layout sugerido en HTML

## Estructura conceptual

```html
<section class="norte-cta">
  <p class="eyebrow">4 · Qué es Norte</p>

  <h2>Esto que acabás de ver es solo una pequeña muestra.</h2>

  <p class="intro">Tus objetivos son tuyos...</p>

  <p class="intro">Hay demasiadas variables...</p>

  <div class="feature-block feature-block-roadmap">
    <div class="feature-copy">
      <div class="feature-item">...</div>
      <div class="feature-item">...</div>
      <div class="feature-item">...</div>
    </div>

    <div class="feature-image">
      <img src="roadmap-phone.png" alt="Hoja de ruta financiera de Norte" />
    </div>
  </div>

  <div class="feature-block feature-block-whatsapp">
    <div class="feature-image">
      <!-- WhatsApp / simulación mockup -->
    </div>

    <div class="feature-copy">
      <div class="feature-item">...</div>
      <div class="feature-item">...</div>
      <div class="feature-item">...</div>
    </div>
  </div>

  <div class="pricing-box">
    <p class="pricing-title">Todo esto por lo que cuesta una pizza al mes.</p>
    <p class="pricing-sub">
      Estamos preparando el primer lanzamiento de Norte con cupos limitados.
    </p>
  </div>

  <button class="cta-btn">Quiero ser de los primeros en usar Norte →</button>

  <div class="cta-confirm">...</div>
</section>
```

---

# Requerimientos visuales

## Estilo

Debe mantener el estilo actual del informe:

- fondo crema;
- títulos en Lora;
- textos en Poppins;
- verde para progreso;
- navy para estructura;
- rojo solo para gasto / advertencia;
- cards con bordes redondeados;
- tono sobrio, no “fintech neon”.

## Feature items

Cada feature debería tener:

- ícono pequeño opcional;
- título corto;
- descripción de 1 línea o máximo 2;
- spacing generoso.

Ejemplo:

```html
<div class="feature-item">
  <div class="feature-icon">↻</div>
  <div>
    <strong>Tus finanzas se actualizan solas</strong>
    <p>
      Incorpora tus ingresos, gastos y cuotas para que no tengas que registrar
      cada movimiento.
    </p>
  </div>
</div>
```

## Íconos sugeridos

- Actualización automática: `↻` o ícono sync.
- Hoja de ruta: `⌁` / timeline / roadmap.
- Cambio de vida: `⚡` o ícono ajuste.
- Simulación: `⟷` o escenarios.
- WhatsApp antes de gastar: `?` / chat.
- Alertas: `!` / campana.

Mantenerlos simples. No usar emojis grandes si rompen el tono premium.

---

# Requerimientos responsive

## Desktop

A partir de `min-width: 720px`:

- usar layout en dos columnas;
- imagen ocupando aproximadamente 40–45%;
- texto ocupando 55–60%;
- alternar imagen derecha / izquierda entre bloques.

## Mobile

- mantener una sola columna;
- imagen debajo del texto en el primer bloque;
- imagen arriba o debajo en el segundo, según convenga visualmente;
- evitar que las imágenes superen el ancho del contenedor;
- no achicar demasiado los textos de los features.

---

# Copy final en bloque listo para implementar

```text
4 · Qué es Norte

Esto que acabás de ver es solo una pequeña muestra.

Tus objetivos son tuyos: construir un colchón, viajar, comprar un auto, tener una casa o planificar tu retiro. Norte se asegura de que no los pierdas de vista cuando tomás decisiones hoy.

Hay demasiadas variables moviéndose al mismo tiempo —ingresos, gastos, cuotas, inflación, dólar e imprevistos— para recalcular todo cada vez que algo cambia. Norte lo hace por vos:

Tus finanzas se actualizan solas
Incorpora tus ingresos, gastos y cuotas para que no tengas que registrar cada movimiento.

Todos tus objetivos, en una sola hoja de ruta
Ves qué estás construyendo, cuánto avanzaste y cómo se conectan tus distintos objetivos.

Tu camino cambia cuando cambia tu vida
Si aparece un gasto, cambia un ingreso o modificás una prioridad, Norte ajusta automáticamente tu hoja de ruta.

Podés probar antes de decidir
Simulá qué pasa si hacés una compra, tomás cuotas, ahorrás más o aparece un gasto inesperado.

Podés preguntarle antes de gastar
Escribile a Norte por WhatsApp y entendé qué impacto tendría sobre tus objetivos.

Recibí alertas inteligentes en tu WhatsApp
Norte te avisa cuando una decisión, un ingreso o un vencimiento puede cambiar tu plan.

Todo esto por lo que cuesta una pizza al mes.

Estamos preparando el primer lanzamiento de Norte con cupos limitados. Sumate a la lista de espera para ser de los primeros en acceder.

Quiero ser de los primeros en usar Norte →
```

---

# Criterio de aceptación

La implementación se considera correcta si:

- La sección reemplaza el bloque actual “4 · Qué es Norte”.
- El texto introductorio conserva el tono emocional del informe actual.
- Las funcionalidades aparecen como bullets/cards breves, no como párrafos largos.
- El primer grupo de features se muestra junto a la imagen del roadmap.
- El segundo grupo se muestra junto a una imagen de WhatsApp / simulación.
- El CTA queda visible al final.
- El pricing teaser aparece antes del botón.
- La sección funciona bien en mobile.
- No se promete una versión, beta o roadmap interno; se comunica Norte como producto.
- El tono sigue siendo claro, humano y no excesivamente técnico.
