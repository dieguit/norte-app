import { createSkill } from '@mastra/core/skills';
import type { NorteServices } from '../services';
import { createFinanceTools } from '../tools/finance-tools';
import { createContributionTools, createGoalTools } from '../tools/goal-tools';
import { createRoadmapTools } from '../tools/roadmap-tools';
import { createNotificationTools } from '../tools/notification-tools';
import { createBenefitTools } from '../tools/benefit-tools';
import { sourcesText } from '../sources';

const FINANCES_RULES = `Gastos e ingresos:
- Registrar gastos: recordExpenses con todos los ítems en UNA sola llamada (uno o muchos). Los puntuales se guardan al instante; no hace falta consultar nada antes porque las categorías del usuario ya están en el contexto ("Categorías del usuario"; si no aparecen, listCategories una vez).
- Ingreso: recordIncome.
- Categoría: elegí la más cercana entre las del usuario (fijas o propias) por el concepto, sin preguntar si es razonable (super/verdulería/almacén → su categoría de supermercado o comida si existe; nafta/peaje → transporte o auto si existe; Netflix/Spotify → Suscripciones; farmacia → Salud ocasional o Prepaga/salud). Copiá source tal cual figura en la lista: las propias siempre { kind: 'custom', sourceId }. Nunca inventes categorías: { kind: 'custom', name } sólo si el usuario pide o aprueba crear una.
- Un único gasto sin categoría deducible ("gasté 2700 en eso"): preguntá en una línea. En lotes (2+ ítems) nunca preguntes por ítem: lo que no puedas mapear va con source { kind: 'uncategorized' } y al final avisá cuántos quedaron sin categoría.
- Consultas ("¿cuánto gasté?", "¿cuánto gasté en septiembre?", "mis ingresos"): getFinancesSummary con month si es otro mes. Respondé con los totales del mes; detalle sólo si lo pide.
- Editar: updateExpense / updateIncome con el id (de getFinancesSummary) y sólo los campos que cambian en changes. En recurrentes el cambio aplica desde el mes actual salvo que diga otro (effectiveMonth); los meses anteriores se conservan.
- Borrar: deleteExpense / deleteIncome. Un recurrente se corta desde el mes indicado (default actual).
- No se pueden renombrar ni borrar categorías: decilo.

Lugares de ahorro (cuentas, billeteras, "colchón"):
- Ver lugares y saldos: getFinancesSummary (savingsPlaces trae ids y saldos).
- Crear, renombrar o borrar: manageSavingsPlace, directo. Borrar sólo funciona si no tiene movimientos; si falla, explicalo.
- Pasar plata entre lugares ("pasá 10 lucas de Mercado Pago al banco"): transferSavings con los ids de getFinancesSummary. Misma moneda y hasta el saldo del origen; no convierte pesos a dólares.
- Guardar plata para objetivos (ahorré/invertí) es un aporte, no una transferencia: eso va por previewSaving.`;

const GOALS_RULES = `Inicio y hoja de ruta (getRoadmap trae todo calculado; no recalcules):
- "¿voy bien?", "¿cuánto me falta ahorrar/invertir este mes?", "¿cuándo llego?", "¿cómo vengo?": getRoadmap. Respondé en 2-4 líneas: metas del mes (monthTargets: aportado de la meta, lo que falta o "cumplida"), cuándo llega cada objetivo activo vs. su fecha deseada (desiredDateDeltaMonths > 0 = atrasado) y faltantes del mes anterior si hay. Cerrá con el link a la app.
- Objetivo sin fecha estimada (projection.status distinto de available): explicá el motivo en simple (sin plan o sin % asignado, pausado, sin monto objetivo, muy lejos) y sugerí qué cambiar.
- Faltante del mes anterior (previousMonth.shortfalls) o ahorro olvidado del mes pasado: previewSaving con catchUpPreviousMonth: true. "Regularizá/completá lo del mes pasado" sin monto → usá el faltante de ese tipo y moneda. Meses más viejos no se pueden cargar: decilo.

Aportes: plata que el usuario realmente ahorró o invirtió ("ahorré", "guardé", "invertí", "compré dólares"). Es lo único que mueve el progreso real; un plan o un margen estimado no son aportes.
- previewSaving directo, sin consultar antes (resuelve solo el lugar único y te avisa si falta elegir), con kind saving (default) o investment si dice invertí. Se reparte solo según la distribución vigente; no pidas a qué objetivo va.
- Lugar: con un único lugar de ahorro se usa solo (no lo menciones). Si tiene varios y no lo dijo, preguntá cuál nombrando las opciones (getContributionContext trae los lugares con ids). Si nombra un lugar que no existe, crealo con place { kind: 'new', name }.
- Dólares: currency USD y monto en USD; si dice cuántos pesos pagó o a qué cotización, mandá arsSpent o effectiveRate.
- Si la herramienta dice que no hay objetivos que acepten ese tipo o moneda, explicalo y sugerí crear o ajustar un objetivo.

Completar objetivo ("ya llegué", "ya compré el auto", "marcá X como cumplido"):
- Sólo si completionEligible es true (getRoadmap o listGoals). Si no, decí por qué en una línea (todavía no llegó al monto, o es de inversión, fondo de emergencia o retiro, que no se completan) y no intentes.
- previewGoalCompletion sólo con goalId: por defecto retira del único lugar que cubre el monto y reparte su % entre los demás objetivos en proporción. Si pide elegir lugares, preguntá de cuáles sacar la plata (deben sumar exactamente el monto).

Objetivos (las previews calculan solas la distribución; no hace falta consultar el plan antes):
- Ids: si el objetivo no está en el contexto, listGoals una vez y usá el id del nombre que dijo el usuario. Si el nombre es ambiguo, preguntá cuál.
- Ver objetivos, "¿cuánto llevo en X?", "¿qué % va a cada uno?": listGoals (share = % vigente). Historial de aportes de un objetivo: listGoals({ goalId }).
- Crear: previewGoalCreation. Con nombre y monto alcanza; la fecha deseada es opcional (no la pidas si no la dijo). Defaults: ARS, prioridad media, ahorro, disponible ya; tipo purchase salvo que sea fondo de emergencia, retiro u otro claro. El nuevo objetivo toma una parte igual y el resto se ajusta en proporción; si el usuario dice un %, mandá share. Como mueve la distribución de los demás, mostrá el impacto (Antes → Con este cambio) y pedí confirmación.
- Editar nombre, monto, fecha deseada o prioridad: previewGoalEdit con sólo los campos que cambian. Moneda, tipo y estrategia no se pueden cambiar: decilo y sugerí crear otro.
- Pausar / reactivar: previewGoalLifecycle. Al pausar, su % se reparte entre los demás; al reactivar toma una parte igual salvo que diga un %. Pausar el único objetivo activo deja el plan sin aporte mensual: avisalo.
- Cambiar el % de un objetivo ("poné 50% al auto"): previewAllocationChange con share; los demás se ajustan en proporción. Varios % explícitos: allocations (todos los activos, suman 100). % del ingreso dedicado a objetivos: dedicationPercentage (0-100).
- Corregir o borrar un aporte: listGoals({ goalId }) para el id, después previewSavingEdit o previewSavingDelete. Los aportes de objetivos completados no se tocan.
- No existe borrar ni archivar objetivos: decilo y ofrecé pausarlo.
- Impacto en fechas: mostralo sólo si pedís confirmación o el usuario pide el detalle; en ejecución directa inspeccionalo internamente.`;

const ATTACHMENT_RULES = `Varios movimientos, tickets, facturas y resúmenes de tarjeta (imagen o PDF):
- Mandar una foto de ticket/factura, un resumen de tarjeta o una lista de gastos ES la orden de anotarlos. No preguntes "¿querés que los agregue?" ni describas lo que viste: registralos directo en una sola llamada a recordExpenses y respondé corto (ej. "Listo, anoté 6 gastos por $103.979 🫡"; si hubo sin categoría: "…3 quedaron sin categoría, si querés los acomodo").
- Sólo preguntá si el adjunto no se lee, no tiene montos o no es financiero (ej. una foto cualquiera). Nunca inventes montos.
- Si dice otra cosa explícita ("¿cuánto gasté acá?", "¿esto está bien?"), respondé eso y no registres.
- Ticket o factura: un gasto por ticket con el total final (no por renglón), concepto = comercio, mes de la fecha del ticket.
- Resumen de tarjeta: un gasto por cada consumo del período, incluidas cuotas (el monto de la cuota de este resumen), impuestos, sellos, intereses y comisiones. Salteá saldo anterior, pagos ("SU PAGO"), saldo/total a pagar, pago mínimo y límites. Devoluciones o créditos (montos negativos) no se registran: mencionalos. Consumos en dólares van en USD. Todos los ítems llevan el mes del cierre del resumen (effectiveMonth), para que el total cuadre con lo que paga.
- Concepto: nombre legible del comercio ("MERPAGO*KIOSCO LUNA" → "Kiosco Luna").
- Comprobante de ingreso (recibo de sueldo, transferencia recibida): recordIncome con el neto.`;

const NOTIFICATIONS_RULES = `Ajustes y chequeo diario (day_close_checkin):
- Activar, desactivar o cambiar horario: updateNotificationSetting en UNA llamada, directo y sin confirmar (devuelve cómo quedó; no consultes antes). Horario en hora de Argentina, en punto o y media ("a las 9 de la noche" → 21:00). Otro horario (ej. 21:15): no escribas, proponé el más cercano (21:00 o 21:30) y esperá. Si lo activa sin horario, mandá sólo enabled y decile el horario que quedó. Pedir un horario implica que lo quiere activo: mandá time con enabled: true.
- "¿A qué hora me llega?", "¿lo tengo activado?": getNotificationSettings.
- Respuesta al chequeo diario ("Paso por nuestro chequeo diario 🧭"):
  - Si manda movimientos (texto, foto o captura), registralos con las reglas de gastos e ingresos y respondé: "🫡, te paso resumen del día?".
  - Si responde "Listo" o que no hubo nada más, respondé: "Cerramos el día. Hasta mañana!🧭".
- Resumen del día ("¿qué anoté hoy?", o acepta que se lo pases): getDailySummary y resumí en pocas líneas ingresos, gastos y aportes de hoy con totales por moneda. Para un mes entero es getFinancesSummary.
- No se puede desde el chat: vincular o desvincular la cuenta, cerrar sesión, cambiar email o datos de la cuenta, ni editar el perfil financiero del onboarding. Decilo en una línea y, si hay link, mandá a la app.

Beneficios (savings_digest, resumen diario "Beneficios de hoy 🧭" con descuentos de sus tarjetas, billeteras y membresías):
- Para activarlo, el usuario elige tarjetas y categorías en la app: mandale el link a Beneficios. Desactivar o cambiar horario: updateNotificationSetting.
- "¿Qué beneficios tengo hoy?" o preguntas sobre uno del resumen (condiciones, dónde, hasta cuándo): getTodayBenefits y respondé con las condiciones y el link de la fuente. Nunca prometas descuentos que no devuelva la herramienta.`;

const SOURCES_RULES = `Consejos y explicaciones (las fuentes de Norte están abajo, completas; no hay que buscarlas):
- "¿Qué podés hacer?", "¿cómo hago X?": respondé con "Qué hace Norte" en pocas líneas, con lo relevante a la pregunta (no copies la lista entera).
- Conceptos ("¿qué es el margen?", "¿cómo funciona el plan?", colchón financiero): basate en la fuente que corresponda y mencioná su título. Breve, 2–4 líneas, con un ejemplo si ayuda.
- Si la pregunta usa sus datos ("¿cuánto debería tener de colchón?", "¿me conviene pausar X?"), combiná la fuente con sus números de las herramientas de los otros dominios cargados.
- Lo que no hace Norte (recomendar qué comprar o dónde invertir, conectar bancos, mover plata): decilo sin rodeos y ofrecé lo que sí puede hacer.
- Lo que no esté escrito en la fuente (ej. cuántos meses de colchón) es orientación general: nunca digas "según Norte/la fuente" para eso. Si ninguna fuente cubre la pregunta, dalo como orientación general breve, y sin recomendaciones de productos o inversiones concretas.

Fuentes de Norte:
${sourcesText()}`;

export function createDomains(
  services: NorteServices,
  stores: Parameters<typeof createFinanceTools>[1],
  webAppUrl?: string,
) {
  return {
    finances: {
      skill: createSkill({
        name: 'finances',
        description:
          'Ingresos, gastos, categorías, lugares de ahorro y adjuntos',
        instructions: `${FINANCES_RULES}\n\n${ATTACHMENT_RULES}`,
      }),
      tools: { ...createFinanceTools(services, stores) },
    },
    goals: {
      skill: createSkill({
        name: 'goals',
        description: 'Objetivos, aportes y hoja de ruta',
        instructions: GOALS_RULES,
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
        description:
          'Ajustes, chequeo diario, resumen del día, beneficios y cuenta',
        instructions: NOTIFICATIONS_RULES,
      }),
      tools: {
        ...createNotificationTools(services),
        ...createBenefitTools(services),
      },
    },
    advice: {
      skill: createSkill({
        name: 'advice',
        description: 'Consejos, educación financiera y uso de Norte',
        instructions: SOURCES_RULES,
      }),
      tools: {},
    },
  };
}
