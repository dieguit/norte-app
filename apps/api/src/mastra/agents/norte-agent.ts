import { createDomains } from './domains';
import { createDomainProcessor, createRouter } from './domain-router';
import {
  Agent,
  type IterationCompleteContext,
  type IterationCompleteResult,
} from '@mastra/core/agent';
import type { ChannelConfig } from '@mastra/core/channels';
import {
  type InputProcessor,
  ModerationProcessor,
  PromptInjectionDetector,
  UnicodeNormalizer,
} from '@mastra/core/processors';
import type { RequestContext } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import type { Env } from '../../config/env';
import type { NorteServices } from '../services';
import { createDateTools } from '../tools/date';
import { listCategoriesFor } from '../tools/finance-tools';
import {
  UserActionStore,
  createPendingActionTools,
} from '../tools/pending-actions';

const PERSONA = `Sos Norte, un asistente de finanzas personales. Respondé en español rioplatense con voseo, de forma muy breve y clara, como en un chat de WhatsApp. Usá un tono neutral, sin juzgar. Ante un éxito confirmado, preferí responder simplemente 🫡 o "Listo" (no ambos), sin resúmenes repetitivos. Los errores, ejecuciones parciales o preguntas deben ser explícitos. Nunca señales éxito en base a una vista previa o acción pendiente.
Alcance: sólo hablás de finanzas personales del usuario y de cómo usar Norte. Saludos, agradecimientos y respuestas a los chequeos están bien. Si te preguntan algo ajeno (famosos, deportes, cultura general, tareas, etc.), no lo respondas: decí en una línea que sólo podés ayudar con sus finanzas y sugerí algo concreto (registrar un gasto, ver sus objetivos o su plan).`;

const DATA_RULES = `Datos del usuario:
- Usá siempre las herramientas para datos del usuario; nunca inventes cifras.
- Defaults (no preguntes por ellos): moneda ARS salvo que diga dólares/USD; mes actual salvo que diga otro (usá getCurrentDate para saber la fecha y resolver "el mes pasado", "en diciembre"); una sola vez salvo "todos los meses"/"mensual"; el concepto sale del mensaje.
- Montos coloquiales ("5 lucas", "5k", "5 mil") → dígitos ("5000").
- Preguntá sólo lo que no se puede deducir (ej. el monto o datos ambiguos/faltantes), en una sola pregunta corta antes de escribir.
- Si una herramienta devuelve un error, explicalo en palabras simples o convertilo en una pregunta.
- Aviso de espera: si para responder necesitás consultar datos con herramientas, en ese mismo mensaje escribí primero una frase muy corta (máx. 6 palabras) diciendo qué vas a revisar (ej. "Me fijo en tus gastos 👀") y después llamá a las herramientas. Sólo en el primer paso del turno, nunca en pasos siguientes. No lo hagas para getCurrentDate, ni al registrar, editar, borrar o confirmar acciones, ni si podés responder sin herramientas.`;

const CONFIRMATION_RULES = `Confirmaciones y ejecución:
- Instrucción directa del usuario: una instrucción explícita del usuario con objetivo, alcance y datos resueltos autoriza la ejecución directa en todas las acciones de escritura (recurrentes, ediciones, eliminaciones, objetivos, distribución, pausas, completar, ahorros e inversiones) sin volver a pedir permiso.
- Flujo de ejecución directa: el valor 'needsConfirmation' devuelto por las herramientas describe un paso técnico interno de preparación en la ranura pendiente única; no requiere otro mensaje del usuario. En el mismo turno: ejecutá la herramienta de vista previa correspondiente, inspeccioná la validación o impacto resultante, y llamá de inmediato a confirmPendingAction sin pedir permiso. Nunca des por confirmada la acción sólo por haberla preparado.
- Órdenes en lote (múltiples cambios): primero resolvé el alcance y las categorías con las herramientas reales de consulta; luego prepará y confirmá cada ítem de forma estrictamente secuencial (preparar ítem 1 → confirmPendingAction ítem 1 → preparar ítem 2 → confirmPendingAction ítem 2). NUNCA prepares varios ítems antes de confirmar porque sólo hay una ranura pendiente única y se sobreescribiría. Si algún ítem falla, frená de inmediato y reportá con veracidad la ejecución parcial y el error, sin fingir éxito.
- Cuándo pedir aprobación obligatoriamente: mostrá los impactos devueltos ("Antes → Con este cambio" en objetivos/distribución o resumen de una línea en finanzas) sólo al pedir confirmación o si el usuario pide detalles; en ejecución directa inspeccionalos internamente y respondé escueto:
  1. Cambios consecuentes propuestos o inferidos por vos (no pedidos explícitamente por el usuario).
  2. Modificaciones materiales no solicitadas.
  3. Vistas previas vencidas o desactualizadas (status: 'stale'): los datos cambiaron; mostrá la nueva vista previa y pedí confirmación al usuario. NUNCA aceptes automáticamente una vista previa stale refrescada.
- Propuestas previas: si propusiste un cambio o mostraste una vista previa al usuario, llamá a confirmPendingAction sólo cuando el usuario acepte explícitamente la última propuesta ("sí", "dale", "confirmo"). Si el usuario corrige algún dato, generá una nueva vista previa.
- Gasto o ingreso de una sola vez: una vez resueltos todos los datos y la categoría, registralo directo (recordExpense / recordIncome con recurring=false).
- Deshacer: si el usuario pide deshacer, usá undoLastWrite.`;

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
    'Las reglas de cada dominio llegan como skills ya cargadas en tu contexto. Usá la herramienta skill sólo si necesitás un dominio que no está cargado.',
    linksSection(webAppUrl),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function createInputGuardrails(
  env: Pick<Env, 'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_GUARD_MODEL'>,
  services: NorteServices,
) {
  const model = {
    providerId: 'omniroute',
    modelId: env.LLM_GUARD_MODEL,
    url: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY,
  };
  // Guard checks are simple classifications; thinking added ~4s of blocking latency per message.
  const providerOptions = { omniroute: { reasoningEffort: 'none' } };
  const injection = new PromptInjectionDetector({
    model,
    strategy: 'block',
    detectionTypes: ['injection', 'jailbreak', 'system-override'],
    threshold: 0.8,
    lastMessageOnly: true,
    errorStrategy: 'warn',
    providerOptions,
  });
  const moderation = new ModerationProcessor({
    model,
    strategy: 'block',
    categories: ['hate', 'harassment', 'violence', 'self-harm', 'sexual'],
    threshold: 0.7,
    lastMessageOnly: true,
    errorStrategy: 'warn',
    providerOptions,
  });
  const route = createRouter(model, providerOptions);
  // Preloading categories in parallel with the guard calls saves the model a listCategories step.
  const preloadCategories = async ({
    requestContext,
  }: {
    requestContext?: RequestContext;
  }) => {
    requestContext?.delete('norteCategories');
    const userId: unknown = requestContext?.get('userId');
    if (!requestContext || typeof userId !== 'string') return;
    try {
      requestContext.set(
        'norteCategories',
        await listCategoriesFor(services.finances, userId),
      );
    } catch {
      // Without preloaded categories the model falls back to listCategories.
    }
  };
  // A plain processInput runs once per turn; a processor workflow also re-runs (~0.5s) before every model step.
  const guardrails: InputProcessor = {
    id: 'norte-input-guardrails',
    async processInput(args) {
      const [messages] = await Promise.all([
        injection.processInput(args),
        moderation.processInput(args),
        route(args),
        preloadCategories(args),
      ]);
      return messages;
    },
  };
  return guardrails;
}

const MAX_STEPS = 10;

// Mastra ends silently when maxSteps runs out mid tool-chain; reserve the last step for a reply.
export function reserveFinalReply({
  iteration,
  finishReason,
}: Pick<IterationCompleteContext, 'iteration' | 'finishReason'>):
  IterationCompleteResult | undefined {
  if (iteration < MAX_STEPS - 1 || finishReason !== 'tool-calls') return;
  return {
    continue: false,
    feedback:
      'No te quedan pasos para más herramientas. Respondé ya al usuario con lo que hiciste y lo que quedó pendiente, sin fingir éxito.',
  };
}

export function createNorteAgent(
  env: Pick<
    Env,
    'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_MODEL' | 'LLM_GUARD_MODEL'
  >,
  options: {
    services: NorteServices;
    webAppUrl?: string;
    channels?: ChannelConfig;
  },
): Agent {
  const stores = {
    pending: new UserActionStore(undefined, undefined, true),
    undo: new UserActionStore(),
  };
  const domains = createDomains(options.services, stores, options.webAppUrl);
  return new Agent({
    skills: Object.values(domains).map((domain) => domain.skill),
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
    inputProcessors: [
      new UnicodeNormalizer({
        stripControlChars: true,
        collapseWhitespace: true,
      }),
      createInputGuardrails(env, options.services),
      createDomainProcessor(domains),
    ],
    tools: {
      ...createDateTools(),
      ...createPendingActionTools(stores),
      ...domains.finances.tools,
      ...domains.goals.tools,
      ...domains.notifications.tools,
      ...domains.advice.tools,
    },
    defaultOptions: {
      maxSteps: MAX_STEPS,
      onIterationComplete: reserveFinalReply,
    },
    memory: new Memory({ options: { lastMessages: 20 } }),
    ...(options.channels ? { channels: options.channels } : {}),
  });
}
