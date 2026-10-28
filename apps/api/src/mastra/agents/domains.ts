import { createSkill } from '@mastra/core/skills';
import type { NorteServices } from '../services';
import { createFinanceTools } from '../tools/finance-tools';
import { createContributionTools, createGoalTools } from '../tools/goal-tools';
import { createRoadmapTools } from '../tools/roadmap-tools';
import { createNotificationTools } from '../tools/notification-tools';
import { createSourceTools } from '../tools/source-tools';
import { sourcesIndex } from '../sources';

const ATTACHMENT_RULES = `Imágenes y PDFs (tickets, facturas, resúmenes de tarjeta, comprobantes):
- Leé el adjunto y extraé los movimientos: monto, moneda, concepto y fecha si figura (usala para el mes; si no, aplicá los defaults).
- Con una orden explícita ("agregá esto a los gastos", "anotá el ticket"): ejecutalo directo, sin pedir confirmación, con los defaults y reglas de categoría de siempre. Varios movimientos (ej. resumen de tarjeta) se registran como orden en lote.
- Sin texto o sin orden clara: interpretá qué es y proponé la acción en un mensaje corto (ej. "Es un ticket de Coto por $12.500, ¿lo anoto como gasto en Supermercado?"; en un resumen, total y cantidad de movimientos). Ejecutá sólo cuando el usuario acepte.
- Si no se lee bien, falta el monto o no es algo financiero, decilo y preguntá; nunca inventes montos.`;

const NOTIFICATIONS_RULES = `Notificaciones (chequeo diario de cierre del día, tipo day_close_checkin):
- Para activarlo, desactivarlo o cambiar el horario usá getNotificationSettings y updateNotificationSetting, directo y sin pedir confirmación. Los horarios son siempre hora de Argentina, en punto o y media (ej. 21:00, 21:30). Si pide otro horario (ej. 21:15), explicalo y proponé el más cercano. Si lo activa sin decir horario, mantené el configurado y decile cuál quedó.
- Cuando el usuario responde al chequeo diario ("Paso por nuestro chequeo diario 🧭"):
  - Si manda movimientos, registralos con las reglas de siempre (moneda, monto y categoría obligatorios) y respondé: "🫡, te paso resumen del día?".
  - Si responde "Listo" o que no hubo nada más, respondé: "Cerramos el día. Hasta mañana!🧭".
- Si pide el resumen del día o acepta que se lo pases, usá getDailySummary y resumí en pocas líneas ingresos, gastos y aportes de hoy con totales por moneda.`;

const SOURCES_RULES = `Consejos y explicaciones:
- Si preguntan qué podés hacer, qué hace Norte o cómo hacer algo en la app o por WhatsApp, leé que-hace-norte.
- Para consejos, educación financiera o "cómo funciona X", primero leé la fuente que corresponda con readSource y basá tu respuesta en ella. Mencioná el título de la fuente (y el link si tiene).
- Podés combinar la fuente con los datos del usuario que obtengas con las herramientas.
- Si ninguna fuente cubre la pregunta, decilo y limitate a una orientación general. Nunca presentes conocimiento general como si viniera de las fuentes de Norte.

Fuentes disponibles:
${sourcesIndex()}`;

export function createDomains(
  services: NorteServices,
  stores: Parameters<typeof createFinanceTools>[1],
  webAppUrl?: string,
) {
  return {
    finances: {
      skill: createSkill({
        name: 'finances',
        description: 'Ingresos, gastos, categorías y adjuntos',
        instructions:
          `Qué herramienta usar:
- Ingresos y gastos (registrar, consultar, cambiar, borrar): getFinancesSummary, listCategories, recordExpense, recordIncome, updateExpense, deleteExpense, updateIncome, deleteIncome. Para editar o borrar, buscá el id con getFinancesSummary. Para la categoría elegí siempre de las categorías del usuario: vienen en este contexto como "Categorías del usuario"; si no aparecen, llamá a listCategories antes de elegir. Reutilizá una categoría fija o propia existente si es clara. Nunca elijas Sin categoría ni inventes categorías por tu cuenta. Si no hay coincidencia clara o dudás, hacé una pregunta corta antes de registrar. Usá { kind: 'custom', name } sólo si el usuario pide o aprueba explícitamente crear una categoría nueva. Los cambios a recurrentes aplican desde el mes actual salvo que el usuario diga otro.` +
          '\n\n' +
          ATTACHMENT_RULES,
      }),
      tools: { ...createFinanceTools(services, stores) },
    },
    goals: {
      skill: createSkill({
        name: 'goals',
        description: 'Objetivos, aportes y hoja de ruta',
        instructions: `Qué herramienta usar:
- Hoja de ruta, "¿voy bien?", "¿cuándo llego a mi objetivo?": getRoadmap. Resumí lo importante y sumá el link a la app.
- Objetivos (crear, editar, pausar, reactivar, completar, cambiar la distribución o el % dedicado): primero listGoals y getGoalPlan (o getGoalCompletionContext para completar), después la herramienta preview correspondiente. Los defaults de creación son ARS, prioridad media, ahorro, disponible ya; pedí sólo nombre, monto objetivo y fecha deseada si faltan. Mostrá el impacto en las fechas sólo si estás pidiendo confirmación o el usuario pide el detalle; en ejecución directa inspeccionalo internamente.
- Plata que el usuario realmente ahorró o invirtió ("ahorré", "invertí", "compré dólares"): getContributionContext y después previewSaving. Si el usuario tiene un único lugar de ahorro se usa automáticamente (aclaralo sólo si estás pidiendo confirmación o el usuario pregunta). Es lo único que mueve el progreso real de los objetivos; un plan o un margen estimado no cuentan como ahorro.`,
      }),
      tools: {
        ...createGoalTools(services, stores),
        ...createContributionTools(services, stores),
        ...createRoadmapTools(services, webAppUrl),
      },
    },
    notifications: {
      skill: createSkill({
        name: 'notifications',
        description: 'Chequeos diarios y notificaciones',
        instructions: NOTIFICATIONS_RULES,
      }),
      tools: { ...createNotificationTools(services) },
    },
    advice: {
      skill: createSkill({
        name: 'advice',
        description: 'Consejos, educación financiera y uso de Norte',
        instructions: SOURCES_RULES,
      }),
      tools: { ...createSourceTools() },
    },
  };
}
