import type { Source } from './types';

export const comoFuncionaNorte: Source = {
  slug: 'como-funciona-norte',
  title: 'Cómo funciona Norte',
  summary:
    'Conceptos de Norte: margen, plan, objetivos, aportes reales, lugares de ahorro y hoja de ruta; qué mueve el progreso y qué no.',
  tags: ['norte', 'objetivos', 'plan', 'margen', 'aportes', 'hoja de ruta'],
  body: `# Cómo funciona Norte

Norte responde una pregunta: **¿voy camino a cumplir mis objetivos?**

El ciclo es: objetivos → plan → acciones reales → recalcular trayectoria → mostrar impacto → ajustar plan.

## Ingresos y gastos
- Pueden ser **recurrentes** (todos los meses, con fecha de fin opcional) o **únicos** (de una sola vez, en un mes).
- Cada uno tiene una **categoría**: hay categorías fijas y podés crear las tuyas.
- Los cambios a un recurrente aplican desde un mes en adelante; los meses anteriores no se reescriben.
- Se registran en pesos o en dólares.

## Margen
- **Margen = ingresos − gastos** del mes. Es una estimación de lo que te podría quedar, **no plata ahorrada**.

## Plan
- El plan es **qué porcentaje de tu margen querés dedicar a objetivos** y **cómo se reparte** entre ellos.
- La distribución entre objetivos activos siempre suma 100%.
- Es intención, no progreso: tener un plan no mueve el avance de ningún objetivo.

## Objetivos
- Tipos: colchón financiero, compra o gasto grande, jubilación u otro.
- Cada uno tiene nombre, monto objetivo, moneda (ARS o USD), prioridad y fecha deseada (opcional).
- **Disponibilidad**: si la plata tiene que estar disponible en cualquier momento o a partir de una fecha (largo plazo / al vencimiento).
- Norte calcula una **fecha estimada** según tu plan y la compara con la fecha deseada.
- Un objetivo se puede **pausar** (su parte del plan se redistribuye), **reanudar** o **completar**.

## Aportes reales: ahorro e inversión
- El **progreso real** de un objetivo sólo cambia cuando registrás un **ahorro** o una **inversión**.
- Una inversión puede tener un **rendimiento anual estimado** que Norte usa para proyectar.
- Si comprás dólares, se registran el monto en USD, los pesos gastados y el tipo de cambio.
- Cada aporte queda asociado a un **lugar de ahorro** (banco, billetera, broker, efectivo, etc.).

## Lugares de ahorro
- Son dónde está tu plata ahorrada. Podés ver sus movimientos y **transferir** entre ellos sin que cambie el progreso de tus objetivos.

## Hoja de ruta
- Une tu historia, hoy y lo que viene: cambios de ingresos o gastos, aportes, hitos y fechas estimadas de cada objetivo.

## Antes → Con este cambio
- Todo cambio importante (crear o editar objetivos, cambiar la distribución, pausar, completar, aportar) muestra primero el impacto **Antes → Con este cambio** y se aplica sólo si lo confirmás.
`,
};
