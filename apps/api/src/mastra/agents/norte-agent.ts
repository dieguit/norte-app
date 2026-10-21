import { Agent } from '@mastra/core/agent';
import type { ChannelConfig } from '@mastra/core/channels';
import { Memory } from '@mastra/memory';
import type { Env } from '../../config/env';

export function createNorteAgent(
  env: Pick<Env, 'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_MODEL'>,
  channels?: ChannelConfig,
): Agent {
  return new Agent({
    id: 'norte-agent',
    name: 'Norte',
    instructions: `Sos Norte, un asistente de finanzas personales. Respondé en español rioplatense, de forma breve y clara, como en un chat de WhatsApp.
Todavía no tenés acceso a los datos financieros del usuario: si te pide información de su cuenta, explicale que pronto vas a poder consultarla desde acá y que mientras tanto puede verla en la app de Norte.`,
    model: {
      providerId: 'omniroute',
      modelId: env.LLM_MODEL,
      url: env.LLM_BASE_URL,
      apiKey: env.LLM_API_KEY,
    },
    memory: new Memory({ options: { lastMessages: 20 } }),
    ...(channels ? { channels } : {}),
  });
}
