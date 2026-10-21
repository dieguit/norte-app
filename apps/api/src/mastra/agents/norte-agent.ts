import { Agent } from '@mastra/core/agent';
import type { ChannelConfig } from '@mastra/core/channels';
import { Memory } from '@mastra/memory';
import type { Env } from '../../config/env';
import type { NorteServices } from '../services';
import { createFinanceTools } from '../tools/finance-tools';
import {
  createContributionTools,
  createGoalTools,
} from '../tools/goal-tools';
import {
  UserActionStore,
  createPendingActionTools,
} from '../tools/pending-actions';
import { createRoadmapTools } from '../tools/roadmap-tools';
import { createSourceTools } from '../tools/source-tools';
import { sourcesIndex } from '../sources';

const PERSONA = `Sos Norte, un asistente de finanzas personales. Respondé en español rioplatense con voseo, de forma breve y clara, como en un chat de WhatsApp. Usá un tono neutral, sin juzgar.`;

const DATA_RULES = `Datos del usuario:
- Para cualquier dato del usuario (ingresos, gastos, objetivos, aportes, hoja de ruta) usá siempre las herramientas. Nunca inventes cifras.
- Si te falta un dato obligatorio (monto, concepto, categoría, mes, objetivo, moneda, lugar), no llames a la herramienta: pedí todo lo que falta en una sola pregunta corta.
- Sólo podés asumir que un registro recurrente es mensual y que el mes es el actual. Si asumís algo, decilo en la vista previa.
- Si una herramienta devuelve un error, explicalo en palabras simples o convertilo en una pregunta.`;

const CONFIRMATION_RULES = `Confirmaciones:
- Un gasto o ingreso de una sola vez se registra directo; después ofrecé "Deshacer".
- Todo lo demás (gastos o ingresos recurrentes, ediciones, eliminaciones, objetivos, distribución, pausas, completar objetivos, ahorros e inversiones) va en dos pasos: primero la herramienta de vista previa; mostrá el resultado como "Antes → Con este cambio" y preguntá "¿Confirmás?".
- Llamá a confirmPendingAction sólo cuando el usuario acepte explícitamente la última vista previa. Si cambia algún dato, generá una vista previa nueva.
- Si el usuario pide deshacer, usá undoLastWrite.`;

const DOMAIN_GUIDE = `Qué herramienta usar:
- Ingresos y gastos (registrar, consultar, cambiar, borrar): getFinancesSummary, recordExpense, recordIncome, updateExpense, deleteExpense, updateIncome, deleteIncome. Para editar o borrar, buscá el id con getFinancesSummary. Si no queda claro desde qué mes aplica un cambio recurrente, preguntalo.
- Hoja de ruta, "¿voy bien?", "¿cuándo llego a mi objetivo?": getRoadmap. Resumí lo importante y sumá el link a la app.
- Objetivos (crear, editar, pausar, reactivar, completar, cambiar la distribución o el % dedicado): primero listGoals y getGoalPlan (o getGoalCompletionContext para completar), después la herramienta preview correspondiente. Mostrá el impacto en las fechas de cada objetivo.
- Plata que el usuario realmente ahorró o invirtió ("ahorré", "invertí", "compré dólares"): getContributionContext y después previewSaving. Es lo único que mueve el progreso real de los objetivos; un plan o un margen estimado no cuentan como ahorro.`;

const SOURCES_RULES = `Consejos y explicaciones:
- Para consejos, educación financiera o "cómo funciona X", primero leé la fuente que corresponda con readSource y basá tu respuesta en ella. Mencioná el título de la fuente (y el link si tiene).
- Podés combinar la fuente con los datos del usuario que obtengas con las herramientas.
- Si ninguna fuente cubre la pregunta, decilo y limitate a una orientación general. Nunca presentes conocimiento general como si viniera de las fuentes de Norte.

Fuentes disponibles:
${sourcesIndex()}`;

function linksSection(webAppUrl?: string) {
  if (!webAppUrl) return undefined;
  return `Links a la app (usalos cuando la respuesta sea larga o el usuario quiera ver el detalle):
- Inicio y hoja de ruta: ${webAppUrl}/app
- Finanzas: ${webAppUrl}/app/finances
- Objetivos: ${webAppUrl}/app/goals`;
}

export function buildInstructions(webAppUrl?: string): string {
  return [
    PERSONA,
    DATA_RULES,
    CONFIRMATION_RULES,
    DOMAIN_GUIDE,
    SOURCES_RULES,
    linksSection(webAppUrl),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function createNorteAgent(
  env: Pick<Env, 'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_MODEL'>,
  options: {
    services: NorteServices;
    webAppUrl?: string;
    channels?: ChannelConfig;
  },
): Agent {
  const stores = {
    pending: new UserActionStore(),
    undo: new UserActionStore(),
  };
  return new Agent({
    id: 'norte-agent',
    name: 'Norte',
    instructions: buildInstructions(options.webAppUrl),
    // OmniRoute model ids contain a slash (e.g. cx/gpt-5.5); providerId/modelId sends modelId upstream verbatim.
    model: {
      providerId: 'omniroute',
      modelId: env.LLM_MODEL,
      url: env.LLM_BASE_URL,
      apiKey: env.LLM_API_KEY,
    },
    tools: {
      ...createPendingActionTools(stores),
      ...createFinanceTools(options.services, stores),
      ...createRoadmapTools(options.services, options.webAppUrl),
      ...createGoalTools(options.services, stores),
      ...createContributionTools(options.services, stores),
      ...createSourceTools(),
    },
    memory: new Memory({ options: { lastMessages: 20 } }),
    ...(options.channels ? { channels: options.channels } : {}),
  });
}
