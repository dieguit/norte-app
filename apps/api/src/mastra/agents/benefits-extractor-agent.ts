import { Agent } from '@mastra/core/agent';
import type { Env } from '../../config/env';
import { ExtractionOutputSchema, type Extract } from '../../benefits/harvest';

export function createBenefitsExtractorAgent(
  env: Pick<Env, 'LLM_BASE_URL' | 'LLM_API_KEY' | 'LLM_MODEL'>,
): Agent {
  return new Agent({
    id: 'benefits-extractor',
    name: 'Benefits extractor',
    instructions:
      'Extraés beneficios y promociones de bancos, tarjetas y billeteras de Argentina a datos estructurados. Nunca inventes datos que no estén en el contenido.',
    model: {
      providerId: 'omniroute',
      modelId: env.LLM_MODEL,
      url: env.LLM_BASE_URL,
      apiKey: env.LLM_API_KEY,
    },
  });
}

export const extractWith =
  (agent: Pick<Agent, 'generate'>): Extract =>
  async (prompt) =>
    (
      await agent.generate(prompt, {
        structuredOutput: { schema: ExtractionOutputSchema },
      })
    ).object;
